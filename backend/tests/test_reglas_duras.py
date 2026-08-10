"""Capa 3 del motor: reglas duras que vencen al puntaje.

`motor_decision/robusto/reglas_duras.py` y `robusto/evaluar.py`.

La tesis que se prueba: el scorecard mide riesgo relativo, las reglas duras
expresan hechos binarios. Ninguna cantidad de puntos compensa un hecho.
"""
from __future__ import annotations

from datetime import date

import pytest

from motor_decision.robusto import (
    MOTOR_DEFAULT,
    BLOQUEANTE,
    REVISION,
    Codeudor,
    ContextoReglasDuras,
    CostoInmueble,
    Documento,
    EntradaRiesgoArrendatario,
    Historial,
    Ingresos,
    Laboral,
    Obligacion,
    Patrimonio,
    decision_por_reglas_duras,
    evaluar_motor,
    evaluar_reglas_duras,
    regla_gobernante,
)
from motor_decision.robusto.reglas_duras import (
    DECISION_INCOMPLETA,
    DECISION_RECHAZADA,
    DECISION_REVISION_MANUAL,
)

HOY = date(2026, 8, 10)


@pytest.fixture
def perfil_excelente() -> EntradaRiesgoArrendatario:
    """Perfil deliberadamente inmejorable: score por encima de 900.

    Cobertura 4x, endeudamiento 8 %, ingreso 100 % verificable, tres años de
    antigüedad con contrato indefinido, historial de arriendo limpio y ningún
    documento pendiente.
    """
    return EntradaRiesgoArrendatario(
        ingresos=Ingresos(fijo=12_000_000, no_verificable=0),
        inmueble=CostoInmueble(canon=3_000_000),
        laboral=Laboral(antiguedad_meses=60, contrato_indefinido=True),
        obligaciones=[Obligacion(cuota=1_000_000, saldo=10_000_000)],
        historial=Historial(codigo=3),
        patrimonio=Patrimonio(activos=[200_000_000], pasivos=[]),
        documentos=[Documento(requerido=True, estado="aprobado")],
    )


def _evaluar(entrada, contexto=None):
    return evaluar_motor(entrada, MOTOR_DEFAULT, contexto)


# ---------------------------------------------------------------------------
# Punto de partida: el perfil realmente puntúa alto
# ---------------------------------------------------------------------------
def test_el_perfil_de_referencia_supera_los_900_puntos(perfil_excelente):
    resultado = _evaluar(perfil_excelente)

    assert resultado.score >= 900
    assert resultado.decision == "PREAPROBADA"


# ---------------------------------------------------------------------------
# El puntaje no vence a la regla dura
# ---------------------------------------------------------------------------
def test_fraude_confirmado_rechaza_aunque_el_score_pase_de_900(perfil_excelente):
    resultado = _evaluar(perfil_excelente, ContextoReglasDuras(fraude_confirmado=True))

    assert resultado.score >= 900  # el puntaje se conserva: es información para el analista
    assert resultado.decision == "RECHAZADA"
    assert resultado.decision_driver == "REGLA_DURA"
    assert "HR-04" in resultado.motivo


def test_menor_de_edad_rechaza_aunque_el_score_pase_de_900(perfil_excelente):
    contexto = ContextoReglasDuras(fecha_nacimiento=date(2012, 1, 1))

    disparadas = evaluar_reglas_duras(contexto, hoy=HOY)
    assert [r.codigo for r in disparadas] == ["HR-06"]
    assert decision_por_reglas_duras(disparadas) == DECISION_RECHAZADA

    resultado = _evaluar(perfil_excelente, contexto)
    assert resultado.decision == "RECHAZADA"
    assert resultado.score >= 900


def test_el_dia_del_cumpleanos_dieciocho_ya_no_es_menor():
    justo_18 = date(HOY.year - 18, HOY.month, HOY.day)

    assert evaluar_reglas_duras(ContextoReglasDuras(fecha_nacimiento=justo_18), hoy=HOY) == []
    un_dia_menos = date(justo_18.year, justo_18.month, justo_18.day + 1)
    assert [r.codigo for r in evaluar_reglas_duras(
        ContextoReglasDuras(fecha_nacimiento=un_dia_menos), hoy=HOY
    )] == ["HR-06"]


# ---------------------------------------------------------------------------
# Falta de información ≠ mal perfil
# ---------------------------------------------------------------------------
def test_documento_obligatorio_faltante_deja_la_solicitud_incompleta_no_rechazada(perfil_excelente):
    """Nadie se rechaza por no haber subido un papel: falta información."""
    contexto = ContextoReglasDuras(documentos_obligatorios_faltantes=2)

    resultado = _evaluar(perfil_excelente, contexto)

    assert resultado.decision == "INCOMPLETA"
    assert resultado.decision != "RECHAZADA"
    assert resultado.decision_driver == "REGLA_DURA"
    assert "HR-02" in resultado.motivo


def test_documento_faltante_no_gana_al_fraude_confirmado(perfil_excelente):
    """Prioridad: rechazo > incompleta > revisión."""
    contexto = ContextoReglasDuras(fraude_confirmado=True, documentos_obligatorios_faltantes=2)

    assert _evaluar(perfil_excelente, contexto).decision == "RECHAZADA"


# ---------------------------------------------------------------------------
# Revisión manual
# ---------------------------------------------------------------------------
def test_identidad_sin_validar_manda_a_revision_manual(perfil_excelente):
    contexto = ContextoReglasDuras(identidad_verificada=False)

    disparadas = evaluar_reglas_duras(contexto, hoy=HOY)
    assert [(r.codigo, r.severidad) for r in disparadas] == [("HR-01", REVISION)]

    resultado = _evaluar(perfil_excelente, contexto)
    assert resultado.decision == "REVISION_MANUAL"
    assert resultado.decision_driver == "REGLA_DURA"


@pytest.mark.parametrize(
    "contexto,codigo",
    [
        (ContextoReglasDuras(alertas_fraude=2), "HR-05"),
        (ContextoReglasDuras(situacion_juridica_sin_resolver=True), "HR-08"),
        (ContextoReglasDuras(campos_invalidos=1), "HR-09"),
        (ContextoReglasDuras(campos_faltantes=3), "HR-10"),
    ],
)
def test_las_reglas_de_revision_nunca_aprueban_en_automatico(perfil_excelente, contexto, codigo):
    resultado = _evaluar(perfil_excelente, contexto)

    assert resultado.decision == "REVISION_MANUAL"
    assert codigo in {r["codigo"] for r in resultado.reglas_duras}


def test_dos_campos_faltantes_todavia_no_disparan_la_regla_de_datos():
    assert evaluar_reglas_duras(ContextoReglasDuras(campos_faltantes=2), hoy=HOY) == []


@pytest.mark.parametrize(
    "contexto,codigo",
    [
        (ContextoReglasDuras(documento_critico_rechazado=True), "HR-03"),
        (ContextoReglasDuras(titularidad_sin_resolver=True), "HR-07"),
    ],
)
def test_las_bloqueantes_sin_codigo_de_rechazo_van_a_revision_manual(contexto, codigo):
    disparadas = evaluar_reglas_duras(contexto, hoy=HOY)

    assert [r.codigo for r in disparadas] == [codigo]
    assert disparadas[0].severidad == BLOQUEANTE
    assert decision_por_reglas_duras(disparadas) == DECISION_REVISION_MANUAL


# ---------------------------------------------------------------------------
# Driver de la decisión
# ---------------------------------------------------------------------------
def test_sin_reglas_duras_el_driver_es_el_puntaje(perfil_excelente):
    sin_contexto = _evaluar(perfil_excelente)
    contexto_neutro = _evaluar(perfil_excelente, ContextoReglasDuras())

    assert sin_contexto.decision_driver == "PUNTAJE"
    assert contexto_neutro.decision_driver == "PUNTAJE"
    assert contexto_neutro.reglas_duras == []


def test_con_reglas_duras_el_driver_es_la_regla(perfil_excelente):
    resultado = _evaluar(perfil_excelente, ContextoReglasDuras(fraude_confirmado=True))

    assert resultado.decision_driver == "REGLA_DURA"


def test_un_contexto_vacio_no_cambia_la_decision_del_puntaje(perfil_excelente):
    con_puntaje = _evaluar(perfil_excelente)
    con_contexto_neutro = _evaluar(perfil_excelente, ContextoReglasDuras())

    assert con_puntaje.decision == con_contexto_neutro.decision
    assert con_puntaje.score == con_contexto_neutro.score


# ---------------------------------------------------------------------------
# Trazabilidad
# ---------------------------------------------------------------------------
def test_las_reglas_disparadas_quedan_trazables_en_el_resultado(perfil_excelente):
    contexto = ContextoReglasDuras(
        fraude_confirmado=True, documentos_obligatorios_faltantes=1, identidad_verificada=False
    )

    resultado = _evaluar(perfil_excelente, contexto)

    codigos = [r["codigo"] for r in resultado.reglas_duras]
    assert {"HR-04", "HR-02", "HR-01"} <= set(codigos)
    for regla in resultado.reglas_duras:
        assert set(regla) == {"codigo", "titulo", "severidad", "detalle"}
        assert regla["severidad"] in (BLOQUEANTE, REVISION)
    # Las bloqueantes van antes que las de revisión: la primera explica la decisión.
    assert codigos.index("HR-04") < codigos.index("HR-01")


def test_la_regla_gobernante_es_la_que_explica_la_decision():
    disparadas = evaluar_reglas_duras(
        ContextoReglasDuras(documentos_obligatorios_faltantes=1, identidad_verificada=False),
        hoy=HOY,
    )

    gobernante = regla_gobernante(disparadas)

    assert gobernante.codigo == "HR-02"
    assert decision_por_reglas_duras(disparadas) == DECISION_INCOMPLETA


def test_sin_reglas_no_hay_ni_decision_forzada_ni_gobernante():
    assert decision_por_reglas_duras([]) is None
    assert regla_gobernante([]) is None


def test_el_motivo_explica_la_regla_en_lenguaje_natural(perfil_excelente):
    resultado = _evaluar(perfil_excelente, ContextoReglasDuras(documentos_obligatorios_faltantes=3))

    assert "Documento obligatorio faltante" in resultado.motivo
    assert "El puntaje no puede superar esta condición." in resultado.motivo


# ---------------------------------------------------------------------------
# Probabilidad de incumplimiento: no se inventa
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "contexto",
    [
        None,
        ContextoReglasDuras(),
        ContextoReglasDuras(fraude_confirmado=True),
        ContextoReglasDuras(documentos_obligatorios_faltantes=1),
        ContextoReglasDuras(identidad_verificada=False),
    ],
)
def test_la_probabilidad_de_incumplimiento_nunca_se_inventa(perfil_excelente, contexto):
    resultado = _evaluar(perfil_excelente, contexto)

    assert resultado.probabilidad_incumplimiento is None
    assert resultado.pd_disponible is False
    assert "no está disponible" in resultado.pd_nota
    assert "El puntaje no es una probabilidad." in resultado.pd_nota


def test_un_perfil_debil_tampoco_recibe_una_probabilidad():
    debil = EntradaRiesgoArrendatario(
        ingresos=Ingresos(fijo=1_200_000, no_verificable=1_000_000),
        inmueble=CostoInmueble(canon=2_500_000, administracion=300_000),
        laboral=Laboral(antiguedad_meses=2, contrato_corto=True),
        obligaciones=[Obligacion(cuota=800_000, en_mora=True)],
        historial=Historial(codigo=0),
        alertas=["identidad", "ingresos"],
        codeudor=Codeudor(),
    )

    resultado = _evaluar(debil)

    assert resultado.decision == "RECHAZADA"
    assert resultado.decision_driver == "PUNTAJE"
    assert resultado.probabilidad_incumplimiento is None
    assert resultado.pd_disponible is False
