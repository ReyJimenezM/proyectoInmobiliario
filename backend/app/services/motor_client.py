"""Puente entre el backend y motor_decision. Traduce los datos JSONB de la solicitud
(que SI pueden contener campos como estado_civil, por completitud de identidad legal) al
EntradaEvaluacion del motor, que estructuralmente NO tiene slots para variables
discriminatorias -- el filtrado ocurre aqui, al construir la entrada, no dentro del motor
(No Negociable #3). El motor en si permanece ciego a todo lo que no le pasemos."""
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.documento_solicitud import DocumentoSolicitud
from app.models.enums import DecisionEvaluacion, EstadoSolicitud
from app.models.evaluacion import Evaluacion
from app.models.motor_decision_config import MotorDecisionConfig
from app.models.politica_credito import PoliticaCredito
from app.models.propiedad import Propiedad
from app.models.solicitud import Solicitud
from app.services.checklist_documentos import documentos_requeridos
from motor_decision import (
    BandasDecision,
    BandaVariable,
    Capacidad,
    Capital,
    Caracter,
    Condiciones,
    EntradaEvaluacion,
    Garantia,
    Politica,
    ResultadoEvaluacion,
    VariablePolitica,
)
from motor_decision import evaluar as motor_evaluar
from motor_decision.robusto import (
    Codeudor as CodeudorRobusto,
    ContextoReglasDuras,
    CostoInmueble,
    Documento as DocumentoRobusto,
    EntradaRiesgoArrendatario,
    Historial,
    Ingresos,
    Laboral,
    MotorDecision,
    Obligacion,
    ParametrosMotor,
    Patrimonio,
    ReglaMotor as ReglaMotorDataclass,
)
from motor_decision.robusto import evaluar_motor as motor_evaluar_robusto
from motor_decision.robusto import match_risk


def _politica_credito_a_dataclass(politica: PoliticaCredito) -> Politica:
    variables = [
        VariablePolitica(
            nombre=v["nombre"],
            peso=v["peso"],
            bandas=[BandaVariable(b["etiqueta"], b["puntaje"], b.get("condicion", {})) for b in v["bandas"]],
        )
        for v in politica.variables
    ]
    bd = politica.bandas_decision
    return Politica(
        politica_version_id=str(politica.id),
        vertical=politica.vertical.value,
        variables=variables,
        bandas_decision=BandasDecision(
            aprobado_min=bd["aprobado_min"], revision_min=bd["revision_min"], revision_max=bd["revision_max"]
        ),
    )


def _a_float_o_none(valor) -> float | None:
    """Pydantic serializa Decimal como string en model_dump(mode="json") (para no perder
    precision), asi que los valores JSONB numericos pueden llegar como str -- sin este
    cast, comparaciones como `hechos[hecho] < valor_esperado` truenan con TypeError."""
    return float(valor) if valor is not None else None


def _solicitud_a_entrada_evaluacion(solicitud: Solicitud) -> EntradaEvaluacion:
    dp = solicitud.datos_personales
    dl = solicitud.datos_laborales
    df = solicitud.datos_financieros
    gr = solicitud.garantias_referencias

    cuota_o_canon = float(df.get("cuota_o_canon_estimado") or 0)
    ingresos = float(df.get("ingresos_mensuales_fijos", 0)) + float(df.get("ingresos_variables", 0) or 0)

    ref_laboral = (gr.get("referencia_laboral") or {}).get("verificada")
    ref_personal = (gr.get("referencia_personal") or {}).get("verificada")

    return EntradaEvaluacion(
        solicitud_id=str(solicitud.id),
        vertical=solicitud.vertical.value,
        capacidad=Capacidad(cuota_o_canon=cuota_o_canon, ingresos_mensuales=ingresos),
        condiciones=Condiciones(
            tipo_ocupacion=dl.get("tipo_ocupacion", "otro"),
            antiguedad_meses=int(dl.get("antiguedad_cargo_meses", 0)),
        ),
        caracter=Caracter(
            referencia_laboral_verificada=ref_laboral,
            referencia_personal_verificada=ref_personal,
        ),
        garantia=Garantia(
            tiene_codeudor=bool(gr.get("tiene_codeudor", False)),
            codeudor_ingresos=_a_float_o_none((gr.get("codeudor") or {}).get("ingresos_declarados")),
            tiene_poliza=bool(gr.get("tiene_poliza", False)),
        ),
        capital=Capital(
            tiene_ahorros=bool(df.get("tiene_ahorros", False)),
            monto_ahorros=_a_float_o_none(df.get("monto_ahorros")),
        ),
    )
    # Nota: dp (datos_personales) NUNCA se lee aca. Es donde vivirian estado_civil,
    # direccion, etc. -- capturados por completitud, pero fuera del alcance del motor.


def _resultado_a_variables_jsonb(resultado: ResultadoEvaluacion) -> list[dict]:
    return [
        {
            "nombre": v.nombre,
            "peso": v.peso,
            "valor_calculado": v.valor_calculado,
            "banda": v.banda,
            "puntaje_obtenido": v.puntaje_obtenido,
            "puntaje_ponderado": v.puntaje_ponderado,
        }
        for v in resultado.variables_evaluadas
    ]


def _motor_config_a_dataclass(config: MotorDecisionConfig) -> MotorDecision:
    reglas = [ReglaMotorDataclass(**r) for r in config.reglas]
    parametros = ParametrosMotor(**config.parametros)
    return MotorDecision(
        version=config.version, vigente_desde=str(config.creado_en), autor=config.autor,
        pesos=config.pesos, parametros=parametros, reglas=reglas, historial_versiones=[],
    )


def _tipo_ocupacion_a_laboral(dl: dict) -> Laboral:
    tipo = dl.get("tipo_ocupacion", "otro")
    return Laboral(
        antiguedad_meses=int(dl.get("antiguedad_cargo_meses", 0)),
        contrato_indefinido=(tipo == "indefinido"),
        contrato_corto=(tipo == "independiente"),
        ingreso_pensional=(tipo == "pensionado"),
    )


def _historial_codigo(gr: dict) -> int:
    if not gr.get("ha_arrendado_antes"):
        return 2  # sin historial previo: se evalua neutral, no penaliza
    if gr.get("proceso_restitucion_previo") or gr.get("mora_en_arriendo_anterior") == "grave":
        return 0
    if gr.get("mora_en_arriendo_anterior") == "leve":
        return 1
    return 3  # arrendo antes sin mora


def _solicitud_a_entrada_riesgo_arrendatario(
    solicitud: Solicitud, propiedad: Propiedad, documentos_cargados: list[DocumentoSolicitud]
) -> EntradaRiesgoArrendatario:
    dl = solicitud.datos_laborales
    df = solicitud.datos_financieros
    gr = solicitud.garantias_referencias

    ingresos = Ingresos(
        fijo=float(df.get("ingresos_mensuales_fijos", 0)),
        variable=float(df.get("ingresos_variables", 0) or 0),
        otros=float(df.get("ingresos_otros", 0) or 0),
        deducciones=float(df.get("deducciones_nomina", 0) or 0),
        no_verificable=float(df.get("ingreso_no_verificable", 0) or 0),
    )
    inmueble = CostoInmueble(
        canon=float(propiedad.precio), administracion=float(propiedad.valor_admin or 0), servicios=0, otros=0
    )
    obligaciones = [
        Obligacion(cuota=float(c.get("cuota_mensual", 0)), saldo=float(c.get("saldo_aproximado", 0)),
                   en_mora=bool(c.get("en_mora", False)))
        for c in df.get("otros_creditos", [])
    ]
    gastos = {"total": float(df.get("gastos_mensuales_fijos", 0) or 0)}

    codeudor = None
    if gr.get("tiene_codeudor"):
        cod = gr.get("codeudor") or {}
        codeudor = CodeudorRobusto(
            ingreso_fijo=float(cod.get("ingresos_declarados", 0)),
            ingreso_variable=float(cod.get("ingresos_variables", 0) or 0),
            obligaciones=float(cod.get("cuotas_obligaciones", 0) or 0),
        )

    patrimonio = Patrimonio(
        activos=[float(v) for v in df.get("patrimonio_activos", [])],
        pasivos=[float(v) for v in df.get("patrimonio_pasivos", [])],
    )

    tipos_requeridos = documentos_requeridos(dl, gr, solicitud.vertical.value)
    tipos_cargados = {doc.tipo_documento: doc.estado.value for doc in documentos_cargados}
    documentos = [
        DocumentoRobusto(requerido=True, estado=tipos_cargados.get(tipo, "pendiente")) for tipo in tipos_requeridos
    ]

    return EntradaRiesgoArrendatario(
        ingresos=ingresos, inmueble=inmueble, laboral=_tipo_ocupacion_a_laboral(dl),
        obligaciones=obligaciones, gastos=gastos, historial=Historial(codigo=_historial_codigo(gr)),
        documentos=documentos, alertas=[], codeudor=codeudor, patrimonio=patrimonio,
    )
    # Nota: igual que en el motor 5C, datos_personales (estado_civil, genero si existiera,
    # etc.) NUNCA se lee aca -- No Negociable #3.


# Documentos que acreditan identidad o ingresos: si uno de estos queda rechazado, la
# regla dura HR-03 manda el caso a revision humana sin importar el puntaje.
DOCUMENTOS_CRITICOS = frozenset({
    "cedula_ciudadania", "cedula_codeudor",
    "desprendibles_pago_o_certificacion_laboral", "extractos_bancarios_3_meses",
    "certificado_pension_vigente", "soporte_ingresos_codeudor",
})

# Campos obligatorios por paso del wizard. Se usan para HR-09/HR-10 (calidad del dato).
_CAMPOS_OBLIGATORIOS = {
    "datos_personales": ("nombres_apellidos", "numero_documento", "fecha_nacimiento", "telefono", "email"),
    "datos_laborales": ("tipo_ocupacion",),
    "datos_financieros": ("ingresos_mensuales_fijos",),
}


def _fecha_nacimiento(dp: dict):
    """datos_personales es JSONB: la fecha llega como str ISO tras model_dump(mode="json")."""
    valor = dp.get("fecha_nacimiento")
    if isinstance(valor, date):
        return valor
    if isinstance(valor, str):
        try:
            return date.fromisoformat(valor[:10])
        except ValueError:
            return None
    return None


def _contexto_reglas_duras(
    solicitud: Solicitud, propiedad: Propiedad, documentos_cargados: list[DocumentoSolicitud]
) -> ContextoReglasDuras:
    """Traduce el expediente a los hechos binarios de la capa 3. Lo que la plataforma
    todavia no captura (marcaciones antifraude, validacion biometrica de identidad) queda
    en su valor neutro: la regla no dispara, no se inventa el hecho."""
    dp = solicitud.datos_personales or {}
    gr = solicitud.garantias_referencias or {}

    tipos_requeridos = documentos_requeridos(
        solicitud.datos_laborales or {}, gr, solicitud.vertical.value
    )
    por_tipo = {doc.tipo_documento: doc.estado.value for doc in documentos_cargados}
    faltantes = sum(1 for tipo in tipos_requeridos if por_tipo.get(tipo) not in ("cargado", "aprobado"))
    critico_rechazado = any(
        estado == "rechazado" and tipo in DOCUMENTOS_CRITICOS for tipo, estado in por_tipo.items()
    )

    campos_faltantes = 0
    campos_invalidos = 0
    for atributo, obligatorios in _CAMPOS_OBLIGATORIOS.items():
        bloque = getattr(solicitud, atributo, None) or {}
        campos_faltantes += sum(1 for campo in obligatorios if bloque.get(campo) in (None, ""))
    if dp.get("fecha_nacimiento") is not None and _fecha_nacimiento(dp) is None:
        campos_invalidos += 1  # fecha presente pero ilegible

    # Situacion juridica del inmueble: se considera resuelta cuando un analista ya evaluo
    # el componente "juridica" del scoring del inmueble con nota suficiente.
    componentes = propiedad.componentes_riesgo or {} if propiedad is not None else {}
    juridica = componentes.get("juridica")
    situacion_juridica_sin_resolver = juridica is not None and float(juridica) < 60
    titularidad = componentes.get("titularidad")
    titularidad_sin_resolver = titularidad is not None and float(titularidad) < 40

    return ContextoReglasDuras(
        fraude_confirmado=bool(gr.get("fraude_confirmado", False)),
        fecha_nacimiento=_fecha_nacimiento(dp),
        documento_critico_rechazado=critico_rechazado,
        documentos_obligatorios_faltantes=faltantes,
        titularidad_sin_resolver=titularidad_sin_resolver,
        identidad_verificada=bool(dp.get("identidad_verificada", True)),
        alertas_fraude=int(gr.get("alertas_fraude", 0) or 0),
        situacion_juridica_sin_resolver=situacion_juridica_sin_resolver,
        campos_invalidos=campos_invalidos,
        campos_faltantes=campos_faltantes,
    )


DECISION_ROBUSTA_A_ENUM = {
    "PREAPROBADA": DecisionEvaluacion.aprobada,
    "REQUISITOS": DecisionEvaluacion.revision_manual,
    "ESTUDIO": DecisionEvaluacion.revision_manual,
    "RECHAZADA": DecisionEvaluacion.rechazada,
    # Decisiones que puede forzar la capa de reglas duras:
    "REVISION_MANUAL": DecisionEvaluacion.revision_manual,
    # INCOMPLETA no es un rechazo: falta informacion. En la tabla de evaluaciones se
    # registra como revision_manual (el enum de decision no distingue) y el matiz queda
    # en el estado de la solicitud y en decision_driver/reglas_duras.
    "INCOMPLETA": DecisionEvaluacion.revision_manual,
}
DECISION_ROBUSTA_A_ESTADO_SOLICITUD = {
    "PREAPROBADA": EstadoSolicitud.aprobada,
    "REQUISITOS": EstadoSolicitud.con_ruta_alterna,
    "ESTUDIO": EstadoSolicitud.revision_manual,
    "RECHAZADA": EstadoSolicitud.rechazada,
    "REVISION_MANUAL": EstadoSolicitud.revision_manual,
    "INCOMPLETA": EstadoSolicitud.incompleta,
}


def _snapshot_motor(motor_config: MotorDecisionConfig) -> dict:
    """Congela la configuracion con la que se evaluo. Publicar una version nueva del
    motor no puede alterar lo que decia una evaluacion anterior: quien lea el historico
    lee este snapshot, nunca la configuracion vigente."""
    return {
        "motor_id": str(motor_config.id),
        "version": motor_config.version,
        "autor": motor_config.autor,
        "pesos": dict(motor_config.pesos),
        "parametros": dict(motor_config.parametros),
        "reglas": [dict(r) for r in motor_config.reglas if r.get("activa", True)],
    }


def evaluar_solicitud_robusto(
    db: Session, solicitud: Solicitud, motor_config: MotorDecisionConfig, propiedad: Propiedad,
    documentos_cargados: list[DocumentoSolicitud],
) -> tuple[Evaluacion, EstadoSolicitud]:
    entrada = _solicitud_a_entrada_riesgo_arrendatario(solicitud, propiedad, documentos_cargados)
    motor_dc = _motor_config_a_dataclass(motor_config)
    contexto_duro = _contexto_reglas_duras(solicitud, propiedad, documentos_cargados)

    resultado = motor_evaluar_robusto(entrada, motor_dc, contexto_duro)

    variables_evaluadas = [
        {
            "nombre": grupo, "peso": round(motor_config.pesos[grupo] / 100, 4), "valor_calculado": None,
            "banda": resultado.niveles.get(grupo, ""), "puntaje_obtenido": resultado.subscores[grupo],
            "puntaje_ponderado": round(resultado.subscores[grupo] * motor_config.pesos[grupo] / 100, 2),
        }
        for grupo in motor_config.pesos
    ]

    explicacion = resultado.motivo
    if resultado.faltantes:
        explicacion += " Pendiente: " + "; ".join(resultado.faltantes) + "."

    # matchRisk (F2-B3): combina el score del arrendatario con el del inmueble (si un
    # analista ya lo evaluo) y las condiciones economicas de ESTA operacion especifica.
    if propiedad.score_riesgo is not None:
        match = match_risk(
            tenant_score=resultado.score, prop_score=propiedad.score_riesgo,
            cobertura=resultado.variables_derivadas["cobertura"],
            ratio_endeudamiento=resultado.variables_derivadas["ratioEndeudamiento"],
        )
        variables_evaluadas.append({
            "nombre": "compatibilidad_arrendatario_inmueble", "peso": 0, "valor_calculado": match.puntaje,
            "banda": match.nivel, "puntaje_obtenido": match.puntaje, "puntaje_ponderado": match.puntaje,
        })
        explicacion += f" Compatibilidad con el inmueble: {match.nivel.lower()} ({match.puntaje}/100) — {match.descripcion}"

    evaluacion = Evaluacion(
        id=uuid.uuid4(),
        solicitud_id=solicitud.id,
        motor_version_id=motor_config.id,
        score=Decimal(str(resultado.score)),
        variables_evaluadas=variables_evaluadas,
        decision=DECISION_ROBUSTA_A_ENUM[resultado.decision],
        explicacion_generada=explicacion,
        snapshot_motor=_snapshot_motor(motor_config),
        reglas_duras=resultado.reglas_duras,
        decision_driver=resultado.decision_driver,
    )
    db.add(evaluacion)
    return evaluacion, DECISION_ROBUSTA_A_ESTADO_SOLICITUD[resultado.decision]


def _snapshot_politica(politica: PoliticaCredito) -> dict:
    """Mismo principio de inmutabilidad que `_snapshot_motor`, para el motor 5C: se congela
    la politica con la que se evaluo, no se relee la vigente al consultar el historico.
    Tolerante a atributos ausentes: la politica llega tambien desde el simulador, que usa
    objetos armados en memoria y no filas completas de la tabla."""
    vertical = getattr(politica, "vertical", None)
    return {
        "politica_id": str(getattr(politica, "id", "")) or None,
        "version": getattr(politica, "version", None),
        "vertical": vertical.value if hasattr(vertical, "value") else vertical,
        "variables": getattr(politica, "variables", None),
        "bandas_decision": getattr(politica, "bandas_decision", None),
    }


def evaluar_solicitud(db: Session, solicitud: Solicitud, politica_activa: PoliticaCredito) -> Evaluacion:
    entrada = _solicitud_a_entrada_evaluacion(solicitud)
    politica_dc = _politica_credito_a_dataclass(politica_activa)

    resultado = motor_evaluar(entrada, politica_dc)

    evaluacion = Evaluacion(
        id=uuid.uuid4(),
        solicitud_id=solicitud.id,
        politica_version_id=politica_activa.id,
        score=Decimal(str(resultado.score)),
        variables_evaluadas=_resultado_a_variables_jsonb(resultado),
        decision=DecisionEvaluacion(resultado.decision),
        explicacion_generada=resultado.explicacion_generada,
        # Mismo principio de inmutabilidad que en el motor robusto: se congela la politica
        # con la que se evaluo, no se relee la vigente al consultar el historico.
        snapshot_motor=_snapshot_politica(politica_activa),
        reglas_duras=[],
        decision_driver="PUNTAJE",
    )
    db.add(evaluacion)
    return evaluacion
