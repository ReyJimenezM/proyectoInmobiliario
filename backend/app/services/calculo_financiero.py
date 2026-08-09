"""Calculos financieros del simulador. Funciones puras, sin acceso a DB, para que sean
faciles de testear de forma aislada."""
from decimal import ROUND_HALF_UP, Decimal


def tasa_mensual_desde_ea(tasa_ea: Decimal) -> Decimal:
    """Convierte una tasa efectiva anual a su equivalente mensual: (1+ea)^(1/12) - 1."""
    base = float(1 + tasa_ea)
    return Decimal(str(base ** (1 / 12) - 1))


def cuota_mensual_amortizacion_francesa(monto: Decimal, tasa_ea: Decimal, plazo_anios: int) -> Decimal:
    """Cuota = monto * [i(1+i)^n] / [(1+i)^n - 1], con i = tasa mensual, n = numero de cuotas."""
    if monto <= 0:
        return Decimal(0)

    i = tasa_mensual_desde_ea(tasa_ea)
    n = plazo_anios * 12

    factor = (1 + i) ** n
    cuota = monto * (i * factor) / (factor - 1)
    return cuota.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def semaforo_compra(relacion_cuota_ingreso: Decimal) -> tuple[str, str]:
    """Bandas de la Parte B.1: <=30% verde, 31-40% amarillo, >40% rojo."""
    if relacion_cuota_ingreso <= Decimal("0.30"):
        return "verde", "Buena probabilidad de aprobación."
    if relacion_cuota_ingreso <= Decimal("0.40"):
        return "amarillo", "Revisión necesaria, considera codeudor."
    return "rojo", "Es probable que necesites ajustar cuota inicial o plazo."


def semaforo_arriendo(relacion_canon_ingreso: Decimal) -> tuple[str, str]:
    """Bandas de la Parte B.2: <=30% verde, 31-35% amarillo, >35% rojo."""
    if relacion_canon_ingreso <= Decimal("0.30"):
        return "verde", "Buena probabilidad de aprobación."
    if relacion_canon_ingreso <= Decimal("0.35"):
        return "amarillo", "Revisión necesaria, considera codeudor."
    return "rojo", "Es probable que necesites ajustar el canon o buscar un codeudor."
