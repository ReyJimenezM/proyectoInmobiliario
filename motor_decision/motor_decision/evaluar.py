"""Punto de entrada del motor de decision. Funcion pura: mismo payload + misma version
de politica -> mismo resultado, siempre. Sin acceso a base de datos, red, reloj ni
almacenamiento -- por eso puede desplegarse como microservicio independiente sin
reescribirse (ver Parte G del prompt maestro)."""
from __future__ import annotations

from motor_decision.explicacion import generar_explicacion
from motor_decision.reglas import EXTRACTORES_HECHOS, evaluar_banda
from motor_decision.schemas import (
    EntradaEvaluacion,
    Politica,
    ResultadoEvaluacion,
    RutaAlterna,
    VariableEvaluada,
)


def _decidir(score: float, politica: Politica) -> str:
    bd = politica.bandas_decision
    if score >= bd.aprobado_min:
        return "aprobada"
    if score >= bd.revision_min:
        return "revision_manual"
    return "rechazada"


def _ruta_alterna(decision: str, entrada: EntradaEvaluacion) -> RutaAlterna | None:
    if decision == "aprobada":
        return None

    sugerencias = []
    if not entrada.garantia.tiene_codeudor:
        sugerencias.append("agregar_codeudor")
    if entrada.vertical == "arriendo" and not entrada.garantia.tiene_poliza:
        sugerencias.append("tomar_poliza")

    return RutaAlterna(disponible=len(sugerencias) > 0, sugerencias=sugerencias)


def evaluar(entrada: EntradaEvaluacion, politica: Politica) -> ResultadoEvaluacion:
    if politica.vertical != entrada.vertical:
        raise ValueError(
            f"La politica es de vertical '{politica.vertical}' pero la solicitud es de "
            f"vertical '{entrada.vertical}'."
        )

    variables_evaluadas: list[VariableEvaluada] = []
    score = 0.0

    for variable_politica in politica.variables:
        extractor = EXTRACTORES_HECHOS.get(variable_politica.nombre)
        if extractor is None:
            raise ValueError(f"No existe extractor de hechos para la variable '{variable_politica.nombre}'.")

        seccion_payload = getattr(entrada, variable_politica.nombre)
        hechos = extractor(seccion_payload)
        banda = evaluar_banda(hechos, variable_politica.bandas)

        puntaje_ponderado = banda.puntaje * variable_politica.peso
        score += puntaje_ponderado

        valor_calculado = hechos.get("ratio", next(iter(hechos.values()), None))
        variables_evaluadas.append(
            VariableEvaluada(
                nombre=variable_politica.nombre,
                peso=variable_politica.peso,
                valor_calculado=valor_calculado,
                banda=banda.etiqueta,
                puntaje_obtenido=banda.puntaje,
                puntaje_ponderado=round(puntaje_ponderado, 2),
            )
        )

    score = round(score, 2)
    decision = _decidir(score, politica)
    explicacion = generar_explicacion(decision, variables_evaluadas)
    ruta_alterna = _ruta_alterna(decision, entrada)

    return ResultadoEvaluacion(
        score=score,
        decision=decision,
        variables_evaluadas=variables_evaluadas,
        explicacion_generada=explicacion,
        ruta_alterna=ruta_alterna,
        politica_version_id=politica.politica_version_id,
    )
