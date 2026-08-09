from decimal import Decimal

import pytest

from app.services.calculo_financiero import (
    cuota_mensual_amortizacion_francesa,
    semaforo_arriendo,
    semaforo_compra,
)


def test_cuota_amortizacion_francesa_caso_conocido():
    # 200,000,000 a 12% EA, 15 años -> cuota mensual aproximada de referencia
    cuota = cuota_mensual_amortizacion_francesa(Decimal("200000000"), Decimal("0.12"), 15)
    assert Decimal("2200000") < cuota < Decimal("2500000")


def test_cuota_amortizacion_monto_cero_es_cero():
    assert cuota_mensual_amortizacion_francesa(Decimal("0"), Decimal("0.12"), 15) == Decimal(0)


def test_cuota_amortizacion_mayor_plazo_reduce_cuota():
    cuota_10 = cuota_mensual_amortizacion_francesa(Decimal("200000000"), Decimal("0.12"), 10)
    cuota_20 = cuota_mensual_amortizacion_francesa(Decimal("200000000"), Decimal("0.12"), 20)
    assert cuota_20 < cuota_10


@pytest.mark.parametrize(
    "relacion,esperado",
    [(Decimal("0.10"), "verde"), (Decimal("0.30"), "verde"), (Decimal("0.31"), "amarillo"),
     (Decimal("0.40"), "amarillo"), (Decimal("0.41"), "rojo")],
)
def test_semaforo_compra_respeta_bandas_de_parte_b1(relacion, esperado):
    semaforo, _ = semaforo_compra(relacion)
    assert semaforo == esperado


@pytest.mark.parametrize(
    "relacion,esperado",
    [(Decimal("0.30"), "verde"), (Decimal("0.31"), "amarillo"), (Decimal("0.35"), "amarillo"),
     (Decimal("0.36"), "rojo")],
)
def test_semaforo_arriendo_respeta_bandas_de_parte_b2(relacion, esperado):
    semaforo, _ = semaforo_arriendo(relacion)
    assert semaforo == esperado
