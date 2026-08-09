"""Scoring de propietario e inmueble, y match de compatibilidad arrendatario-inmueble.
Porte fiel de scoreComps/nivelScore/matchRisk de Habitat Risk."""
from __future__ import annotations

from dataclasses import dataclass

# (clave, etiqueta, peso) -- componentes verificados manualmente por un analista, 0-100 c/u.
OWNER_COMPS: list[tuple[str, str, int]] = [
    ("titularidad", "Titularidad", 25),
    ("juridica", "Situación jurídica", 20),
    ("documentacion", "Documentación", 18),
    ("identidad", "Identidad", 15),
    ("fraude", "Antifraude", 12),
    ("historial", "Historial con la inmobiliaria", 5),
    ("cumplimiento", "Cumplimiento normativo", 5),
]

PROP_COMPS: list[tuple[str, str, int]] = [
    ("documentacion", "Documentación", 22),
    ("titularidad", "Titularidad registral", 22),
    ("ubicacion", "Ubicación", 12),
    ("estado", "Estado del inmueble", 12),
    ("ph", "Propiedad horizontal", 10),
    ("restricciones", "Restricciones / gravámenes", 12),
    ("precio", "Coherencia de precio", 5),
    ("consistencia", "Consistencia declarado vs. documento", 5),
]


def score_componentes(componentes: dict[str, float], definicion: list[tuple[str, str, int]]) -> int:
    """Media ponderada de componentes (cada uno 0-100) escalada a 0-1000."""
    peso_total = sum(peso for _, _, peso in definicion)
    suma = sum(componentes.get(clave, 0) * peso for clave, _, peso in definicion)
    return round(suma / peso_total * 10) if peso_total else 0


def nivel_riesgo(score: int) -> str:
    if score >= 780:
        return "Bajo riesgo"
    if score >= 660:
        return "Riesgo moderado"
    if score >= 520:
        return "Riesgo alto"
    return "Riesgo crítico"


@dataclass(frozen=True)
class ResultadoMatch:
    puntaje: int
    nivel: str
    descripcion: str


def match_risk(tenant_score: float, prop_score: float, cobertura: float, ratio_endeudamiento: float) -> ResultadoMatch:
    """Combina el score del arrendatario, del inmueble y las condiciones economicas de
    ESA operacion especifica para decidir si la combinacion es viable."""
    p = 0
    p += 40 if tenant_score >= 780 else 30 if tenant_score >= 680 else 18 if tenant_score >= 560 else 6
    p += 30 if prop_score >= 780 else 22 if prop_score >= 660 else 12 if prop_score >= 520 else 4
    p += 20 if cobertura >= 3 else 16 if cobertura >= 2.5 else 12 if cobertura >= 2 else 6 if cobertura >= 1.6 else 2
    p += 10 if ratio_endeudamiento <= 0.25 else 6 if ratio_endeudamiento <= 0.35 else 3 if ratio_endeudamiento <= 0.45 else 0

    if p >= 82:
        return ResultadoMatch(p, "Alta compatibilidad", "La relación arrendatario–inmueble–condiciones es viable sin garantías adicionales.")
    if p >= 62:
        return ResultadoMatch(p, "Compatibilidad media", "Viable con requisitos adicionales o póliza de arrendamiento.")
    if p >= 42:
        return ResultadoMatch(p, "Requiere revisión", "La relación exige codeudor, ajuste del arriendo o análisis manual.")
    return ResultadoMatch(p, "Baja compatibilidad", "Las condiciones económicas no son sostenibles para este inmueble.")
