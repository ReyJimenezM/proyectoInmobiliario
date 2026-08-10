"""Capa de reglas duras: condiciones que VENCEN al puntaje.

Un score alto no puede superar una regla dura. El scorecard mide riesgo relativo;
estas reglas expresan hechos binarios (fraude confirmado, menor de edad, un documento
obligatorio que no esta) que ninguna cantidad de puntos compensa.

Dominio puro: no conoce SQLAlchemy, ni el reloj de la aplicacion mas alla de date.today(),
ni la red. Recibe un dataclass plano con los hechos ya extraidos por la capa de servicio.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date

# Severidades posibles de una regla dura.
BLOQUEANTE = "BLOQUEANTE"
REVISION = "REVISION"

# Decisiones que la capa de reglas duras puede forzar.
DECISION_RECHAZADA = "RECHAZADA"
DECISION_INCOMPLETA = "INCOMPLETA"
DECISION_REVISION_MANUAL = "REVISION_MANUAL"


@dataclass(frozen=True)
class ReglaDura:
    codigo: str
    titulo: str
    severidad: str  # BLOQUEANTE | REVISION
    detalle: str

    def a_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class ContextoReglasDuras:
    """Hechos necesarios para la capa 3. Todo opcional con valor neutro: si un hecho
    todavia no se captura en la plataforma, la regla asociada simplemente no dispara."""

    fraude_confirmado: bool = False
    fecha_nacimiento: date | None = None
    documento_critico_rechazado: bool = False
    documentos_obligatorios_faltantes: int = 0
    titularidad_sin_resolver: bool = False
    identidad_verificada: bool = True
    alertas_fraude: int = 0
    situacion_juridica_sin_resolver: bool = False
    campos_invalidos: int = 0
    campos_faltantes: int = 0


def _edad(fecha_nacimiento: date, hoy: date) -> int:
    return hoy.year - fecha_nacimiento.year - (
        (hoy.month, hoy.day) < (fecha_nacimiento.month, fecha_nacimiento.day)
    )


def evaluar_reglas_duras(contexto: ContextoReglasDuras, hoy: date | None = None) -> list[ReglaDura]:
    """Devuelve las reglas duras disparadas, primero las BLOQUEANTE y luego las de REVISION.

    El orden importa: `decision_por_reglas_duras` toma la primera bloqueante como la
    que gobierna la decision y la que se explica al usuario."""
    hoy = hoy or date.today()
    stops: list[ReglaDura] = []

    # --- BLOQUEANTES ---
    if contexto.fraude_confirmado:
        stops.append(ReglaDura(
            "HR-04", "Fraude confirmado", BLOQUEANTE,
            "Existe un hallazgo de fraude confirmado en el expediente.",
        ))
    if contexto.fecha_nacimiento is not None and _edad(contexto.fecha_nacimiento, hoy) < 18:
        stops.append(ReglaDura(
            "HR-06", "Solicitante menor de edad", BLOQUEANTE,
            "No es posible celebrar el contrato de arrendamiento con un menor de edad.",
        ))
    if contexto.documento_critico_rechazado:
        stops.append(ReglaDura(
            "HR-03", "Documento crítico rechazado", BLOQUEANTE,
            "Un documento crítico (identidad o soporte de ingresos) fue rechazado en la revisión.",
        ))
    if contexto.documentos_obligatorios_faltantes > 0:
        stops.append(ReglaDura(
            "HR-02", "Documento obligatorio faltante", BLOQUEANTE,
            f"Faltan {contexto.documentos_obligatorios_faltantes} documento(s) obligatorio(s) "
            "por cargar. Falta información, no es un mal perfil.",
        ))
    if contexto.titularidad_sin_resolver:
        stops.append(ReglaDura(
            "HR-07", "Titularidad del inmueble incompatible", BLOQUEANTE,
            "El propietario no acredita ser titular del inmueble ni tener poder vigente.",
        ))

    # --- REVISION ---
    if not contexto.identidad_verificada:
        stops.append(ReglaDura(
            "HR-01", "Identidad no validada", REVISION,
            "La validación de identidad del solicitante no está superada.",
        ))
    if contexto.alertas_fraude > 0 and not contexto.fraude_confirmado:
        stops.append(ReglaDura(
            "HR-05", "Alerta de fraude sin resolver", REVISION,
            f"Hay {contexto.alertas_fraude} alerta(s) antifraude abiertas que exigen verificación humana.",
        ))
    if contexto.situacion_juridica_sin_resolver:
        stops.append(ReglaDura(
            "HR-08", "Situación jurídica del inmueble sin resolver", REVISION,
            "El certificado de tradición y libertad del inmueble está pendiente o rechazado.",
        ))
    if contexto.campos_invalidos > 0:
        stops.append(ReglaDura(
            "HR-09", "Datos capturados inválidos", REVISION,
            f"{contexto.campos_invalidos} campo(s) no superan la validación de tipo, formato o rango.",
        ))
    if contexto.campos_faltantes >= 3:
        stops.append(ReglaDura(
            "HR-10", "Tres o más datos obligatorios sin capturar", REVISION,
            f"Faltan {contexto.campos_faltantes} datos obligatorios del expediente.",
        ))

    return stops


# Reglas cuya naturaleza es "este perfil no es contratable", no "este perfil es dudoso".
_CODIGOS_RECHAZO = ("HR-04", "HR-06")
# Regla de informacion incompleta: no se rechaza a nadie por no haber subido un papel.
_CODIGO_INCOMPLETA = "HR-02"


def decision_por_reglas_duras(stops: list[ReglaDura]) -> str | None:
    """Decision forzada por la capa 3, o None si no hay reglas duras disparadas.

    Prioridad: rechazo > incompleta > revisión manual. Las de severidad REVISION nunca
    aprueban en automático: como mucho mandan el caso a un analista."""
    if not stops:
        return None
    codigos = {s.codigo for s in stops}
    if codigos & set(_CODIGOS_RECHAZO):
        return DECISION_RECHAZADA
    if _CODIGO_INCOMPLETA in codigos:
        return DECISION_INCOMPLETA
    return DECISION_REVISION_MANUAL


def regla_gobernante(stops: list[ReglaDura]) -> ReglaDura | None:
    """La regla que explica la decision: la primera bloqueante segun la prioridad de
    `decision_por_reglas_duras`, o la primera de revision si no hay bloqueantes."""
    if not stops:
        return None
    por_codigo = {s.codigo: s for s in stops}
    for codigo in (*_CODIGOS_RECHAZO, _CODIGO_INCOMPLETA):
        if codigo in por_codigo:
            return por_codigo[codigo]
    bloqueantes = [s for s in stops if s.severidad == BLOQUEANTE]
    return bloqueantes[0] if bloqueantes else stops[0]
