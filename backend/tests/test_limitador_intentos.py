"""Control de intentos de autenticación (app/core/ratelimit.py).

Dos cosas se protegen: que la fuerza bruta se pare, y que el bloqueo no se
convierta en un oráculo que le confirme al atacante cuál era la contraseña buena.
"""
from __future__ import annotations

import pytest

from app.core.errores import DemasiadosIntentos
from app.core.ratelimit import LimitadorIntentos, clave_login, limitador_login
from tests.conftest import PASSWORD


def _login(cliente, email: str, password: str):
    return cliente.post("/api/auth/login", json={"email": email, "password": password})


# ---------------------------------------------------------------------------
# Comportamiento visto desde el login
# ---------------------------------------------------------------------------
def test_los_intentos_fallidos_terminan_bloqueando(cliente, inmobiliaria_a):
    email = inmobiliaria_a.usuarios["analista"]["email"]

    for _ in range(limitador_login.max_intentos - 1):
        assert _login(cliente, email, "clave-mala").status_code == 401

    ultimo = _login(cliente, email, "clave-mala")
    assert ultimo.status_code == 429
    assert ultimo.json()["code"] == "TOO_MANY_ATTEMPTS"


def test_el_bloqueo_alcanza_tambien_al_intento_con_la_contrasena_correcta(cliente, inmobiliaria_a):
    """Si la contraseña buena pasara durante el bloqueo, la respuesta distinta le
    confirmaría al atacante que ya la encontró."""
    email = inmobiliaria_a.usuarios["analista"]["email"]

    for _ in range(limitador_login.max_intentos):
        _login(cliente, email, "clave-mala")

    respuesta = _login(cliente, email, PASSWORD)
    assert respuesta.status_code == 429
    assert "access_token" not in respuesta.text


def test_el_mensaje_dice_cuanto_hay_que_esperar(cliente, inmobiliaria_a):
    email = inmobiliaria_a.usuarios["analista"]["email"]
    for _ in range(limitador_login.max_intentos):
        _login(cliente, email, "clave-mala")

    cuerpo = _login(cliente, email, "clave-mala").json()

    # El detalle estructurado lleva los segundos exactos; el mensaje, la espera
    # redondeada a minutos, que es lo legible para una persona.
    segundos = cuerpo["details"]["reintentar_en_segundos"]
    assert 0 < segundos <= limitador_login.bloqueo_segundos
    assert "Vuelve a intentarlo dentro de" in cuerpo["message"]


def test_el_login_correcto_no_queda_penalizado_por_fallos_previos(cliente, inmobiliaria_a):
    email = inmobiliaria_a.usuarios["analista"]["email"]
    for _ in range(limitador_login.max_intentos - 1):
        _login(cliente, email, "clave-mala")

    assert _login(cliente, email, PASSWORD).status_code == 200


def test_el_bloqueo_es_por_clave_y_no_alcanza_a_otra_cuenta(cliente, inmobiliaria_a, inmobiliaria_b):
    victima = inmobiliaria_a.usuarios["analista"]["email"]
    otro = inmobiliaria_b.usuarios["analista"]["email"]
    for _ in range(limitador_login.max_intentos):
        _login(cliente, victima, "clave-mala")

    assert _login(cliente, otro, PASSWORD).status_code == 200


# ---------------------------------------------------------------------------
# La unidad, sin pasar por HTTP
# ---------------------------------------------------------------------------
def test_un_acierto_previo_al_bloqueo_limpia_el_historial():
    limitador = LimitadorIntentos(max_intentos=3, ventana_segundos=900, bloqueo_segundos=900)

    limitador.registrar_fallo("ana@ejemplo.co")
    limitador.registrar_fallo("ana@ejemplo.co")
    limitador.registrar_exito("ana@ejemplo.co")

    # Si el acierto no hubiese limpiado nada, este tercer fallo bloquearía.
    limitador.registrar_fallo("ana@ejemplo.co")
    limitador.registrar_fallo("ana@ejemplo.co")
    limitador.verificar("ana@ejemplo.co")


def test_los_intentos_caducan_al_pasar_la_ventana():
    """Ventana de 0 s: todo intento anterior queda fuera al registrarse el siguiente."""
    limitador = LimitadorIntentos(max_intentos=2, ventana_segundos=0, bloqueo_segundos=900)

    for _ in range(10):
        limitador.registrar_fallo("ana@ejemplo.co")

    limitador.verificar("ana@ejemplo.co")


def test_la_ventana_se_respeta_manipulando_el_reloj_interno(monkeypatch):
    reloj = {"ahora": 1_000.0}
    monkeypatch.setattr("app.core.ratelimit.time.monotonic", lambda: reloj["ahora"])
    limitador = LimitadorIntentos(max_intentos=3, ventana_segundos=60, bloqueo_segundos=300)

    limitador.registrar_fallo("ana@ejemplo.co")
    limitador.registrar_fallo("ana@ejemplo.co")
    reloj["ahora"] += 61  # los dos fallos anteriores salen de la ventana
    limitador.registrar_fallo("ana@ejemplo.co")
    limitador.registrar_fallo("ana@ejemplo.co")

    limitador.verificar("ana@ejemplo.co")

    # El tercero dentro de la nueva ventana sí bloquea.
    with pytest.raises(DemasiadosIntentos):
        limitador.registrar_fallo("ana@ejemplo.co")


def test_el_bloqueo_expira_cuando_pasa_su_duracion(monkeypatch):
    reloj = {"ahora": 1_000.0}
    monkeypatch.setattr("app.core.ratelimit.time.monotonic", lambda: reloj["ahora"])
    limitador = LimitadorIntentos(max_intentos=2, ventana_segundos=60, bloqueo_segundos=300)

    limitador.registrar_fallo("ana@ejemplo.co")
    with pytest.raises(DemasiadosIntentos):
        limitador.registrar_fallo("ana@ejemplo.co")

    reloj["ahora"] += 301
    limitador.verificar("ana@ejemplo.co")


def test_el_limitador_es_configurable_sin_tocar_el_login():
    """El máximo, la ventana y el bloqueo son parámetros del constructor: cambiar
    la política no exige tocar el endpoint de autenticación."""
    estricto = LimitadorIntentos(max_intentos=2, ventana_segundos=10, bloqueo_segundos=30)

    estricto.registrar_fallo("ana@ejemplo.co")
    with pytest.raises(DemasiadosIntentos) as excepcion:
        estricto.registrar_fallo("ana@ejemplo.co")

    assert excepcion.value.estado_http == 429
    assert excepcion.value.codigo == "TOO_MANY_ATTEMPTS"
    assert excepcion.value.detalles["reintentar_en_segundos"] <= 30


def test_la_clave_de_login_normaliza_el_email_e_incorpora_la_ip():
    assert clave_login("  ANA@Ejemplo.CO ") == "ana@ejemplo.co"
    assert clave_login("ANA@ejemplo.co", "10.0.0.1") == "ana@ejemplo.co|10.0.0.1"
    # Sin normalizar, cambiar mayúsculas bastaría para reiniciar el contador.
    assert clave_login("ana@ejemplo.co", "10.0.0.1") != clave_login("ana@ejemplo.co", "10.0.0.2")


def test_reiniciar_limpia_todas_las_claves():
    limitador = LimitadorIntentos(max_intentos=1, ventana_segundos=60, bloqueo_segundos=60)
    with pytest.raises(DemasiadosIntentos):
        limitador.registrar_fallo("ana@ejemplo.co")

    limitador.reiniciar()

    limitador.verificar("ana@ejemplo.co")
