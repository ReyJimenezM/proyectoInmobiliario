"""Deriva variables y ejecuta el motor de decision robusto. Porte 1:1 de las funciones
derivar()/evaluar() del prototipo Habitat Risk (JS) a Python puro."""
from __future__ import annotations

from motor_decision.robusto.schemas import (
    EntradaRiesgoArrendatario,
    MotorDecision,
    ReglaActivada,
    ResultadoMotor,
)

OPERADORES = {
    ">=": lambda a, b: a >= b,
    "<=": lambda a, b: a <= b,
    ">": lambda a, b: a > b,
    "<": lambda a, b: a < b,
    "=": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
}


def _clamp(valor: float, minimo: float, maximo: float) -> float:
    return max(minimo, min(maximo, valor))


def derivar(entrada: EntradaRiesgoArrendatario, parametros) -> dict[str, float]:
    ing = entrada.ingresos
    bruto = ing.fijo + ing.variable + ing.otros
    verificable_base = max(0.0, bruto - ing.no_verificable)
    imva = round(
        max(0.0, (ing.fijo - min(ing.fijo, ing.no_verificable)) + ing.variable * parametros.factor_variable
            + ing.otros * parametros.factor_otros)
    )
    verificabilidad = _clamp(round(verificable_base / bruto * 100), 0, 100) if bruto else 0

    inm = entrada.inmueble
    costo_vivienda = inm.canon + inm.administracion + inm.servicios + inm.otros

    cuotas = sum(o.cuota for o in entrada.obligaciones)
    gastos = sum(entrada.gastos.values())

    cod = entrada.codeudor
    imva_cod = round(cod.ingreso_fijo + cod.ingreso_variable * parametros.factor_variable) if cod else 0
    cuotas_cod = cod.obligaciones if cod else 0

    imva_total = imva + imva_cod
    flujo_disponible = imva_total - cuotas - cuotas_cod - gastos
    flujo_post_arriendo = flujo_disponible - costo_vivienda
    cobertura = imva_total / costo_vivienda if costo_vivienda else 0
    ratio_endeudamiento = (cuotas + cuotas_cod) / imva_total if imva_total else 0

    activos = sum(entrada.patrimonio.activos)
    pasivos = sum(entrada.patrimonio.pasivos)

    docs_faltantes = sum(1 for d in entrada.documentos if d.requerido and d.estado not in ("cargado", "aprobado"))
    docs_rechazados = sum(1 for d in entrada.documentos if d.estado == "rechazado")

    lab = entrada.laboral
    return {
        "cobertura": round(cobertura, 4),
        "flujoPostArriendo": flujo_post_arriendo,
        "patrimonioNeto": activos - pasivos,
        "antiguedadMeses": lab.antiguedad_meses,
        "contratoIndefinido": 1 if lab.contrato_indefinido else 0,
        "contratoCorto": 1 if lab.contrato_corto else 0,
        "ingresoPensional": 1 if lab.ingreso_pensional else 0,
        "ratioEndeudamiento": round(ratio_endeudamiento, 4),
        "obligacionesEnMora": 1 if any(o.en_mora for o in entrada.obligaciones) else 0,
        "verificabilidad": verificabilidad,
        "docsFaltantes": docs_faltantes,
        "docsRechazados": docs_rechazados,
        "historialCodigo": entrada.historial.codigo,
        "alertasFraude": len(entrada.alertas),
        "alertaIdentidad": 1 if "identidad" in entrada.alertas else 0,
        "alertaIngresos": 1 if "ingresos" in entrada.alertas else 0,
    }


NIVELES_CAPACIDAD = [(85, "Alta"), (68, "Media-alta"), (45, "Media"), (0, "Baja")]
NIVELES_ESTABILIDAD = [(80, "Alta"), (55, "Media"), (0, "Baja")]
NIVELES_ENDEUDAMIENTO = [(80, "Bajo"), (55, "Medio"), (0, "Alto")]
NIVELES_HISTORIAL = [(85, "Positivo"), (55, "Neutral"), (30, "Mora leve"), (0, "Mora relevante")]
NIVELES_VERIFICABILIDAD = [(85, "Alta"), (60, "Media"), (0, "Baja")]


def _nivel(valor: float, escalones: list[tuple[float, str]]) -> str:
    for umbral, etiqueta in escalones:
        if valor >= umbral:
            return etiqueta
    return escalones[-1][1]


def evaluar_motor(entrada: EntradaRiesgoArrendatario, motor: MotorDecision) -> ResultadoMotor:
    d = derivar(entrada, motor.parametros)

    base_por_grupo: dict[str, float | None] = {g: None for g in motor.pesos}
    ajustes_por_grupo: dict[str, float] = {g: 0.0 for g in motor.pesos}
    reglas_activadas: list[ReglaActivada] = []

    activas = sorted((r for r in motor.reglas if r.activa), key=lambda r: r.prioridad)
    for regla in activas:
        if regla.grupo not in base_por_grupo:
            continue
        valor_actual = d.get(regla.variable)
        if valor_actual is None:
            continue
        operador = OPERADORES.get(regla.operador)
        if operador is None or not operador(valor_actual, regla.valor):
            continue

        if regla.tipo == "escala":
            if base_por_grupo[regla.grupo] is None:
                base_por_grupo[regla.grupo] = regla.puntos
                reglas_activadas.append(ReglaActivada(regla, valor_actual))
        else:  # ajuste
            ajustes_por_grupo[regla.grupo] += regla.puntos
            reglas_activadas.append(ReglaActivada(regla, valor_actual))

    subscores = {
        g: int(_clamp(round((base_por_grupo[g] if base_por_grupo[g] is not None else 50) + ajustes_por_grupo[g]), 0, 100))
        for g in motor.pesos
    }

    peso_total = sum(motor.pesos.values())
    score = round(sum(subscores[g] * motor.pesos[g] for g in motor.pesos) / peso_total * 10)

    p = motor.parametros
    niveles = {
        "capacidad": _nivel(subscores.get("capacidad", 0), NIVELES_CAPACIDAD),
        "estabilidad": _nivel(subscores.get("estabilidad", 0), NIVELES_ESTABILIDAD),
        "endeudamiento": _nivel(subscores.get("endeudamiento", 0), NIVELES_ENDEUDAMIENTO),
        "fraude": "Bajo" if subscores.get("fraude", 0) >= 85 else ("Medio" if subscores.get("fraude", 0) >= p.fraude_revision else "Alto"),
        "historial": _nivel(subscores.get("historial", 0), NIVELES_HISTORIAL),
        "verificabilidad": _nivel(subscores.get("verificabilidad", 0), NIVELES_VERIFICABILIDAD),
    }

    requiere_codeudor = (
        entrada.codeudor is None
        and (d["flujoPostArriendo"] < 0 or d["cobertura"] < p.cobertura_minima or d["verificabilidad"] < p.verificabilidad_minima)
    )

    sub_fraude = subscores.get("fraude", 100)
    if sub_fraude < p.fraude_rechazo:
        decision, motivo = "RECHAZADA", f"Señales de fraude por encima del umbral tolerado ({p.fraude_rechazo} pts)."
    elif sub_fraude < p.fraude_revision:
        decision, motivo = "ESTUDIO", "Alertas antifraude que exigen verificación humana antes de decidir."
    elif score >= p.umbral_preaprobado:
        if d["docsFaltantes"] > 0:
            decision = "REQUISITOS"
            motivo = f"Perfil apto ({score} pts) pero con {int(d['docsFaltantes'])} documento(s) obligatorio(s) pendiente(s)."
        else:
            decision = "PREAPROBADA"
            motivo = f"Score {score} ≥ umbral de preaprobación ({p.umbral_preaprobado}) sin alertas ni faltantes."
    elif score >= p.umbral_requisitos:
        decision = "REQUISITOS" if d["docsFaltantes"] > 0 else "ESTUDIO"
        motivo = f"Score {score} en banda intermedia ({p.umbral_requisitos}–{p.umbral_preaprobado - 1}): requiere soportes adicionales o revisión."
    elif score >= p.umbral_estudio:
        decision, motivo = "ESTUDIO", f"Score {score} por debajo del umbral de requisitos: análisis manual obligatorio."
    elif (
        requiere_codeudor and score >= p.umbral_estudio - 90 and not d["obligacionesEnMora"]
        and d["historialCodigo"] >= 2 and sub_fraude >= p.fraude_revision
    ):
        decision = "REQUISITOS"
        motivo = f"La capacidad individual no alcanza el umbral ({score}), pero el perfil es limpio: la operación es viable con codeudor o póliza de arrendamiento."
    else:
        decision, motivo = "RECHAZADA", f"Score {score} por debajo del umbral mínimo ({p.umbral_estudio})."

    positivos = [r for r in reglas_activadas if r.regla.puntos >= 60]
    negativos = [r for r in reglas_activadas if r.regla.puntos < 60]
    faltantes = []
    if d["docsFaltantes"] > 0:
        faltantes.append(f"{int(d['docsFaltantes'])} documento(s) obligatorio(s) sin cargar")
    if d["verificabilidad"] < p.verificabilidad_minima:
        faltantes.append(f"Soportes para acreditar el {100 - int(d['verificabilidad'])}% del ingreso no verificable")
    if entrada.codeudor is None and requiere_codeudor:
        faltantes.append("Codeudor o póliza de arrendamiento que respalde la operación")
    if d["docsRechazados"] > 0:
        faltantes.append(f"{int(d['docsRechazados'])} documento(s) rechazado(s) por reemplazar")

    return ResultadoMotor(
        score=int(score),
        subscores=subscores,
        niveles=niveles,
        reglas_activadas=reglas_activadas,
        decision=decision,
        motivo=motivo,
        requiere_codeudor=requiere_codeudor,
        positivos=positivos,
        negativos=negativos,
        faltantes=faltantes,
        variables_derivadas=d,
        version=motor.version,
    )
