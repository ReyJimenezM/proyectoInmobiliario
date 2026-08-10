"""Motor de calidad de dato y validación en 3 capas (portado del prototipo habitat-risk).

Capa 1 · Validación de campos: formato y rangos de lo capturado en la solicitud.
Capa 2 · Consistencia: relaciones entre datos (gastos vs ingresos, edad vs antigüedad,
         codeudor vs solicitante, correo desechable, canon vs ingreso, etc.).
Capa 3 · Reglas: documentos requeridos por perfil sin cargar o rechazados y decisiones
         del motor desactualizadas frente a la última edición del expediente.

Además calcula la calidad del dato campo a campo (declarado / con soporte / verificado /
inconsistente / sin verificar) y un índice de verificabilidad 0-100.
"""
import re
from datetime import date
from typing import Any

from app.models.documento_solicitud import DocumentoSolicitud
from app.models.enums import EstadoDocumento
from app.models.evaluacion import Evaluacion
from app.models.solicitud import Solicitud
from app.services.checklist_documentos import documentos_requeridos

# ---------------------------------------------------------------------------
# Tipos de hallazgo (etiqueta, severidad y acción sugerida, portados del prototipo)
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

# Estados de calidad del dato con su peso en la verificabilidad.
ESTADOS_DATO: dict[str, dict] = {
    "verificado": {"etiqueta": "Verificado", "peso": 1.0},
    "con_soporte": {"etiqueta": "Con soporte", "peso": 0.8},
    "declarado": {"etiqueta": "Declarado", "peso": 0.55},
    "sin_verificar": {"etiqueta": "Sin verificar", "peso": 0.4},
    "inconsistente": {"etiqueta": "Inconsistente", "peso": 0.2},
}

# Topes de razonabilidad (COP mensuales).
MAX_RAZONABLE = {"ingreso": 120_000_000, "gasto": 60_000_000, "arriendo": 60_000_000}

# Reglas de número de documento por tipo (el formulario captura la etiqueta larga).
_DOC_RULES: dict[str, tuple[re.Pattern, str]] = {
    "CC": (re.compile(r"^\d{6,10}$"), "La cédula de ciudadanía debe tener entre 6 y 10 números, sin puntos."),
    "CE": (re.compile(r"^\d{6,7}$"), "La cédula de extranjería debe tener entre 6 y 7 números."),
    "PPT": (re.compile(r"^\d{7,11}$"), "El PPT debe tener entre 7 y 11 números."),
    "PA": (re.compile(r"^[A-Za-z0-9]{5,15}$"), "El pasaporte tiene entre 5 y 15 caracteres, letras y números."),
    "NIT": (re.compile(r"^\d{5,15}-?\d?$"), "El NIT debe tener entre 5 y 15 números y su dígito de verificación."),
}
_TIPO_DOC_ALIAS = {
    "cédula de ciudadanía": "CC", "cedula de ciudadania": "CC", "cc": "CC",
    "cédula de extranjería": "CE", "cedula de extranjeria": "CE", "ce": "CE",
    "pasaporte": "PA", "pa": "PA",
    "permiso por protección temporal": "PPT", "permiso por proteccion temporal": "PPT", "ppt": "PPT",
    "nit": "NIT",
}

_EMAIL_RE = re.compile(r"^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$", re.IGNORECASE)
_DOMINIOS_DESECHABLES = {
    "mailinator.com", "yopmail.com", "guerrillamail.com", "10minutemail.com", "temp-mail.org",
    "tempmail.com", "trashmail.com", "getnada.com", "sharklasers.com", "dispostable.com",
    "maildrop.cc", "mintemail.com", "throwawaymail.com", "fakeinbox.com", "mohmal.com",
}

_SALARIO_MINIMO_REFERENCIA = 1_300_000  # referencia de plausibilidad, no dato normativo


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
def to_number(v: Any) -> float | None:
    """Convierte cualquier entrada a número puro; None si viene vacía, NaN-like si no aplica."""
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if v is None:
        return None
    s = str(v).strip()
    if s == "":
        return None
    limpio = re.sub(r"[^\d,.\-]", "", s).replace(",", ".")
    try:
        return float(limpio)
    except ValueError:
        return None


def nit_dv(base: str) -> int | None:
    """Dígito de verificación del NIT (algoritmo DIAN)."""
    pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
    digitos = re.sub(r"\D", "", str(base))
    if not digitos or len(digitos) > 15:
        return None
    suma = sum(int(d) * pesos[i] for i, d in enumerate(reversed(digitos)))
    resto = suma % 11
    return resto if resto < 2 else 11 - resto


def _edad_desde(fecha_iso: str | None) -> int | None:
    if not fecha_iso:
        return None
    try:
        nacimiento = date.fromisoformat(str(fecha_iso)[:10])
    except ValueError:
        return None
    hoy = date.today()
    return hoy.year - nacimiento.year - ((hoy.month, hoy.day) < (nacimiento.month, nacimiento.day))


def _tipo_doc_corto(tipo_largo: str | None) -> str | None:
    return _TIPO_DOC_ALIAS.get(str(tipo_largo or "").strip().lower())


def nuevo_hallazgo(tipo: str, titulo: str, detalle: str, campos: list[str] | None = None) -> dict:
    meta = FINDING_TIPOS[tipo]
    return {
        "tipo": tipo,
        "tipo_etiqueta": meta["etiqueta"],
        "severidad": meta["severidad"],
        "titulo": titulo,
        "detalle": detalle,
        "campos": campos or [],
        "accion": meta["accion"],
    }


def _ingreso_total(fin: dict) -> float:
    return (
        (to_number(fin.get("ingresos_mensuales_fijos")) or 0)
        + (to_number(fin.get("ingresos_variables")) or 0)
        + (to_number(fin.get("ingresos_otros")) or 0)
    )


def _cuotas_obligaciones(fin: dict) -> float:
    return sum((to_number(c.get("cuota_mensual")) or 0) for c in fin.get("otros_creditos") or [])


# ---------------------------------------------------------------------------
# CAPA 1 · Validación de campos
# ---------------------------------------------------------------------------
def capa_validacion(solicitud: Solicitud) -> list[dict]:
    hallazgos: list[dict] = []
    per = solicitud.datos_personales or {}
    fin = solicitud.datos_financieros or {}

    # Correo electrónico
    email = str(per.get("email") or "").strip().lower()
    if email and not _EMAIL_RE.match(email):
        hallazgos.append(nuevo_hallazgo(
            "ERROR_DIGITACION", "Correo electrónico con formato inválido",
            f"El correo registrado ({email}) no tiene un formato válido.", ["email"],
        ))

    # Teléfono: celular de 10 dígitos que empieza por 3, o fijo con indicativo 60X.
    telefono = re.sub(r"\D", "", str(per.get("telefono") or ""))
    if telefono:
        es_celular = len(telefono) == 10 and telefono.startswith("3")
        es_fijo = len(telefono) == 10 and telefono.startswith("60")
        if not (es_celular or es_fijo):
            hallazgos.append(nuevo_hallazgo(
                "ERROR_DIGITACION", "Teléfono con formato inválido",
                "En Colombia los celulares tienen 10 dígitos y empiezan por 3; los fijos usan el indicativo 60.",
                ["telefono"],
            ))

    # Número de documento según tipo
    tipo = _tipo_doc_corto(per.get("tipo_documento"))
    numero = re.sub(r"[.\s]", "", str(per.get("numero_documento") or ""))
    if tipo and numero:
        regla = _DOC_RULES.get(tipo)
        if regla and not regla[0].match(numero):
            hallazgos.append(nuevo_hallazgo(
                "ERROR_DIGITACION", "Número de documento con formato inválido", regla[1], ["numero_documento"],
            ))
        elif tipo == "NIT":
            base, _, dv = numero.partition("-")
            if dv and nit_dv(base) != int(dv):
                hallazgos.append(nuevo_hallazgo(
                    "ERROR_DIGITACION", "Dígito de verificación del NIT no coincide",
                    f"El dígito informado ({dv}) no corresponde al calculado con el algoritmo DIAN ({nit_dv(base)}).",
                    ["numero_documento"],
                ))

    # Edad 18-84
    edad = _edad_desde(per.get("fecha_nacimiento"))
    if edad is not None and (edad < 18 or edad > 84):
        hallazgos.append(nuevo_hallazgo(
            "INCONSISTENCIA" if edad < 18 else "ERROR_DIGITACION",
            "Edad fuera de rango",
            f"La fecha de nacimiento implica una edad de {edad} años; el rango admitido es 18 a 84.",
            ["fecha_nacimiento"],
        ))

    # Montos: no negativos y dentro de topes razonables
    montos = {
        "ingresos_mensuales_fijos": ("ingreso", "Ingresos fijos"),
        "ingresos_variables": ("ingreso", "Ingresos variables"),
        "ingresos_otros": ("ingreso", "Otros ingresos"),
        "gastos_mensuales_fijos": ("gasto", "Gastos mensuales"),
        "deducciones_nomina": ("gasto", "Deducciones de nómina"),
        "monto_ahorros": (None, "Ahorros"),
    }
    for campo, (tope, etiqueta) in montos.items():
        n = to_number(fin.get(campo))
        if n is None:
            continue
        if n < 0:
            hallazgos.append(nuevo_hallazgo(
                "ERROR_DIGITACION", f"{etiqueta} con valor negativo",
                f"{etiqueta} no puede ser un valor negativo (${n:,.0f}).", [campo],
            ))
        elif tope and n > MAX_RAZONABLE[tope]:
            hallazgos.append(nuevo_hallazgo(
                "DATO_INUSUAL", f"{etiqueta} inusualmente altos",
                f"${n:,.0f} supera el tope de razonabilidad (${MAX_RAZONABLE[tope]:,.0f}). "
                "Si es correcto, se confirmará con los soportes.", [campo],
            ))

    for credito in fin.get("otros_creditos") or []:
        cuota = to_number(credito.get("cuota_mensual"))
        if cuota is not None and cuota < 0:
            hallazgos.append(nuevo_hallazgo(
                "ERROR_DIGITACION", "Cuota de obligación negativa",
                f"La obligación con {credito.get('entidad', 'entidad desconocida')} registra una cuota negativa.",
                ["otros_creditos"],
            ))

    return hallazgos


# ---------------------------------------------------------------------------
# CAPA 2 · Consistencia entre datos
# ---------------------------------------------------------------------------
def capa_consistencia(solicitud: Solicitud, canon_mensual: float | None = None) -> list[dict]:
    hallazgos: list[dict] = []
    per = solicitud.datos_personales or {}
    lab = solicitud.datos_laborales or {}
    fin = solicitud.datos_financieros or {}
    gar = solicitud.garantias_referencias or {}

    ingreso = _ingreso_total(fin)
    gastos = to_number(fin.get("gastos_mensuales_fijos")) or 0
    cuotas = _cuotas_obligaciones(fin)

    # Gastos que consumen casi todo el ingreso
    if ingreso > 0 and gastos > ingreso * 0.9:
        hallazgos.append(nuevo_hallazgo(
            "INCONSISTENCIA", "Los gastos consumen casi todo el ingreso",
            f"Gastos por ${gastos:,.0f} frente a un ingreso declarado de ${ingreso:,.0f} "
            f"({gastos / ingreso * 100:.0f} %). Puede ser un error de digitación o una situación insostenible.",
            ["gastos_mensuales_fijos", "ingresos_mensuales_fijos"],
        ))

    # Ingreso inusual frente a la ocupación declarada
    ocupacion = str(lab.get("tipo_ocupacion") or "")
    if ingreso > 0:
        if ocupacion in ("pensionado",) and ingreso > 30_000_000:
            hallazgos.append(nuevo_hallazgo(
                "DATO_INUSUAL", "Ingreso inusualmente alto para un pensionado",
                f"Declara mesada e ingresos por ${ingreso:,.0f}; se confirmará con la resolución de pensión.",
                ["ingresos_mensuales_fijos"],
            ))
        if ocupacion in ("indefinido", "termino_fijo") and 0 < ingreso < _SALARIO_MINIMO_REFERENCIA * 0.5:
            hallazgos.append(nuevo_hallazgo(
                "DATO_INUSUAL", "Ingreso inusualmente bajo para un empleado",
                f"El ingreso declarado (${ingreso:,.0f}) está muy por debajo de un salario mínimo. "
                "Verificar que no falten ceros o que la periodicidad no sea quincenal.",
                ["ingresos_mensuales_fijos"],
            ))

    # Endeudamiento: cuotas > 60 % del ingreso
    if ingreso > 0 and cuotas > ingreso * 0.6:
        hallazgos.append(nuevo_hallazgo(
            "INCONSISTENCIA", "Endeudamiento muy alto",
            f"Las cuotas de obligaciones (${cuotas:,.0f}) comprometen el {cuotas / ingreso * 100:.0f} % "
            "del ingreso declarado.", ["otros_creditos"],
        ))

    # Edad vs antigüedad laboral imposible
    edad = _edad_desde(per.get("fecha_nacimiento"))
    antiguedad = to_number(lab.get("antiguedad_laboral_anios"))
    if edad is not None and antiguedad is not None and antiguedad > max(edad - 15, 0):
        hallazgos.append(nuevo_hallazgo(
            "INCONSISTENCIA", "Antigüedad laboral incompatible con la edad",
            f"Con {edad} años no es posible acreditar {antiguedad:.0f} años de vida laboral "
            "(implicaría haber empezado antes de los 15 años).",
            ["antiguedad_laboral_anios", "fecha_nacimiento"],
        ))

    # Correo desechable
    email = str(per.get("email") or "").strip().lower()
    dominio = email.rsplit("@", 1)[-1] if "@" in email else ""
    if dominio in _DOMINIOS_DESECHABLES:
        hallazgos.append(nuevo_hallazgo(
            "ALERTA_FRAUDE", "Correo electrónico desechable",
            f"El dominio {dominio} corresponde a un servicio de correos temporales; "
            "no permite contactar al solicitante de forma confiable.", ["email"],
        ))

    # Canon/cuota frente al ingreso
    if canon_mensual and ingreso > 0 and canon_mensual / ingreso > 0.5:
        hallazgos.append(nuevo_hallazgo(
            "INCONSISTENCIA", "El canon compromete más de la mitad del ingreso",
            f"El canon o cuota mensual (${canon_mensual:,.0f}) representa el "
            f"{canon_mensual / ingreso * 100:.0f} % del ingreso declarado (${ingreso:,.0f}).",
            ["ingresos_mensuales_fijos"],
        ))

    # Patrimonio negativo con activos declarados
    activos = [to_number(v) or 0 for v in fin.get("patrimonio_activos") or []]
    pasivos = [to_number(v) or 0 for v in fin.get("patrimonio_pasivos") or []]
    if activos and sum(pasivos) > sum(activos):
        hallazgos.append(nuevo_hallazgo(
            "DATO_INUSUAL", "Patrimonio neto negativo",
            f"Los pasivos declarados (${sum(pasivos):,.0f}) superan los activos (${sum(activos):,.0f}).",
            ["patrimonio_activos", "patrimonio_pasivos"],
        ))

    # Codeudor con el mismo documento del solicitante
    codeudor = gar.get("codeudor") or {}
    doc_solicitante = re.sub(r"\D", "", str(per.get("numero_documento") or ""))
    doc_codeudor = re.sub(r"\D", "", str(codeudor.get("documento") or ""))
    if doc_solicitante and doc_codeudor and doc_solicitante == doc_codeudor:
        hallazgos.append(nuevo_hallazgo(
            "ALERTA_FRAUDE", "El codeudor tiene el mismo documento del solicitante",
            "El solicitante no puede ser su propio codeudor; el documento registrado coincide en ambos roles.",
            ["numero_documento"],
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
        solicitud.datos_laborales or {}, solicitud.garantias_referencias or {}, solicitud.vertical.value
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
                "El perfil del solicitante exige este documento y aún no ha sido cargado.", ["documentos"],
            ))
        elif doc.estado == EstadoDocumento.rechazado:
            hallazgos.append(nuevo_hallazgo(
                "DOC_INSUFICIENTE", f"Documento rechazado: {nombre}",
                "El documento fue rechazado en revisión; requiere una nueva carga.", ["documentos"],
            ))

    for doc in documentos:
        if doc.tipo_documento not in requeridos and doc.estado == EstadoDocumento.rechazado:
            hallazgos.append(nuevo_hallazgo(
                "DOC_INSUFICIENTE", f"Documento rechazado: {doc.tipo_documento.replace('_', ' ')}",
                "El documento fue rechazado en revisión; requiere una nueva carga.", ["documentos"],
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
            "la decisión registrada no refleja los datos actuales.", ["evaluacion"],
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
     ["desprendibles_pago_o_certificacion_laboral", "certificado_pension_vigente", "rut", "declaracion_renta"], 1.5),
    ("ingresos_variables", "Ingresos variables", ("datos_financieros", "ingresos_variables"),
     ["extractos_bancarios_3_meses", "declaracion_renta"], 1.0),
    ("gastos_mensuales_fijos", "Gastos mensuales", ("datos_financieros", "gastos_mensuales_fijos"), [], 1.0),
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
    secciones = {
        "datos_personales": solicitud.datos_personales or {},
        "datos_laborales": solicitud.datos_laborales or {},
        "datos_financieros": solicitud.datos_financieros or {},
        "garantias_referencias": solicitud.garantias_referencias or {},
    }
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
                estados_doc.get(t) in (EstadoDocumento.cargado, EstadoDocumento.aprobado) for t in soportes
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
        + capa_consistencia(solicitud, canon_mensual)
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
