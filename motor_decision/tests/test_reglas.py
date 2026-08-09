import pytest

from motor_decision.reglas import (
    BandaNoEncontradaError,
    _condicion_cumple,
    hechos_caracter,
    hechos_capacidad,
    hechos_capital,
    hechos_condiciones,
    hechos_garantia,
)
from motor_decision.schemas import Capacidad, Capital, Caracter, Condiciones, Garantia


def test_condicion_min_max_in_equals():
    assert _condicion_cumple({"x": 5}, {"x_min": 5}) is True
    assert _condicion_cumple({"x": 4}, {"x_min": 5}) is False
    assert _condicion_cumple({"x": 5}, {"x_max": 5}) is True
    assert _condicion_cumple({"x": 6}, {"x_max": 5}) is False
    assert _condicion_cumple({"x": "a"}, {"x_in": ["a", "b"]}) is True
    assert _condicion_cumple({"x": "c"}, {"x_in": ["a", "b"]}) is False
    assert _condicion_cumple({"x": True}, {"x_equals": True}) is True
    assert _condicion_cumple({"x": False}, {"x_equals": True}) is False


def test_condicion_vacia_siempre_cumple():
    assert _condicion_cumple({}, {}) is True
    assert _condicion_cumple({"cualquier_cosa": 1}, {}) is True


def test_condicion_multiples_claves_es_and_logico():
    condicion = {"tipo_ocupacion_in": ["indefinido"], "antiguedad_meses_min": 12}
    assert _condicion_cumple({"tipo_ocupacion": "indefinido", "antiguedad_meses": 12}, condicion) is True
    assert _condicion_cumple({"tipo_ocupacion": "indefinido", "antiguedad_meses": 5}, condicion) is False


def test_operador_no_soportado_lanza_error():
    with pytest.raises(ValueError):
        _condicion_cumple({"x": 1}, {"x_desconocido": 1})


def test_hechos_capacidad_con_ingresos_cero_da_ratio_infinito():
    hechos = hechos_capacidad(Capacidad(cuota_o_canon=1_000_000, ingresos_mensuales=0))
    assert hechos["ratio"] == float("inf")


def test_hechos_caracter_cuenta_referencias_verificadas():
    assert hechos_caracter(Caracter(True, True))["referencias_verificadas"] == 2
    assert hechos_caracter(Caracter(True, False))["referencias_verificadas"] == 1
    assert hechos_caracter(Caracter(None, None))["referencias_verificadas"] == 0


def test_hechos_capital_sin_ahorros_da_monto_cero_aunque_venga_un_monto():
    hechos = hechos_capital(Capital(tiene_ahorros=False, monto_ahorros=10_000_000))
    assert hechos["monto_ahorros"] == 0


def test_hechos_garantia_normaliza_codeudor_ingresos_none_a_cero():
    hechos = hechos_garantia(Garantia(tiene_codeudor=False, tiene_poliza=False, codeudor_ingresos=None))
    assert hechos["codeudor_ingresos"] == 0


def test_hechos_condiciones_expone_tipo_ocupacion_y_antiguedad():
    hechos = hechos_condiciones(Condiciones(tipo_ocupacion="independiente", antiguedad_meses=8))
    assert hechos == {"tipo_ocupacion": "independiente", "antiguedad_meses": 8}
