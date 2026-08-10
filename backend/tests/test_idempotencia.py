"""Idempotencia de operaciones irreversibles (app/core/idempotencia.py).

El módulo todavía no está enganchado a ningún endpoint, así que se prueba como lo
que es: un servicio sobre `registros_idempotencia`. Lo que aquí se fija es el
contrato que los endpoints heredarán cuando lo usen.
"""
from __future__ import annotations

import uuid

import pytest

from app.core.errores import ConflictoIdempotencia
from app.core.idempotencia import LONGITUD_MAXIMA_CLAVE, Idempotencia, clave_idempotencia


@pytest.fixture
def clave() -> str:
    """Una clave nueva por prueba: la tabla es compartida por toda la sesión."""
    return f"clave-{uuid.uuid4()}"


# ---------------------------------------------------------------------------
# Huella
# ---------------------------------------------------------------------------
def test_la_huella_es_estable_para_la_misma_peticion():
    recurso = uuid.uuid4()

    primera = Idempotencia.huella("evaluar", recurso, {"monto": 100})
    segunda = Idempotencia.huella("evaluar", recurso, {"monto": 100})

    assert primera == segunda


def test_la_huella_no_depende_del_orden_de_las_claves_del_payload():
    recurso = uuid.uuid4()

    directo = Idempotencia.huella("evaluar", recurso, {"a": 1, "b": 2, "c": {"x": 1, "y": 2}})
    invertido = Idempotencia.huella("evaluar", recurso, {"c": {"y": 2, "x": 1}, "b": 2, "a": 1})

    assert directo == invertido


def test_la_huella_cambia_si_cambia_el_contenido():
    recurso = uuid.uuid4()
    base = Idempotencia.huella("evaluar", recurso, {"monto": 100})

    assert Idempotencia.huella("evaluar", recurso, {"monto": 101}) != base
    assert Idempotencia.huella("aprobar", recurso, {"monto": 100}) != base
    assert Idempotencia.huella("evaluar", uuid.uuid4(), {"monto": 100}) != base


def test_la_huella_de_una_peticion_sin_cuerpo_es_valida():
    huella = Idempotencia.huella("cancelar", uuid.uuid4())

    assert isinstance(huella, str) and len(huella) == 64


# ---------------------------------------------------------------------------
# Reserva y recuperación
# ---------------------------------------------------------------------------
def test_la_primera_reserva_devuelve_none_y_deja_la_clave_tomada(sesion, clave, inmobiliaria_a):
    huella = Idempotencia.huella("evaluar", uuid.uuid4(), {"monto": 1})

    primera = Idempotencia.recuperar_o_reservar(sesion, clave, "evaluar", huella, inmobiliaria_a.id)
    segunda = Idempotencia.recuperar_o_reservar(sesion, clave, "evaluar", huella, inmobiliaria_a.id)

    assert primera is None
    # La segunda encuentra la reserva; sigue sin respuesta porque nadie guardó aún.
    assert segunda is None


def test_el_reintento_devuelve_la_respuesta_guardada_sin_reejecutar(sesion, clave, inmobiliaria_a):
    huella = Idempotencia.huella("evaluar", uuid.uuid4(), {"monto": 1})
    Idempotencia.recuperar_o_reservar(sesion, clave, "evaluar", huella, inmobiliaria_a.id)
    Idempotencia.guardar(
        sesion, clave, "evaluar", huella, inmobiliaria_a.id,
        respuesta={"decision": "APROBADA"}, estado_http=200,
    )

    reintento = Idempotencia.recuperar_o_reservar(sesion, clave, "evaluar", huella, inmobiliaria_a.id)

    assert reintento == {"decision": "APROBADA"}


def test_reusar_la_clave_para_otra_operacion_es_un_conflicto(sesion, clave, inmobiliaria_a):
    huella_original = Idempotencia.huella("evaluar", uuid.uuid4(), {"monto": 1})
    Idempotencia.recuperar_o_reservar(sesion, clave, "evaluar", huella_original, inmobiliaria_a.id)

    huella_otra = Idempotencia.huella("aprobar", uuid.uuid4(), {"monto": 999})
    with pytest.raises(ConflictoIdempotencia) as excepcion:
        Idempotencia.recuperar_o_reservar(sesion, clave, "aprobar", huella_otra, inmobiliaria_a.id)

    assert excepcion.value.estado_http == 409
    assert excepcion.value.codigo == "IDEMPOTENCY_CONFLICT"
    assert excepcion.value.detalles["operacion_previa"] == "evaluar"


def test_reusar_la_clave_con_otro_cuerpo_de_la_misma_operacion_tambien_es_conflicto(
    sesion, clave, inmobiliaria_a
):
    recurso = uuid.uuid4()
    Idempotencia.recuperar_o_reservar(
        sesion, clave, "evaluar", Idempotencia.huella("evaluar", recurso, {"monto": 1}),
        inmobiliaria_a.id,
    )

    with pytest.raises(ConflictoIdempotencia):
        Idempotencia.recuperar_o_reservar(
            sesion, clave, "evaluar", Idempotencia.huella("evaluar", recurso, {"monto": 2}),
            inmobiliaria_a.id,
        )


def test_guardar_con_otra_huella_tambien_es_conflicto(sesion, clave, inmobiliaria_a):
    recurso = uuid.uuid4()
    huella = Idempotencia.huella("evaluar", recurso, {"monto": 1})
    Idempotencia.recuperar_o_reservar(sesion, clave, "evaluar", huella, inmobiliaria_a.id)

    with pytest.raises(ConflictoIdempotencia):
        Idempotencia.guardar(
            sesion, clave, "evaluar", Idempotencia.huella("evaluar", recurso, {"monto": 2}),
            inmobiliaria_a.id, respuesta={"decision": "APROBADA"},
        )


# ---------------------------------------------------------------------------
# Aislamiento y unicidad
# ---------------------------------------------------------------------------
def test_la_clave_no_cruza_inmobiliarias(sesion, clave, inmobiliaria_a, inmobiliaria_b):
    """La misma cadena en dos tenants son dos operaciones sin relación entre sí."""
    recurso = uuid.uuid4()
    huella_a = Idempotencia.huella("evaluar", recurso, {"monto": 1})
    Idempotencia.recuperar_o_reservar(sesion, clave, "evaluar", huella_a, inmobiliaria_a.id)
    Idempotencia.guardar(
        sesion, clave, "evaluar", huella_a, inmobiliaria_a.id, respuesta={"quien": "A"},
    )

    # En B la clave está libre: ni conflicto ni respuesta prestada de A.
    huella_b = Idempotencia.huella("aprobar", recurso, {"monto": 999})
    reservada_en_b = Idempotencia.recuperar_o_reservar(
        sesion, clave, "aprobar", huella_b, inmobiliaria_b.id
    )

    assert reservada_en_b is None
    assert Idempotencia.recuperar_o_reservar(
        sesion, clave, "evaluar", huella_a, inmobiliaria_a.id
    ) == {"quien": "A"}


def test_dos_claves_distintas_son_operaciones_distintas(sesion, inmobiliaria_a):
    huella = Idempotencia.huella("evaluar", uuid.uuid4(), {"monto": 1})
    clave_uno, clave_dos = f"k-{uuid.uuid4()}", f"k-{uuid.uuid4()}"

    Idempotencia.recuperar_o_reservar(sesion, clave_uno, "evaluar", huella, inmobiliaria_a.id)
    Idempotencia.guardar(
        sesion, clave_uno, "evaluar", huella, inmobiliaria_a.id, respuesta={"n": 1}
    )

    # Mismo efecto, clave nueva: se ejecuta otra vez (devuelve None, no la respuesta previa).
    assert Idempotencia.recuperar_o_reservar(
        sesion, clave_dos, "evaluar", huella, inmobiliaria_a.id
    ) is None


def test_sin_clave_no_hay_idempotencia(sesion, inmobiliaria_a):
    huella = Idempotencia.huella("evaluar", uuid.uuid4(), {"monto": 1})

    assert Idempotencia.recuperar_o_reservar(sesion, None, "evaluar", huella, inmobiliaria_a.id) is None
    assert Idempotencia.recuperar_o_reservar(sesion, "", "evaluar", huella, inmobiliaria_a.id) is None
    # `guardar` sin clave no persiste nada y no revienta.
    Idempotencia.guardar(sesion, None, "evaluar", huella, inmobiliaria_a.id, respuesta={"n": 1})


# ---------------------------------------------------------------------------
# La dependencia que lee la cabecera
# ---------------------------------------------------------------------------
def test_la_cabecera_se_limpia_y_se_recorta():
    assert clave_idempotencia(None) is None
    assert clave_idempotencia("   ") is None
    assert clave_idempotencia("  abc  ") == "abc"
    assert len(clave_idempotencia("x" * 500)) == LONGITUD_MAXIMA_CLAVE
