import dataclasses

import pytest

from motor_decision import EntradaEvaluacion, evaluar
from motor_decision.reglas import BandaNoEncontradaError, evaluar_banda
from motor_decision.schemas import BandaVariable
from tests.conftest import hacer_entrada


def test_perfil_optimo_es_aprobado_con_score_100(politica_compra_v1):
    entrada = hacer_entrada(vertical="compra")
    resultado = evaluar(entrada, politica_compra_v1)

    assert resultado.score == pytest.approx(100.0)
    assert resultado.decision == "aprobada"
    assert resultado.ruta_alterna is None


def test_perfil_debil_es_rechazado_con_ruta_alterna(politica_compra_v1):
    entrada = hacer_entrada(
        vertical="compra", cuota_o_canon=4_000_000, ingresos_mensuales=6_000_000,
        tipo_ocupacion="otro", antiguedad_meses=3, ref_laboral=False, ref_personal=False,
        tiene_codeudor=False, codeudor_ingresos=0, tiene_poliza=False,
        tiene_ahorros=False, monto_ahorros=0,
    )
    resultado = evaluar(entrada, politica_compra_v1)

    assert resultado.score == pytest.approx(6.5)
    assert resultado.decision == "rechazada"
    assert resultado.ruta_alterna is not None
    assert resultado.ruta_alterna.disponible is True
    assert "agregar_codeudor" in resultado.ruta_alterna.sugerencias


def test_perfil_intermedio_queda_en_revision_manual(politica_compra_v1):
    entrada = hacer_entrada(
        vertical="compra", cuota_o_canon=1_920_000, ingresos_mensuales=6_000_000,  # ratio 0.32
        tipo_ocupacion="indefinido", antiguedad_meses=24,
        ref_laboral=True, ref_personal=False,  # 1 referencia -> media
        tiene_codeudor=False, codeudor_ingresos=0, tiene_poliza=False,
        tiene_ahorros=False, monto_ahorros=0,
    )
    resultado = evaluar(entrada, politica_compra_v1)

    assert resultado.score == pytest.approx(59.75)
    assert resultado.decision == "revision_manual"
    assert resultado.ruta_alterna.disponible is True


def test_resultado_es_deterministico_para_el_mismo_input_y_politica(politica_compra_v1):
    entrada = hacer_entrada(vertical="compra")

    resultados = [evaluar(entrada, politica_compra_v1) for _ in range(20)]

    assert all(r == resultados[0] for r in resultados)


def test_evaluar_es_puro_no_muta_ni_politica_ni_entrada(politica_compra_v1):
    entrada = hacer_entrada(vertical="compra")
    politica_antes = dataclasses.replace(politica_compra_v1)

    evaluar(entrada, politica_compra_v1)

    assert politica_compra_v1 == politica_antes


def test_vertical_de_politica_debe_coincidir_con_vertical_de_solicitud(politica_arriendo_v1):
    entrada = hacer_entrada(vertical="compra")

    with pytest.raises(ValueError):
        evaluar(entrada, politica_arriendo_v1)


def test_arriendo_usa_umbrales_de_capacidad_distintos_a_compra(politica_compra_v1, politica_arriendo_v1):
    # ratio 0.32: en compra cae en banda media (puntaje 65); en arriendo tambien media (55)
    # pero con puntaje distinto porque las bandas de arriendo son mas estrictas.
    entrada_compra = hacer_entrada(vertical="compra", cuota_o_canon=1_920_000, ingresos_mensuales=6_000_000)
    entrada_arriendo = hacer_entrada(vertical="arriendo", cuota_o_canon=1_920_000, ingresos_mensuales=6_000_000)

    resultado_compra = evaluar(entrada_compra, politica_compra_v1)
    resultado_arriendo = evaluar(entrada_arriendo, politica_arriendo_v1)

    capacidad_compra = next(v for v in resultado_compra.variables_evaluadas if v.nombre == "capacidad")
    capacidad_arriendo = next(v for v in resultado_arriendo.variables_evaluadas if v.nombre == "capacidad")

    assert capacidad_compra.puntaje_obtenido == 65
    assert capacidad_arriendo.puntaje_obtenido == 55


def test_explicacion_nunca_es_un_codigo_de_error_generico(politica_compra_v1):
    entrada = hacer_entrada(
        vertical="compra", cuota_o_canon=4_000_000, ingresos_mensuales=6_000_000,
        ref_laboral=False, ref_personal=False, tiene_codeudor=False, codeudor_ingresos=0,
    )
    resultado = evaluar(entrada, politica_compra_v1)

    assert resultado.explicacion_generada
    assert "error" not in resultado.explicacion_generada.lower()
    assert len(resultado.explicacion_generada) > 20


def test_entrada_evaluacion_no_tiene_slots_para_variables_discriminatorias():
    campos = {f.name for f in dataclasses.fields(EntradaEvaluacion)}
    prohibidos = {
        "genero", "estado_civil", "orientacion_sexual", "religion",
        "afiliacion_politica", "estado_salud", "etnia", "nacionalidad",
        "barrio", "estrato",
    }
    assert campos.isdisjoint(prohibidos)
    assert campos == {"solicitud_id", "vertical", "capacidad", "condiciones", "caracter", "garantia", "capital"}


def test_evaluar_banda_falla_explicitamente_si_no_hay_banda_catch_all():
    bandas_sin_default = [BandaVariable("alta", 100, {"ratio_max": 0.30})]

    with pytest.raises(BandaNoEncontradaError):
        evaluar_banda({"ratio": 0.99}, bandas_sin_default)


@pytest.mark.parametrize(
    "ratio,puntaje_esperado",
    [(0.10, 100), (0.30, 100), (0.31, 65), (0.35, 65), (0.36, 30), (0.45, 30), (0.46, 0)],
)
def test_bandas_de_capacidad_compra_respetan_los_umbrales_de_la_politica(
    politica_compra_v1, ratio, puntaje_esperado
):
    ingresos = 10_000_000
    entrada = hacer_entrada(vertical="compra", cuota_o_canon=ratio * ingresos, ingresos_mensuales=ingresos)

    resultado = evaluar(entrada, politica_compra_v1)
    capacidad = next(v for v in resultado.variables_evaluadas if v.nombre == "capacidad")

    assert capacidad.puntaje_obtenido == puntaje_esperado
