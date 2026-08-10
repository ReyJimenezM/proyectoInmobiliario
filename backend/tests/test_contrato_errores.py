"""Contrato de error y de correlación (app/main.py).

Lo que se protege aquí: que el frontend pueda tratar *cualquier* error con un
único parser, que el usuario pueda leer el mensaje, y que soporte pueda pasar de
la pantalla al log con un solo identificador.
"""
from __future__ import annotations

import pytest

from tests.conftest import MENSAJE_SECRETO

CLAVES_DEL_SOBRE = {"code", "message", "details", "request_id"}


def _sobre_valido(cuerpo: dict) -> bool:
    return set(cuerpo) == CLAVES_DEL_SOBRE and isinstance(cuerpo["details"], dict)


# ---------------------------------------------------------------------------
# Cabeceras de correlación
# ---------------------------------------------------------------------------
def test_respuesta_de_exito_trae_cabeceras_de_correlacion(cliente):
    respuesta = cliente.get("/api/health")

    assert respuesta.status_code == 200
    assert respuesta.headers["X-Request-ID"]
    assert float(respuesta.headers["X-Response-Time-ms"]) >= 0


def test_respuesta_de_error_trae_cabeceras_de_correlacion(cliente):
    respuesta = cliente.get("/api/no-existe-esta-ruta")

    assert respuesta.status_code == 404
    assert respuesta.headers["X-Request-ID"]
    assert float(respuesta.headers["X-Response-Time-ms"]) >= 0


def test_request_id_del_cuerpo_coincide_con_el_de_la_cabecera(cliente):
    respuesta = cliente.get("/api/_pruebas/dominio")

    assert respuesta.json()["request_id"] == respuesta.headers["X-Request-ID"]


def test_se_respeta_el_request_id_que_manda_el_cliente(cliente):
    mio = "traza-del-frontend-123"

    respuesta = cliente.get("/api/_pruebas/dominio", headers={"X-Request-ID": mio})

    assert respuesta.headers["X-Request-ID"] == mio
    assert respuesta.json()["request_id"] == mio


def test_dos_peticiones_sin_request_id_reciben_identificadores_distintos(cliente):
    primera = cliente.get("/api/health").headers["X-Request-ID"]
    segunda = cliente.get("/api/health").headers["X-Request-ID"]

    assert primera != segunda


# ---------------------------------------------------------------------------
# Un solo sobre para todos los errores
# ---------------------------------------------------------------------------
def test_el_404_usa_el_sobre_uniforme(cliente):
    respuesta = cliente.get("/api/no-existe-esta-ruta")

    cuerpo = respuesta.json()
    assert _sobre_valido(cuerpo)
    assert cuerpo["code"] == "NOT_FOUND"
    assert cuerpo["message"] == "El recurso solicitado no existe."


def test_el_error_de_dominio_usa_el_mismo_sobre(cliente):
    respuesta = cliente.get("/api/_pruebas/dominio")

    cuerpo = respuesta.json()
    assert respuesta.status_code == 404
    assert _sobre_valido(cuerpo)
    assert cuerpo["code"] == "NOT_FOUND"
    assert cuerpo["details"] == {"pista": "es a propósito"}


def test_el_error_de_esquema_usa_el_mismo_sobre(cliente):
    respuesta = cliente.post("/api/auth/login", json={})

    cuerpo = respuesta.json()
    assert respuesta.status_code == 422
    assert _sobre_valido(cuerpo)
    assert cuerpo["code"] == "VALIDATION_ERROR"


def test_los_tres_errores_comparten_exactamente_la_misma_forma(cliente):
    formas = {
        tuple(sorted(cliente.get("/api/no-existe-esta-ruta").json())),
        tuple(sorted(cliente.get("/api/_pruebas/dominio").json())),
        tuple(sorted(cliente.post("/api/auth/login", json={}).json())),
    }

    assert len(formas) == 1


# ---------------------------------------------------------------------------
# El 422 se le muestra al usuario final
# ---------------------------------------------------------------------------
def test_el_422_no_menciona_pydantic_ni_tipos_internos(cliente):
    respuesta = cliente.post("/api/auth/login", json={"email": 12, "password": None})

    crudo = respuesta.text.lower()
    for jerga in ("pydantic", "value_error", "string_type", "type=", "url=", "traceback"):
        assert jerga not in crudo


def test_el_422_habla_en_espanol_y_senala_los_campos(cliente):
    respuesta = cliente.post("/api/auth/login", json={})

    cuerpo = respuesta.json()
    assert cuerpo["message"] == (
        "Hay datos incompletos o con un formato incorrecto. Revisa los campos marcados."
    )
    campos = {e["campo"] for e in cuerpo["details"]["errores"]}
    assert {"email", "password"} <= campos
    for error in cuerpo["details"]["errores"]:
        assert error["mensaje"] == "Este campo es obligatorio."


def test_el_422_no_arrastra_los_nombres_internos_de_ubicacion(cliente):
    """El cliente mandó `email`, no `body.email`: eso es interno del framework."""
    respuesta = cliente.post("/api/auth/login", json={})

    campos = {e["campo"] for e in respuesta.json()["details"]["errores"]}
    assert not any(c.startswith("body") for c in campos)


# ---------------------------------------------------------------------------
# Todo mensaje que ve el usuario va en español
# ---------------------------------------------------------------------------
def test_el_401_por_falta_de_credenciales_usa_el_sobre(cliente):
    respuesta = cliente.get("/api/admin/propietarios")

    cuerpo = respuesta.json()
    assert respuesta.status_code == 401
    assert _sobre_valido(cuerpo)
    assert cuerpo["code"] == "UNAUTHORIZED"


# Regresion: HTTPBearer levanta HTTPException(401, detail="Not authenticated"), un texto
# que NO coincide con la frase estandar de Starlette para 401 ("Unauthorized"). Antes se
# tomaba por mensaje propio del endpoint y se reenviaba en ingles al usuario final, que es
# justo el error mas frecuente: la sesion caducada. Se corrigio con DETALLES_DEL_FRAMEWORK
# en app/main.py.
def test_el_401_por_falta_de_credenciales_habla_en_espanol(cliente):
    respuesta = cliente.get("/api/admin/propietarios")

    assert respuesta.json()["message"] == "Necesitas iniciar sesión para continuar."


def test_ningun_mensaje_de_error_generico_viene_del_framework_en_ingles(cliente):
    """Contraste: el 404 y el 405 sí se traducen; el 401 anónimo es la excepción."""
    assert cliente.get("/api/no-existe").json()["message"] == "El recurso solicitado no existe."
    assert cliente.delete("/api/health").json()["message"] == (
        "Esa operación no está disponible en esta dirección."
    )


# ---------------------------------------------------------------------------
# El 500 no filtra nada
# ---------------------------------------------------------------------------
def test_el_500_no_filtra_la_excepcion_ni_la_traza(cliente_sin_relanzar):
    respuesta = cliente_sin_relanzar.get("/api/_pruebas/explota")

    assert respuesta.status_code == 500
    crudo = respuesta.text
    assert MENSAJE_SECRETO not in crudo
    assert "RuntimeError" not in crudo
    assert "Traceback" not in crudo
    assert "conftest.py" not in crudo


def test_el_500_usa_el_sobre_y_devuelve_el_identificador_para_soporte(cliente_sin_relanzar):
    respuesta = cliente_sin_relanzar.get("/api/_pruebas/explota")

    cuerpo = respuesta.json()
    assert _sobre_valido(cuerpo)
    assert cuerpo["code"] == "INTERNAL_ERROR"
    assert cuerpo["message"] == "Ocurrió un error inesperado. Inténtalo de nuevo en unos minutos."
    # Sin este identificador el usuario no tiene con qué reportar el fallo.
    assert cuerpo["request_id"] == respuesta.headers["X-Request-ID"]


def test_el_500_tambien_trae_las_cabeceras_de_correlacion(cliente_sin_relanzar):
    respuesta = cliente_sin_relanzar.get("/api/_pruebas/explota")

    assert respuesta.headers["X-Request-ID"]
    assert float(respuesta.headers["X-Response-Time-ms"]) >= 0
