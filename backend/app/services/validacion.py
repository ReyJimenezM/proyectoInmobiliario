"""Calidad de dato y validación en 3 capas sobre una solicitud.

Este módulo ya **no** contiene las reglas: es el adaptador entre el expediente
guardado (SQLAlchemy) y los motores declarativos de `app/validacion`:

Capa 1 · Campos     → `app.validacion.motor` sobre `app.validacion.especificaciones`
Capa 2 · Consistencia → `app.validacion.consistencia` (registro con @comprobacion)
Capa 3 · Reglas      → documentos requeridos por perfil y decisión desactualizada

La forma de la respuesta de `validar_solicitud` no cambia
(`{hallazgos, calidad, verificabilidad, resumen}`): el frontend desplegado y la
trazabilidad la consumen tal cual. Los tipos nuevos se traducen a los que la API
ya devolvía.
"""
import re
from typing import Any

from app.models.documento_solicitud import DocumentoSolicitud
from app.models.enums import EstadoDocumento
from app.models.evaluacion import Evaluacion
from app.models.solicitud import Solicitud
from app.services.checklist_documentos import documentos_requeridos
from app.validacion import ESPECIFICACIONES, EntradaConsistencia, ejecutar, motor
from app.validacion.colombia import (
    MAX_RAZONABLE_ARRIENDO,
    MAX_RAZONABLE_GASTO,
    MAX_RAZONABLE_INGRESO,
    NO_NUMERICO,
    a_fecha,
    parsear_moneda,
)
from app.validacion.colombia import dv_nit as nit_dv  # noqa: F401  (compatibilidad)
from app.validacion.motor import (
    ADVERTENCIA,
    CONTRADICTORIO,
    FALTANTE,
    INVALIDO,
    SIN_VERIFICAR,
)

# ---------------------------------------------------------------------------
# Tipos de hallazgo que expone la API (no se tocan: el frontend los conoce)
# ---------------------------------------------------------------------------
FINDING_TIPOS: dict[str, dict] = {
    "ERROR_DIGITACION": {
        "etiqueta": "Posible error de digitación", "severidad": 1,
        "accion": "Confirmar el valor con el solicitante.",
    },
    "DATO_INUSUAL": {
        "etiqueta": "Dato inusual", "severidad": 1,
        "accion": "Verificar que no sea un error de captura.",
    },
    "NO_VERIFICADO": {
        "etiqueta": "Información no verificada", "severidad": 2,
        "accion": "Pedir el soporte que permita verificarla.",
    },
    "DOC_INSUFICIENTE": {
        "etiqueta": "Documento insuficiente", "severidad": 2,
        "accion": "Solicitar nueva carga del documento.",
    },
    "INCONSISTENCIA": {
        "etiqueta": "Inconsistencia", "severidad": 3,
        "accion": "Solicitar soporte o aclaración antes de decidir.",
    },
    "ALERTA_FRAUDE": {
        "etiqueta": "Alerta de fraude", "severidad": 4,
        "accion": "Escalar al equipo de fraude; no comunicar decisión aún.",
    },
}

#: Traducción de los tipos del motor de consistencia a los tipos de la API.
_TIPO_API: dict[str, str] = {
    "ERROR_DIGITACION": "ERROR_DIGITACION",
    "VALOR_INUSUAL": "DATO_INUSUAL",
    "SIN_VERIFICAR": "NO_VERIFICADO",
    "DOCUMENTO_INSUFICIENTE": "DOC_INSUFICIENTE",
    "INCONSISTENCIA": "INCONSISTENCIA",
    "ALERTA_FRAUDE": "ALERTA_FRAUDE",
    "FRAUDE_CONFIRMADO": "ALERTA_FRAUDE",
}

#: Traducción de los estados de campo (capa 1) a los tipos de la API.
#: FALTANTE no es un error de digitación: es un dato que todavía no se pidió.
_TIPO_API_ESTADO: dict[str, str] = {
    INVALIDO: "ERROR_DIGITACION",
    CONTRADICTORIO: "INCONSISTENCIA",
    ADVERTENCIA: "DATO_INUSUAL",
    FALTANTE: "NO_VERIFICADO",
    SIN_VERIFICAR: "NO_VERIFICADO",
}

_TITULO_ESTADO: dict[str, str] = {
    INVALIDO: "{etiqueta}: el dato no es válido",
    CONTRADICTORIO: "{etiqueta}: contradice otro dato del expediente",
    ADVERTENCIA: "{etiqueta}: valor inusual",
    FALTANTE: "Falta un dato obligatorio: {etiqueta_min}",
    SIN_VERIFICAR: "{etiqueta}: se toma como declarada",
}

# Estados de calidad del dato con su peso en la verificabilidad.
ESTADOS_DATO: dict[str, dict] = {
    "verificado": {"etiqueta": "Verificado", "peso": 1.0},
    "con_soporte": {"etiqueta": "Con soporte", "peso": 0.8},
    "declarado": {"etiqueta": "Declarado", "peso": 0.55},
    "sin_verificar": {"etiqueta": "Sin verificar", "peso": 0.4},
    "inconsistente": {"etiqueta": "Inconsistente", "peso": 0.2},
}

# Topes de razonabilidad (COP mensuales), ahora declarados en app/validacion/colombia.py.
MAX_RAZONABLE = {
    "ingreso": MAX_RAZONABLE_INGRESO,
    "gasto": MAX_RAZONABLE_GASTO,
    "arriendo": MAX_RAZONABLE_ARRIENDO,
}

#: Documentos que permiten contrastar el ingreso declarado.
_DOCS_INGRESO = (
    "desprendibles_pago_o_certificacion_laboral",
    "certificado_pension_vigente",
    "declaracion_renta",
    "rut",
)
_DOCS_EXTRACTOS = ("extractos_bancarios_3_meses",)

#: Qué campos del wizard vive en cada sección de la solicitud.
_CAMPOS_POR_SECCION: dict[str, tuple[str, ...]] = {
    "datos_personales": (
        "nombres_apellidos", "tipo_documento", "numero_documento", "fecha_nacimiento",
        "estado_civil", "personas_a_cargo", "telefono", "email", "direccion_residencia",
        "ciudad_residencia", "cod_departamento_residencia", "cod_municipio_residencia",
        "tiempo_residencia", "es_propietario",
    ),
    "datos_laborales": (
        "tipo_ocupacion", "empresa", "nit_empleador", "cargo", "fecha_ingreso_laboral",
        "antiguedad_cargo_meses", "antiguedad_laboral_anios", "telefono_verificacion",
        "actividad_economica", "codigo_ciiu", "sector", "antiguedad_negocio_meses",
    ),
    "datos_financieros": (
        "ingresos_mensuales_fijos", "ingresos_variables", "ingresos_otros",
        "descripcion_ingresos_variables", "deducciones_nomina", "ingreso_no_verificable",
        "gastos_mensuales_fijos", "tiene_otros_creditos", "tiene_ahorros", "monto_ahorros",
        "autorizacion_centrales_riesgo",
    ),
    "garantias_referencias": (
        "tiene_codeudor", "tiene_poliza", "ha_arrendado_antes", "mora_en_arriendo_anterior",
        "proceso_restitucion_previo",
    ),
}


# ---------------------------------------------------------------------------
# Utilidades (se mantienen: las consume app/api/validacion.py)
# ---------------------------------------------------------------------------
def to_number(v: Any) -> float | None:
    """Convierte cualquier entrada a número puro; None si viene vacía o no aplica.

    Delega en `parsear_moneda` para que "$3.000.000" y 3000000 den lo mismo: la
    presentación con separador de miles nunca debe leerse como tres pesos.
    """
    if isinstance(v, bool):
        return None
    numero = parsear_moneda(v)
    if numero is None or numero is NO_NUMERICO:
        return None
    return float(numero)


def nuevo_hallazgo(
    tipo: str,
    titulo: str,
    detalle: str,
    campos: list[str] | None = None,
    codigo: str | None = None,
    severidad: int | None = None,
    accion: str | None = None,
) -> dict:
    meta = FINDING_TIPOS[tipo]
    return {
        "tipo": tipo,
        "tipo_etiqueta": meta["etiqueta"],
        "severidad": severidad if severidad is not None else meta["severidad"],
        "titulo": titulo,
        "detalle": detalle,
        "campos": campos or [],
        "accion": accion or meta["accion"],
        "codigo": codigo or "",
    }


def _ingreso_total(fin: dict) -> float:
    return (
        (to_number(fin.get("ingresos_mensuales_fijos")) or 0)
        + (to_number(fin.get("ingresos_variables")) or 0)
        + (to_number(fin.get("ingresos_otros")) or 0)
    )


def _cuotas_obligaciones(fin: dict) -> float:
    return sum((to_number(c.get("cuota_mensual")) or 0) for c in fin.get("otros_creditos") or [])


def _secciones(solicitud: Solicitud) -> dict[str, dict]:
    return {
        "datos_personales": solicitud.datos_personales or {},
        "datos_laborales": solicitud.datos_laborales or {},
        "datos_financieros": solicitud.datos_financieros or {},
        "garantias_referencias": solicitud.garantias_referencias or {},
    }


# ---------------------------------------------------------------------------
# CAPA 1 · Validación de campos (delegada en el motor declarativo)
# ---------------------------------------------------------------------------
def _payload_y_colecciones(solicitud: Solicitud) -> tuple[dict, dict[str, list[dict]]]:
    """Aplana el expediente al vocabulario de `ESPECIFICACIONES`.

    Solo se exige lo obligatorio de las secciones que el solicitante ya tocó: un
    expediente a medio diligenciar no debe llenarse de campos «faltantes» que
    todavía no se le han pedido.
    """
    secciones = _secciones(solicitud)
    payload: dict[str, Any] = {}
    for seccion, campos in _CAMPOS_POR_SECCION.items():
        datos = secciones[seccion]
        if not datos:
            continue
        for campo in campos:
            esp = ESPECIFICACIONES[campo]
            if campo in datos:
                payload[campo] = datos[campo]
            elif esp.obligatorio:
                payload[campo] = None  # se reportará como FALTANTE, no como inválido

    fin = secciones["datos_financieros"]
    gar = secciones["garantias_referencias"]
    colecciones: dict[str, list[dict]] = {}
    if fin.get("otros_creditos"):
        colecciones["otros_creditos"] = [
            c for c in fin["otros_creditos"] if isinstance(c, dict)
        ]
    if isinstance(gar.get("codeudor"), dict):
        colecciones["codeudor"] = [gar["codeudor"]]
    for clave in ("referencia_laboral", "referencia_personal", "referencia_arrendador"):
        if isinstance(gar.get(clave), dict):
            colecciones[clave] = [gar[clave]]
    return payload, colecciones


def capa_validacion(solicitud: Solicitud) -> list[dict]:
    """Formato, rango y coherencia interna de cada campo capturado."""
    payload, colecciones = _payload_y_colecciones(solicitud)
    informe = motor.validar(payload, colecciones=colecciones, exigir_ausentes=False)

    hallazgos: list[dict] = []
    for resultado in informe.resultados:
        tipo = _TIPO_API_ESTADO.get(resultado.estado)
        if tipo is None:
            continue
        etiqueta = resultado.etiqueta or resultado.campo
        campo_base = resultado.campo.split("[")[0]
        titulo = _TITULO_ESTADO[resultado.estado].format(
            etiqueta=etiqueta, etiqueta_min=etiqueta.lower()
        )
        if "[" in resultado.campo:
            indice = resultado.campo.split("[")[1].split("]")[0]
            titulo = f"{titulo} (registro {int(indice) + 1})"
        hallazgos.append(nuevo_hallazgo(
            tipo, titulo, resultado.mensaje or "",
            campos=sorted({campo_base, resultado.campo}),
            codigo=resultado.codigo,
        ))
    return hallazgos


# ---------------------------------------------------------------------------
# CAPA 2 · Consistencia entre datos (delegada en el registro de comprobaciones)
# ---------------------------------------------------------------------------
def _entrada_consistencia(
    solicitud: Solicitud,
    documentos: list[DocumentoSolicitud],
    canon_mensual: float | None,
) -> EntradaConsistencia:
    secciones = _secciones(solicitud)
    per, lab, fin, gar = (
        secciones["datos_personales"], secciones["datos_laborales"],
        secciones["datos_financieros"], secciones["garantias_referencias"],
    )

    ingreso = _ingreso_total(fin)
    gastos = (to_number(fin.get("gastos_mensuales_fijos")) or 0) + (
        to_number(fin.get("deducciones_nomina")) or 0
    )
    cuotas = _cuotas_obligaciones(fin)
    canon = float(canon_mensual or 0)

    aprobados = {d.tipo_documento for d in documentos if d.estado == EstadoDocumento.aprobado}
    rechazados = sorted({
        d.tipo_documento.replace("_", " ")
        for d in documentos
        if d.estado == EstadoDocumento.rechazado
    })
    # Sin certificación aprobada no hay con qué contrastar el ingreso declarado.
    certificado = int(ingreso) if any(t in aprobados for t in _DOCS_INGRESO) else None
    bancarizado = int(ingreso) if any(t in aprobados for t in _DOCS_EXTRACTOS) else None

    codeudor = gar.get("codeudor") or {}
    doc_solicitante = re.sub(r"\D", "", str(per.get("numero_documento") or ""))
    doc_codeudor = re.sub(r"\D", "", str(codeudor.get("documento") or ""))
    compartido = (
        str(codeudor.get("nombre") or "el codeudor")
        if doc_solicitante and doc_solicitante == doc_codeudor
        else None
    )

    codigo_ciiu = str(lab.get("codigo_ciiu") or "").strip() or None

    return EntradaConsistencia(
        ingreso_declarado=int(ingreso),
        ingreso_certificado=certificado,
        ingreso_bancarizado=bancarizado,
        ingreso_fijo=int(to_number(fin.get("ingresos_mensuales_fijos")) or 0),
        ingreso_variable=int(to_number(fin.get("ingresos_variables")) or 0),
        gastos_totales=int(gastos),
        cuotas_obligaciones=int(cuotas),
        costo_vivienda=int(canon),
        disponible_despues_vivienda=int(ingreso - gastos - cuotas - canon),
        nit_empleador=str(lab.get("nit_empleador") or "").strip() or None,
        situacion_laboral=str(lab.get("tipo_ocupacion") or "").strip() or None,
        codigo_ciiu=codigo_ciiu,
        seccion_ciiu=str(lab.get("seccion_ciiu") or "").strip() or None,
        fecha_nacimiento=a_fecha(per.get("fecha_nacimiento")),
        fecha_ingreso_laboral=a_fecha(lab.get("fecha_ingreso_laboral")),
        documentos_rechazados=rechazados,
        documento_compartido_con=compartido,
        email=str(per.get("email") or "").strip().lower() or None,
        activos_totales=int(sum(to_number(v) or 0 for v in fin.get("patrimonio_activos") or [])),
        pasivos_totales=int(sum(to_number(v) or 0 for v in fin.get("patrimonio_pasivos") or [])),
    )


#: Campos del expediente que ilumina cada comprobación (para la calidad del dato).
_CAMPOS_POR_COMPROBACION: dict[str, list[str]] = {
    "INGRESO_VS_CERTIFICADO": ["ingresos_mensuales_fijos"],
    "INGRESO_SIN_SOPORTE": ["ingresos_mensuales_fijos"],
    "INGRESO_VARIABLE_DESPROPORCIONADO": ["ingresos_variables", "ingresos_mensuales_fijos"],
    "INGRESO_VS_OCUPACION": ["ingresos_mensuales_fijos"],
    "GASTOS_SUPERAN_INGRESO": ["gastos_mensuales_fijos", "ingresos_mensuales_fijos"],
    "ENDEUDAMIENTO_ALTO": ["otros_creditos"],
    "VIVIENDA_SUPERA_CAPACIDAD": ["ingresos_mensuales_fijos"],
    "NIT_EMPLEADOR": ["nit_empleador", "empresa"],
    "CIIU_VS_SITUACION": ["actividad_economica"],
    "FECHA_LABORAL_VS_NACIMIENTO": ["fecha_ingreso_laboral", "fecha_nacimiento"],
    "DOCUMENTOS_RECHAZADOS": ["documentos"],
    "DOCUMENTOS_VENCIDOS": ["documentos"],
    "DOCUMENTO_DUPLICADO": ["numero_documento"],
    "CORREO_DESECHABLE": ["email"],
    "PATRIMONIO_NETO_NEGATIVO": ["patrimonio_activos", "patrimonio_pasivos"],
    "TITULARIDAD_PROPIETARIO": ["propiedad"],
    "SITUACION_JURIDICA_INMUEBLE": ["propiedad"],
}


def capa_consistencia(
    solicitud: Solicitud,
    canon_mensual: float | None = None,
    documentos: list[DocumentoSolicitud] | None = None,
) -> list[dict]:
    """Relaciones entre datos: ingresos, deudas, empleador, fechas y documentos."""
    entrada = _entrada_consistencia(solicitud, documentos or [], canon_mensual)
    hallazgos: list[dict] = []
    for hallazgo in ejecutar(entrada):
        tipo_api = _TIPO_API[hallazgo.tipo]
        hallazgos.append(nuevo_hallazgo(
            tipo_api,
            hallazgo.titulo,
            hallazgo.detalle,
            campos=_CAMPOS_POR_COMPROBACION.get(hallazgo.codigo_comprobacion, []),
            codigo=hallazgo.codigo_comprobacion,
            # El motor nuevo distingue el fraude confirmado (5) de la alerta (4).
            severidad=max(hallazgo.severidad, FINDING_TIPOS[tipo_api]["severidad"]),
            accion=hallazgo.accion_sugerida,
        ))
    return hallazgos


# ---------------------------------------------------------------------------
# CAPA 3 · Reglas: documentos requeridos y decisión desactualizada
# ---------------------------------------------------------------------------
def capa_reglas(
    solicitud: Solicitud,
    documentos: list[DocumentoSolicitud],
    ultima_evaluacion: Evaluacion | None,
) -> list[dict]:
    hallazgos: list[dict] = []
    requeridos = documentos_requeridos(
        solicitud.datos_laborales or {}, solicitud.garantias_referencias or {},
        solicitud.vertical.value,
    )
    por_tipo: dict[str, DocumentoSolicitud] = {}
    for doc in documentos:
        por_tipo.setdefault(doc.tipo_documento, doc)

    for tipo in requeridos:
        doc = por_tipo.get(tipo)
        nombre = tipo.replace("_", " ")
        if doc is None or doc.estado == EstadoDocumento.pendiente:
            hallazgos.append(nuevo_hallazgo(
                "DOC_INSUFICIENTE", f"Documento requerido sin cargar: {nombre}",
                "El perfil del solicitante exige este documento y aún no ha sido cargado.",
                ["documentos"], codigo="DOCUMENTO_REQUERIDO_SIN_CARGAR",
            ))

    if (
        ultima_evaluacion is not None
        and solicitud.actualizado_en is not None
        and ultima_evaluacion.evaluado_en is not None
        and solicitud.actualizado_en > ultima_evaluacion.evaluado_en
    ):
        hallazgos.append(nuevo_hallazgo(
            "NO_VERIFICADO", "Decisión del motor desactualizada",
            "El expediente fue modificado después de la última ejecución del motor; "
            "la decisión registrada no refleja los datos actuales.",
            ["evaluacion"], codigo="DECISION_DESACTUALIZADA",
        ))

    return hallazgos


# ---------------------------------------------------------------------------
# Calidad del dato por campo + verificabilidad
# ---------------------------------------------------------------------------
# (campo, etiqueta, ruta (seccion, clave), doc_tipos que lo soportan, importancia)
_CAMPOS_CALIDAD: list[tuple[str, str, tuple[str, str], list[str], float]] = [
    ("nombres_apellidos", "Nombres y apellidos", ("datos_personales", "nombres_apellidos"),
     ["cedula_ciudadania"], 1.0),
    ("numero_documento", "Número de documento", ("datos_personales", "numero_documento"),
     ["cedula_ciudadania"], 1.5),
    ("ingresos_mensuales_fijos", "Ingresos fijos", ("datos_financieros", "ingresos_mensuales_fijos"),
     ["desprendibles_pago_o_certificacion_laboral", "certificado_pension_vigente", "rut",
      "declaracion_renta"], 1.5),
    ("ingresos_variables", "Ingresos variables", ("datos_financieros", "ingresos_variables"),
     ["extractos_bancarios_3_meses", "declaracion_renta"], 1.0),
    ("gastos_mensuales_fijos", "Gastos mensuales", ("datos_financieros", "gastos_mensuales_fijos"),
     [], 1.0),
    ("empresa", "Empresa", ("datos_laborales", "empresa"),
     ["desprendibles_pago_o_certificacion_laboral"], 1.0),
    ("telefono", "Teléfono", ("datos_personales", "telefono"), [], 0.5),
    ("email", "Correo electrónico", ("datos_personales", "email"), [], 0.5),
    ("antiguedad_laboral_anios", "Antigüedad laboral", ("datos_laborales", "antiguedad_laboral_anios"),
     ["desprendibles_pago_o_certificacion_laboral"], 1.0),
    ("monto_ahorros", "Ahorros", ("datos_financieros", "monto_ahorros"),
     ["extractos_bancarios_3_meses"], 0.75),
    ("otros_creditos", "Obligaciones financieras", ("datos_financieros", "otros_creditos"), [], 1.0),
    ("referencias", "Referencias", ("garantias_referencias", "referencia_personal"), [], 0.5),
]

_FUENTES = {
    "verificado": "Documento aprobado",
    "con_soporte": "Documento cargado",
    "declarado": "Formulario del solicitante",
    "sin_verificar": "Formulario del solicitante",
    "inconsistente": "Motor de consistencia",
}


def calidad_datos(
    solicitud: Solicitud, documentos: list[DocumentoSolicitud], hallazgos: list[dict]
) -> tuple[list[dict], float]:
    secciones = _secciones(solicitud)
    estados_doc: dict[str, EstadoDocumento] = {}
    for doc in documentos:
        previo = estados_doc.get(doc.tipo_documento)
        # Un aprobado pesa más que un cargado; un rechazado no aporta soporte.
        if previo is None or doc.estado == EstadoDocumento.aprobado:
            estados_doc[doc.tipo_documento] = doc.estado

    campos_inconsistentes: set[str] = set()
    for h in hallazgos:
        if h["tipo"] in ("INCONSISTENCIA", "ALERTA_FRAUDE"):
            campos_inconsistentes.update(h.get("campos") or [])

    resultado: list[dict] = []
    suma_ponderada = 0.0
    suma_pesos = 0.0
    for campo, etiqueta, (seccion, clave), soportes, importancia in _CAMPOS_CALIDAD:
        valor = secciones[seccion].get(clave)

        if campo in campos_inconsistentes:
            estado = "inconsistente"
        else:
            aprobado = any(estados_doc.get(t) == EstadoDocumento.aprobado for t in soportes)
            cargado = any(
                estados_doc.get(t) in (EstadoDocumento.cargado, EstadoDocumento.aprobado)
                for t in soportes
            )
            if aprobado:
                estado = "verificado"
            elif cargado:
                estado = "con_soporte"
            elif soportes:
                # El campo es verificable por documento pero aún no hay ninguno utilizable.
                estado = "sin_verificar" if any(estados_doc.get(t) for t in soportes) else "declarado"
            else:
                estado = "declarado"

        peso_estado = ESTADOS_DATO[estado]["peso"]
        suma_ponderada += peso_estado * importancia
        suma_pesos += importancia
        if isinstance(valor, (list, dict)):
            valor_mostrado: Any = f"{len(valor)} registro(s)" if isinstance(valor, list) else "registrado"
        else:
            valor_mostrado = valor
        resultado.append({
            "campo": campo,
            "etiqueta": etiqueta,
            "valor": valor_mostrado,
            "estado": estado,
            "estado_etiqueta": ESTADOS_DATO[estado]["etiqueta"],
            "peso": peso_estado,
            "fuente": _FUENTES[estado],
        })

    verificabilidad = round(suma_ponderada / suma_pesos * 100, 1) if suma_pesos else 0.0
    return resultado, verificabilidad


# ---------------------------------------------------------------------------
# Orquestador
# ---------------------------------------------------------------------------
def validar_solicitud(
    solicitud: Solicitud,
    documentos: list[DocumentoSolicitud],
    ultima_evaluacion: Evaluacion | None = None,
    canon_mensual: float | None = None,
) -> dict:
    hallazgos = (
        capa_validacion(solicitud)
        + capa_consistencia(solicitud, canon_mensual, documentos)
        + capa_reglas(solicitud, documentos, ultima_evaluacion)
    )
    hallazgos.sort(key=lambda h: -h["severidad"])

    calidad, verificabilidad = calidad_datos(solicitud, documentos, hallazgos)
    return {
        "hallazgos": hallazgos,
        "calidad": calidad,
        "verificabilidad": verificabilidad,
        "resumen": {
            "errores": sum(1 for h in hallazgos if h["severidad"] >= 3),
            "advertencias": sum(1 for h in hallazgos if h["severidad"] < 3),
            "verificados": sum(1 for c in calidad if c["estado"] == "verificado"),
            "total_campos": len(calidad),
        },
    }
