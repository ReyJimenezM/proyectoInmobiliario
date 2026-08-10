"""Máquina de estados de la solicitud (app/services/flujo.py).

El workflow es explícito: nadie asigna `solicitud.estado` a mano. Aquí se fija
qué saltos existen, cuáles no, y que ninguno pase sin dejar rastro.
"""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy import func, select

from app.core.errores import EstadoInvalido
from app.models.auditoria import Auditoria
from app.models.enums import EstadoSolicitud, Vertical
from app.models.solicitud import Solicitud
from app.services.flujo import (
    ESTADOS_EDITABLES,
    ESTADOS_FINALES,
    TRANSICIONES,
    es_final,
    transiciones_permitidas,
    transicionar,
    verificar_editable,
)

TODAS_LAS_TRANSICIONES = [
    (origen, destino) for origen, destinos in TRANSICIONES.items() for destino in sorted(destinos)
]


@pytest.fixture
def nueva_solicitud(sesion, inmobiliaria_a):
    """Fábrica de solicitudes desechables en el estado que pida la prueba."""
    creadas: list[Solicitud] = []

    def _crear(estado: str | EstadoSolicitud = EstadoSolicitud.borrador) -> Solicitud:
        solicitud = Solicitud(
            id=uuid.uuid4(),
            solicitante_id=inmobiliaria_a.usuario_id("solicitante"),
            propiedad_id=inmobiliaria_a.propiedad_id,
            inmobiliaria_id=inmobiliaria_a.id,
            vertical=Vertical.arriendo,
            estado=EstadoSolicitud(estado) if isinstance(estado, str) else estado,
        )
        sesion.add(solicitud)
        sesion.flush()
        creadas.append(solicitud)
        return solicitud

    yield _crear
    for solicitud in creadas:
        sesion.delete(solicitud)
    sesion.flush()


def _contar_auditoria(sesion, solicitud: Solicitud) -> int:
    return sesion.scalar(
        select(func.count()).select_from(Auditoria).where(Auditoria.entidad_id == solicitud.id)
    )


# ---------------------------------------------------------------------------
# El grafo
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("origen,destino", TODAS_LAS_TRANSICIONES)
def test_cada_transicion_permitida_funciona(sesion, nueva_solicitud, origen, destino):
    solicitud = nueva_solicitud(origen)

    transicionar(sesion, solicitud, EstadoSolicitud(destino), actor_id=None)

    assert solicitud.estado == EstadoSolicitud(destino)


def test_una_transicion_no_permitida_lanza_estado_invalido(sesion, nueva_solicitud):
    solicitud = nueva_solicitud(EstadoSolicitud.borrador)

    with pytest.raises(EstadoInvalido) as excepcion:
        transicionar(sesion, solicitud, EstadoSolicitud.aprobada, actor_id=None)

    error = excepcion.value
    assert error.codigo == "TRANSICION_INVALIDA"
    assert error.detalles["desde"] == "borrador"
    assert error.detalles["hacia"] == "aprobada"
    assert error.detalles["permitidas"] == ["cancelada", "enviada"]
    # El estado no se movió: el error no puede dejar el expediente a medias.
    assert solicitud.estado == EstadoSolicitud.borrador


def test_el_detalle_del_error_dice_que_si_se_podia_hacer(sesion, nueva_solicitud):
    solicitud = nueva_solicitud(EstadoSolicitud.enviada)

    with pytest.raises(EstadoInvalido) as excepcion:
        transicionar(sesion, solicitud, EstadoSolicitud.incompleta, actor_id=None)

    assert set(excepcion.value.detalles["permitidas"]) == {"en_evaluacion", "cancelada"}


@pytest.mark.parametrize("estado", sorted(ESTADOS_FINALES))
def test_los_estados_finales_no_tienen_salida(estado):
    assert transiciones_permitidas(estado) == set()


@pytest.mark.parametrize("estado", sorted(ESTADOS_FINALES))
def test_desde_un_estado_final_no_sale_ninguna_transicion(sesion, nueva_solicitud, estado):
    solicitud = nueva_solicitud(estado)

    for destino in EstadoSolicitud:
        if destino.value == estado:
            continue
        with pytest.raises(EstadoInvalido):
            transicionar(sesion, solicitud, destino, actor_id=None)


def test_es_final_reconoce_los_estados_cerrados(sesion, nueva_solicitud):
    assert es_final(nueva_solicitud(EstadoSolicitud.aprobada))
    assert es_final(nueva_solicitud(EstadoSolicitud.rechazada))
    assert es_final(nueva_solicitud(EstadoSolicitud.cancelada))
    assert not es_final(nueva_solicitud(EstadoSolicitud.en_evaluacion))


def test_revision_manual_puede_volver_a_incompleta(sesion, nueva_solicitud):
    """Es la salida de "solicitar información adicional": sin ella se le pedían
    datos a alguien que no podía cargarlos, porque el wizard estaba bloqueado."""
    assert "incompleta" in transiciones_permitidas("revision_manual")

    solicitud = nueva_solicitud(EstadoSolicitud.revision_manual)
    transicionar(sesion, solicitud, EstadoSolicitud.incompleta, actor_id=None)

    assert solicitud.estado == EstadoSolicitud.incompleta
    # Y desde ahí el solicitante puede completar y reenviar.
    verificar_editable(solicitud)
    assert "enviada" in transiciones_permitidas(solicitud.estado)


def test_con_ruta_alterna_tambien_puede_pedir_informacion(sesion, nueva_solicitud):
    solicitud = nueva_solicitud(EstadoSolicitud.con_ruta_alterna)

    transicionar(sesion, solicitud, EstadoSolicitud.incompleta, actor_id=None)

    assert solicitud.estado == EstadoSolicitud.incompleta


def test_todos_los_estados_del_enum_estan_en_el_grafo():
    """Si se agrega un estado al enum y no al grafo, queda sin transiciones y nadie
    se entera hasta que un expediente se atasca en producción."""
    assert {e.value for e in EstadoSolicitud} == set(TRANSICIONES)


# ---------------------------------------------------------------------------
# Editabilidad
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("estado", ["borrador", "incompleta"])
def test_verificar_editable_permite_borrador_e_incompleta(nueva_solicitud, estado):
    verificar_editable(nueva_solicitud(estado))


@pytest.mark.parametrize(
    "estado",
    sorted({e.value for e in EstadoSolicitud} - set(ESTADOS_EDITABLES)),
)
def test_verificar_editable_bloquea_el_resto(nueva_solicitud, estado):
    with pytest.raises(EstadoInvalido) as excepcion:
        verificar_editable(nueva_solicitud(estado))

    assert excepcion.value.codigo == "SOLICITUD_NO_EDITABLE"
    assert excepcion.value.detalles["desde"] == estado
    assert set(excepcion.value.detalles["permitidas"]) == set(ESTADOS_EDITABLES)


# ---------------------------------------------------------------------------
# Auditoría
# ---------------------------------------------------------------------------
def test_toda_transicion_deja_registro_en_auditoria(sesion, nueva_solicitud, inmobiliaria_a):
    solicitud = nueva_solicitud(EstadoSolicitud.borrador)
    actor = inmobiliaria_a.usuario_id("analista")

    transicionar(sesion, solicitud, EstadoSolicitud.enviada, actor, motivo="wizard completo")
    sesion.flush()

    entrada = sesion.execute(
        select(Auditoria).where(Auditoria.entidad_id == solicitud.id)
    ).scalar_one()
    assert entrada.entidad_tipo == "solicitud"
    assert entrada.accion == "estado_cambiado"
    assert entrada.actor_id == actor
    assert entrada.payload_antes == {"estado": "borrador"}
    assert entrada.payload_despues == {"estado": "enviada", "motivo": "wizard completo"}


def test_una_cadena_de_transiciones_deja_una_entrada_por_salto(sesion, nueva_solicitud):
    solicitud = nueva_solicitud(EstadoSolicitud.borrador)

    transicionar(sesion, solicitud, EstadoSolicitud.enviada, actor_id=None)
    transicionar(sesion, solicitud, EstadoSolicitud.en_evaluacion, actor_id=None)
    transicionar(sesion, solicitud, EstadoSolicitud.revision_manual, actor_id=None)
    sesion.flush()

    assert _contar_auditoria(sesion, solicitud) == 3


def test_transicionar_al_mismo_estado_es_idempotente_y_no_audita(sesion, nueva_solicitud):
    solicitud = nueva_solicitud(EstadoSolicitud.en_evaluacion)
    antes = _contar_auditoria(sesion, solicitud)

    transicionar(sesion, solicitud, EstadoSolicitud.en_evaluacion, actor_id=None)
    sesion.flush()

    assert solicitud.estado == EstadoSolicitud.en_evaluacion
    assert _contar_auditoria(sesion, solicitud) == antes


def test_una_transicion_rechazada_no_deja_rastro(sesion, nueva_solicitud):
    solicitud = nueva_solicitud(EstadoSolicitud.aprobada)
    antes = _contar_auditoria(sesion, solicitud)

    with pytest.raises(EstadoInvalido):
        transicionar(sesion, solicitud, EstadoSolicitud.enviada, actor_id=None)
    sesion.flush()

    assert _contar_auditoria(sesion, solicitud) == antes


def test_transicionar_acepta_el_estado_como_cadena(sesion, nueva_solicitud):
    """Los llamadores pasan a veces el valor plano; el servicio lo normaliza al enum."""
    solicitud = nueva_solicitud(EstadoSolicitud.borrador)

    transicionar(sesion, solicitud, "enviada", actor_id=None)

    assert solicitud.estado == EstadoSolicitud.enviada
