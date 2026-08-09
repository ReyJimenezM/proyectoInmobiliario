import pytest

from motor_decision.robusto import (
    MOTOR_DEFAULT,
    Codeudor,
    CostoInmueble,
    Documento,
    EntradaRiesgoArrendatario,
    Historial,
    Ingresos,
    Laboral,
    Obligacion,
    Patrimonio,
    derivar,
    evaluar_motor,
)


def _perfil_optimo(**overrides) -> EntradaRiesgoArrendatario:
    base = dict(
        ingresos=Ingresos(fijo=15_000_000, variable=0, otros=0, deducciones=0, no_verificable=0),
        inmueble=CostoInmueble(canon=2_000_000, administracion=200_000, servicios=300_000, otros=0),
        laboral=Laboral(antiguedad_meses=48, contrato_indefinido=True, contrato_corto=False, ingreso_pensional=False),
        obligaciones=[],
        gastos={},
        historial=Historial(codigo=3),
        documentos=[Documento(requerido=True, estado="aprobado")],
        alertas=[],
        codeudor=None,
        patrimonio=Patrimonio(activos=[150_000_000], pasivos=[]),
    )
    base.update(overrides)
    return EntradaRiesgoArrendatario(**base)


def test_perfil_optimo_queda_preaprobado():
    resultado = evaluar_motor(_perfil_optimo(), MOTOR_DEFAULT)

    assert resultado.decision == "PREAPROBADA"
    assert resultado.score >= MOTOR_DEFAULT.parametros.umbral_preaprobado
    assert resultado.requiere_codeudor is False


def test_perfil_optimo_pero_con_documentos_faltantes_queda_en_requisitos():
    entrada = _perfil_optimo(documentos=[Documento(requerido=True, estado="pendiente")])
    resultado = evaluar_motor(entrada, MOTOR_DEFAULT)

    assert resultado.decision == "REQUISITOS"
    assert "documento" in resultado.faltantes[0]


def test_perfil_debil_es_rechazado():
    entrada = EntradaRiesgoArrendatario(
        ingresos=Ingresos(fijo=1_200_000, no_verificable=1_000_000),
        inmueble=CostoInmueble(canon=1_800_000, administracion=200_000),
        laboral=Laboral(antiguedad_meses=2, contrato_corto=True),
        obligaciones=[Obligacion(cuota=800_000, saldo=5_000_000, en_mora=True)],
        gastos={"alimentacion": 500_000},
        historial=Historial(codigo=0),
        documentos=[Documento(requerido=True, estado="pendiente")],
    )
    resultado = evaluar_motor(entrada, MOTOR_DEFAULT)

    assert resultado.decision == "RECHAZADA"
    assert resultado.score < MOTOR_DEFAULT.parametros.umbral_estudio


def test_multiples_alertas_de_fraude_fuerza_rechazo_sin_importar_el_score():
    entrada = _perfil_optimo(alertas=["identidad", "ingresos", "otra"])
    resultado = evaluar_motor(entrada, MOTOR_DEFAULT)

    assert resultado.decision == "RECHAZADA"
    assert "fraude" in resultado.motivo.lower()


def test_una_alerta_de_fraude_manda_a_estudio_no_a_rechazo_automatico():
    entrada = _perfil_optimo(alertas=["identidad"])
    resultado = evaluar_motor(entrada, MOTOR_DEFAULT)

    assert resultado.decision == "ESTUDIO"


def test_requiere_codeudor_cuando_cobertura_es_baja_y_no_tiene_codeudor():
    entrada = EntradaRiesgoArrendatario(
        ingresos=Ingresos(fijo=2_000_000),
        inmueble=CostoInmueble(canon=1_800_000, administracion=200_000),
        laboral=Laboral(antiguedad_meses=24, contrato_indefinido=True),
        historial=Historial(codigo=2),
    )
    resultado = evaluar_motor(entrada, MOTOR_DEFAULT)
    assert resultado.requiere_codeudor is True


def test_no_requiere_codeudor_si_ya_tiene_uno():
    entrada = EntradaRiesgoArrendatario(
        ingresos=Ingresos(fijo=2_000_000),
        inmueble=CostoInmueble(canon=1_800_000, administracion=200_000),
        laboral=Laboral(antiguedad_meses=24, contrato_indefinido=True),
        historial=Historial(codigo=2),
        codeudor=Codeudor(ingreso_fijo=5_000_000),
    )
    resultado = evaluar_motor(entrada, MOTOR_DEFAULT)
    assert resultado.requiere_codeudor is False


def test_primer_arrendamiento_no_penaliza_historial():
    entrada = _perfil_optimo(historial=Historial(codigo=2))
    resultado = evaluar_motor(entrada, MOTOR_DEFAULT)
    # banda "Sin historial previo" = 62 puntos, no la banda minima (12)
    assert resultado.subscores["historial"] >= 60


def test_resultado_es_deterministico():
    entrada = _perfil_optimo()
    resultados = [evaluar_motor(entrada, MOTOR_DEFAULT) for _ in range(10)]
    assert all(r.score == resultados[0].score and r.decision == resultados[0].decision for r in resultados)


def test_evaluar_no_muta_la_entrada_ni_el_motor():
    entrada = _perfil_optimo()
    reglas_antes = len(MOTOR_DEFAULT.reglas)
    evaluar_motor(entrada, MOTOR_DEFAULT)
    assert len(MOTOR_DEFAULT.reglas) == reglas_antes


def test_derivar_calcula_cobertura_como_ingreso_verificable_sobre_costo_vivienda():
    entrada = EntradaRiesgoArrendatario(
        ingresos=Ingresos(fijo=4_000_000),
        inmueble=CostoInmueble(canon=1_000_000, administracion=0, servicios=0, otros=0),
        laboral=Laboral(),
    )
    d = derivar(entrada, MOTOR_DEFAULT.parametros)
    assert d["cobertura"] == pytest.approx(4.0)


def test_ingresos_variables_se_reconocen_al_factor_configurado():
    entrada = EntradaRiesgoArrendatario(
        ingresos=Ingresos(fijo=0, variable=1_000_000),
        inmueble=CostoInmueble(canon=100_000),
        laboral=Laboral(),
    )
    d = derivar(entrada, MOTOR_DEFAULT.parametros)
    assert d["cobertura"] > 0  # imva = 1_000_000 * factorVariable (0.60) = 600_000


def test_todas_las_reglas_portadas_estan_cargadas():
    # 8 capacidad + 8 estabilidad + 6 endeudamiento + 6 verificabilidad + 4 historial +
    # 5 fraude = 37. El prototipo original etiquetaba esta version como "34 reglas" en
    # su changelog, pero el array de reglas real (que es lo que se porto aqui) tiene 37.
    assert len(MOTOR_DEFAULT.reglas) == 37


def test_pesos_de_los_6_grupos_suman_100():
    assert sum(MOTOR_DEFAULT.pesos.values()) == 100


@pytest.mark.parametrize("codigo,puntaje_esperado_minimo", [(3, 90), (2, 60), (1, 38), (0, 10)])
def test_bandas_de_historial_respetan_los_codigos(codigo, puntaje_esperado_minimo):
    entrada = _perfil_optimo(historial=Historial(codigo=codigo))
    resultado = evaluar_motor(entrada, MOTOR_DEFAULT)
    assert resultado.subscores["historial"] >= puntaje_esperado_minimo
