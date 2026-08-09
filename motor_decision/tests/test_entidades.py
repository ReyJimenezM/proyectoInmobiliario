import pytest

from motor_decision.robusto import OWNER_COMPS, PROP_COMPS, match_risk, nivel_riesgo, score_componentes


def test_score_componentes_perfectos_da_1000():
    componentes = {clave: 100 for clave, _, _ in OWNER_COMPS}
    assert score_componentes(componentes, OWNER_COMPS) == 1000


def test_score_componentes_todos_en_cero_da_cero():
    componentes = {clave: 0 for clave, _, _ in PROP_COMPS}
    assert score_componentes(componentes, PROP_COMPS) == 0


def test_score_componentes_pondera_segun_definicion():
    # Solo el componente de mayor peso (titularidad=25) al maximo, el resto en 0.
    componentes = {"titularidad": 100}
    score = score_componentes(componentes, OWNER_COMPS)
    assert score == pytest.approx(round(100 * 25 / 100 * 10))  # 250


@pytest.mark.parametrize(
    "score,nivel_esperado",
    [(1000, "Bajo riesgo"), (780, "Bajo riesgo"), (779, "Riesgo moderado"),
     (660, "Riesgo moderado"), (520, "Riesgo alto"), (0, "Riesgo crítico")],
)
def test_nivel_riesgo_respeta_umbrales(score, nivel_esperado):
    assert nivel_riesgo(score) == nivel_esperado


def test_match_risk_perfil_optimo_es_alta_compatibilidad():
    resultado = match_risk(tenant_score=900, prop_score=900, cobertura=3.5, ratio_endeudamiento=0.10)
    assert resultado.nivel == "Alta compatibilidad"
    assert resultado.puntaje == 100  # 40+30+20+10


def test_match_risk_perfil_debil_es_baja_compatibilidad():
    resultado = match_risk(tenant_score=100, prop_score=100, cobertura=0.5, ratio_endeudamiento=0.9)
    assert resultado.nivel == "Baja compatibilidad"
    assert resultado.puntaje == 12  # 6+4+2+0


def test_match_risk_es_determinista():
    a = match_risk(700, 700, 2.2, 0.3)
    b = match_risk(700, 700, 2.2, 0.3)
    assert a == b


def test_match_risk_inmueble_debil_penaliza_aunque_arrendatario_sea_fuerte():
    fuerte_ambos = match_risk(tenant_score=900, prop_score=900, cobertura=2.2, ratio_endeudamiento=0.3)
    inmueble_debil = match_risk(tenant_score=900, prop_score=100, cobertura=2.2, ratio_endeudamiento=0.3)
    assert inmueble_debil.puntaje < fuerte_ambos.puntaje
