import pytest
from pydantic import ValidationError

from app.schemas.admin import PoliticaCreditoCrearIn

VARIABLES_VALIDAS = [
    {"nombre": "capacidad", "peso": 0.40, "bandas": [{"etiqueta": "alta", "puntaje": 100, "condicion": {}}]},
    {"nombre": "condiciones", "peso": 0.20, "bandas": [{"etiqueta": "alta", "puntaje": 100, "condicion": {}}]},
    {"nombre": "caracter", "peso": 0.25, "bandas": [{"etiqueta": "alta", "puntaje": 100, "condicion": {}}]},
    {"nombre": "garantia", "peso": 0.10, "bandas": [{"etiqueta": "alta", "puntaje": 100, "condicion": {}}]},
    {"nombre": "capital", "peso": 0.05, "bandas": [{"etiqueta": "alta", "puntaje": 100, "condicion": {}}]},
]


def test_politica_con_pesos_que_suman_uno_es_valida():
    politica = PoliticaCreditoCrearIn(
        vertical="compra",
        variables=VARIABLES_VALIDAS,
        bandas_decision={"aprobado_min": 70, "revision_min": 45, "revision_max": 69},
        motivo_cambio="Ajuste de umbrales tras revisión trimestral",
    )
    assert sum(v.peso for v in politica.variables) == pytest.approx(1.0)


def test_politica_con_pesos_que_no_suman_uno_es_invalida():
    variables_invalidas = [{**VARIABLES_VALIDAS[0], "peso": 0.50}] + VARIABLES_VALIDAS[1:]
    with pytest.raises(ValidationError):
        PoliticaCreditoCrearIn(
            vertical="compra",
            variables=variables_invalidas,
            bandas_decision={"aprobado_min": 70, "revision_min": 45, "revision_max": 69},
            motivo_cambio="Ajuste de umbrales tras revisión trimestral",
        )
