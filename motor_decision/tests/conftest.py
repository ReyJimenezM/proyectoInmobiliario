import pytest

from motor_decision import (
    BandasDecision,
    BandaVariable,
    Capacidad,
    Capital,
    Caracter,
    Condiciones,
    EntradaEvaluacion,
    Garantia,
    Politica,
    VariablePolitica,
)

CONDICIONES_LABORALES = [
    BandaVariable("alta", 100, {"tipo_ocupacion_in": ["indefinido"], "antiguedad_meses_min": 12}),
    BandaVariable("media", 60, {"tipo_ocupacion_in": ["termino_fijo", "independiente", "pensionado"]}),
    BandaVariable("baja", 20, {}),
]
CARACTER_REFERENCIAS = [
    BandaVariable("alta", 100, {"referencias_verificadas_min": 2}),
    BandaVariable("media", 55, {"referencias_verificadas_min": 1}),
    BandaVariable("baja", 10, {}),
]
GARANTIA_CODEUDOR_POLIZA = [
    BandaVariable("alta", 100, {"codeudor_ingresos_min": 1_000_000}),
    BandaVariable("media", 50, {"tiene_poliza_equals": True}),
    BandaVariable("baja", 0, {}),
]
CAPITAL_AHORROS = [
    BandaVariable("alta", 100, {"monto_ahorros_min": 5_000_000}),
    BandaVariable("media", 50, {"monto_ahorros_min": 1}),
    BandaVariable("baja", 0, {}),
]


@pytest.fixture
def politica_compra_v1() -> Politica:
    return Politica(
        politica_version_id="pol-compra-v1",
        vertical="compra",
        variables=[
            VariablePolitica("capacidad", 0.40, [
                BandaVariable("alta", 100, {"ratio_max": 0.30}),
                BandaVariable("media", 65, {"ratio_max": 0.35}),
                BandaVariable("baja", 30, {"ratio_max": 0.45}),
                BandaVariable("cero", 0, {}),
            ]),
            VariablePolitica("condiciones", 0.20, CONDICIONES_LABORALES),
            VariablePolitica("caracter", 0.25, CARACTER_REFERENCIAS),
            VariablePolitica("garantia", 0.10, GARANTIA_CODEUDOR_POLIZA),
            VariablePolitica("capital", 0.05, CAPITAL_AHORROS),
        ],
        bandas_decision=BandasDecision(aprobado_min=70, revision_min=45, revision_max=69),
    )


@pytest.fixture
def politica_arriendo_v1() -> Politica:
    return Politica(
        politica_version_id="pol-arriendo-v1",
        vertical="arriendo",
        variables=[
            VariablePolitica("capacidad", 0.40, [
                BandaVariable("alta", 100, {"ratio_max": 0.30}),
                BandaVariable("media", 55, {"ratio_max": 0.35}),
                BandaVariable("baja", 0, {}),
            ]),
            VariablePolitica("condiciones", 0.20, CONDICIONES_LABORALES),
            VariablePolitica("caracter", 0.25, CARACTER_REFERENCIAS),
            VariablePolitica("garantia", 0.10, GARANTIA_CODEUDOR_POLIZA),
            VariablePolitica("capital", 0.05, CAPITAL_AHORROS),
        ],
        bandas_decision=BandasDecision(aprobado_min=70, revision_min=45, revision_max=69),
    )


def hacer_entrada(
    vertical="compra",
    cuota_o_canon=1_500_000,
    ingresos_mensuales=6_000_000,
    tipo_ocupacion="indefinido",
    antiguedad_meses=24,
    ref_laboral=True,
    ref_personal=True,
    tiene_codeudor=True,
    codeudor_ingresos=3_000_000,
    tiene_poliza=False,
    tiene_ahorros=True,
    monto_ahorros=6_000_000,
) -> EntradaEvaluacion:
    return EntradaEvaluacion(
        solicitud_id="sol-1",
        vertical=vertical,
        capacidad=Capacidad(cuota_o_canon=cuota_o_canon, ingresos_mensuales=ingresos_mensuales),
        condiciones=Condiciones(tipo_ocupacion=tipo_ocupacion, antiguedad_meses=antiguedad_meses),
        caracter=Caracter(referencia_laboral_verificada=ref_laboral, referencia_personal_verificada=ref_personal),
        garantia=Garantia(tiene_codeudor=tiene_codeudor, codeudor_ingresos=codeudor_ingresos, tiene_poliza=tiene_poliza),
        capital=Capital(tiene_ahorros=tiene_ahorros, monto_ahorros=monto_ahorros),
    )
