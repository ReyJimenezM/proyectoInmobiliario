"""Genera la explicacion en lenguaje simple que acompana cada decision
(No Negociable #4: nunca se devuelve un codigo de error generico)."""
from __future__ import annotations

from motor_decision.schemas import VariableEvaluada

NOMBRES_LEGIBLES = {
    "capacidad": "relación cuota/ingreso",
    "condiciones": "estabilidad laboral",
    "caracter": "referencias verificadas",
    "garantia": "garantías (codeudor/póliza)",
    "capital": "ahorros o respaldo de capital",
}

ETIQUETAS_LEGIBLES = {
    "alta": "banda alta",
    "media": "banda media",
    "baja": "banda baja",
    "cero": "banda mínima",
}

MENSAJES_DECISION = {
    "aprobada": "Tu solicitud fue aprobada automáticamente.",
    "revision_manual": "Tu solicitud quedó en revisión manual.",
    "rechazada": "Tu solicitud fue rechazada por el motor automático.",
}


def _variable_mas_influyente(variables: list[VariableEvaluada]) -> VariableEvaluada:
    return min(variables, key=lambda v: v.puntaje_obtenido * v.peso)


def _variables_en_banda_alta(variables: list[VariableEvaluada]) -> list[VariableEvaluada]:
    return [v for v in variables if v.banda == "alta"]


def generar_explicacion(decision: str, variables: list[VariableEvaluada]) -> str:
    mensaje = [MENSAJES_DECISION[decision]]

    if decision != "aprobada":
        peor = _variable_mas_influyente(variables)
        nombre_legible = NOMBRES_LEGIBLES.get(peor.nombre, peor.nombre)
        etiqueta_legible = ETIQUETAS_LEGIBLES.get(peor.banda, peor.banda)
        mensaje.append(
            f"La variable que más afectó tu puntaje fue {nombre_legible} "
            f"({int(peor.peso * 100)}%, {etiqueta_legible})."
        )

    buenas = _variables_en_banda_alta(variables)
    if buenas:
        nombres_buenas = ", ".join(NOMBRES_LEGIBLES.get(v.nombre, v.nombre) for v in buenas)
        mensaje.append(f"{nombres_buenas.capitalize()} estuvieron en banda alta.")

    return " ".join(mensaje)
