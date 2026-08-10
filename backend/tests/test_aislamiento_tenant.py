"""Aislamiento entre inmobiliarias y permisos por rol (app/core/deps.py).

Dos reglas distintas que no hay que confundir:

  * Cruzar tenants responde **404**. Un 403 ("esta solicitud no es de tu
    inmobiliaria") confirmaría que el recurso existe y permitiría enumerar ids
    ajenos y medir el volumen de la competencia.
  * Faltar permisos de rol responde **403**. Ahí el recurso sí es visible para
    ese usuario; lo que no está permitido es la acción.
"""
from __future__ import annotations

import uuid
from datetime import timedelta

import pytest

from app.core.security import create_token
from app.models.propietario import Propietario

DECISION = {"decision_final": "aprobada", "comentario": "Perfil apto para el arriendo."}


def _version_motor(version: str) -> dict:
    return {
        "version": version,
        "pesos": {"capacidad": 50.0, "estabilidad": 50.0},
        "parametros": {"umbral_preaprobado": 780.0},
        "reglas": [
            {
                "id": "R-1", "grupo": "capacidad", "tipo": "escala", "prioridad": 1,
                "variable": "cobertura", "operador": ">=", "valor": 3.0, "puntos": 88.0,
                "nombre": "Cobertura holgada", "descripcion": "Cubre 3 veces el costo.",
            }
        ],
        "notas": "Versión creada desde las pruebas de permisos.",
    }


# ---------------------------------------------------------------------------
# Cruzar inmobiliarias: 404, nunca 403
# ---------------------------------------------------------------------------
def test_no_se_puede_leer_una_solicitud_de_otra_inmobiliaria(cliente, inmobiliaria_a, inmobiliaria_b):
    respuesta = cliente.get(
        f"/api/solicitudes/{inmobiliaria_b.solicitud_id}",
        headers=inmobiliaria_a.cabeceras("analista"),
    )

    assert respuesta.status_code == 404
    assert respuesta.status_code != 403
    assert respuesta.json()["code"] == "NOT_FOUND"


def test_no_se_puede_leer_un_propietario_de_otra_inmobiliaria(cliente, inmobiliaria_a, inmobiliaria_b):
    respuesta = cliente.get(
        f"/api/admin/propietarios/{inmobiliaria_b.propietario_id}",
        headers=inmobiliaria_a.cabeceras("analista"),
    )

    assert respuesta.status_code == 404


def test_no_se_puede_modificar_una_propiedad_de_otra_inmobiliaria(cliente, inmobiliaria_a, inmobiliaria_b):
    respuesta = cliente.patch(
        f"/api/propiedades/{inmobiliaria_b.propiedad_id}",
        json={"titulo": "Secuestrada"},
        headers=inmobiliaria_a.cabeceras("analista"),
    )

    assert respuesta.status_code == 404


def test_el_mensaje_de_cruce_es_el_mismo_que_el_de_recurso_inexistente(
    cliente, inmobiliaria_a, inmobiliaria_b
):
    """Si el texto delatara la diferencia, el 404 no serviría de nada."""
    cabeceras = inmobiliaria_a.cabeceras("analista")

    ajeno = cliente.get(f"/api/admin/propietarios/{inmobiliaria_b.propietario_id}", headers=cabeceras)
    inventado = cliente.get(f"/api/admin/propietarios/{uuid.uuid4()}", headers=cabeceras)

    assert ajeno.json()["message"] == inventado.json()["message"]
    assert ajeno.json()["code"] == inventado.json()["code"]


def test_no_se_puede_decidir_sobre_una_solicitud_de_otra_inmobiliaria(
    cliente, inmobiliaria_a, inmobiliaria_b
):
    respuesta = cliente.post(
        f"/api/admin/solicitudes/{inmobiliaria_b.solicitud_id}/decision",
        json=DECISION,
        headers=inmobiliaria_a.cabeceras("analista"),
    )

    assert respuesta.status_code == 404


def test_no_se_pueden_listar_los_hallazgos_de_una_solicitud_ajena(
    cliente, inmobiliaria_a, inmobiliaria_b
):
    respuesta = cliente.get(
        f"/api/admin/solicitudes/{inmobiliaria_b.solicitud_id}/hallazgos",
        headers=inmobiliaria_a.cabeceras("analista"),
    )

    assert respuesta.status_code == 404


def test_no_se_puede_validar_una_solicitud_ajena(cliente, inmobiliaria_a, inmobiliaria_b):
    respuesta = cliente.get(
        f"/api/admin/solicitudes/{inmobiliaria_b.solicitud_id}/validacion",
        headers=inmobiliaria_a.cabeceras("analista"),
    )

    assert respuesta.status_code == 404


# ---------------------------------------------------------------------------
# Listados: nunca se filtra un registro ajeno
# ---------------------------------------------------------------------------
def test_el_listado_de_propietarios_no_filtra_registros_de_otra_inmobiliaria(
    cliente, inmobiliaria_a, inmobiliaria_b
):
    cuerpo = cliente.get(
        "/api/admin/propietarios", headers=inmobiliaria_a.cabeceras("analista")
    ).json()

    tenants = {p["inmobiliaria_id"] for p in cuerpo}
    assert tenants <= {str(inmobiliaria_a.id)}
    assert str(inmobiliaria_b.propietario_id) not in {p["id"] for p in cuerpo}


def test_el_listado_de_propiedades_del_backoffice_solo_trae_las_propias(
    cliente, inmobiliaria_a, inmobiliaria_b
):
    cuerpo = cliente.get(
        "/api/admin/propiedades", headers=inmobiliaria_a.cabeceras("analista")
    ).json()

    ids = {p["id"] for p in cuerpo}
    assert str(inmobiliaria_a.propiedad_id) in ids
    assert str(inmobiliaria_b.propiedad_id) not in ids


def test_el_listado_de_solicitudes_solo_trae_las_propias(cliente, inmobiliaria_a, inmobiliaria_b):
    cuerpo = cliente.get("/api/solicitudes", headers=inmobiliaria_a.cabeceras("analista")).json()

    ids = {s["id"] for s in cuerpo}
    assert str(inmobiliaria_b.solicitud_id) not in ids


def test_el_super_admin_si_atraviesa_las_inmobiliarias(
    cliente, sesion, inmobiliaria_a, inmobiliaria_b
):
    """Contraprueba: si el filtro estuviera roto, el listado del analista se vería
    igual que el del super_admin y las pruebas anteriores no probarían nada."""
    from app.core.security import create_access_token
    from app.models.enums import RolUsuario
    from app.models.usuario import Usuario

    super_admin = Usuario(
        id=uuid.uuid4(),
        email=f"super-{uuid.uuid4().hex[:8]}@plataforma.co",
        password_hash="x",
        rol=RolUsuario.super_admin,
        nombre_completo="Super Admin",
        inmobiliaria_id=None,
    )
    sesion.add(super_admin)
    sesion.commit()
    cabeceras = {"Authorization": f"Bearer {create_access_token(str(super_admin.id), 'super_admin')}"}

    try:
        cuerpo = cliente.get("/api/admin/propietarios", headers=cabeceras).json()
        ids = {p["id"] for p in cuerpo}
        assert {str(inmobiliaria_a.propietario_id), str(inmobiliaria_b.propietario_id)} <= ids
    finally:
        sesion.delete(sesion.get(Usuario, super_admin.id))
        sesion.commit()


# ---------------------------------------------------------------------------
# El tenant sale del token, no del cuerpo
# ---------------------------------------------------------------------------
def test_el_inmobiliaria_id_que_venga_en_el_cuerpo_se_ignora(
    cliente, sesion, inmobiliaria_a, inmobiliaria_b
):
    respuesta = cliente.post(
        "/api/admin/propietarios",
        json={
            "nombre": "Propietario Inyectado",
            "documento": "10203040",
            "inmobiliaria_id": str(inmobiliaria_b.id),  # intento de suplantación
        },
        headers=inmobiliaria_a.cabeceras("analista"),
    )

    assert respuesta.status_code == 201
    creado = respuesta.json()
    assert creado["inmobiliaria_id"] == str(inmobiliaria_a.id)
    assert creado["inmobiliaria_id"] != str(inmobiliaria_b.id)

    sesion.delete(sesion.get(Propietario, uuid.UUID(creado["id"])))
    sesion.commit()


# ---------------------------------------------------------------------------
# Autenticación
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "metodo,ruta",
    [
        ("get", "/api/admin/propietarios"),
        ("get", "/api/admin/propiedades"),
        ("get", "/api/solicitudes"),
        ("get", "/api/admin/motor"),
        ("get", "/api/admin/proveedores"),
    ],
)
def test_el_acceso_anonimo_se_rechaza(cliente, metodo, ruta):
    respuesta = getattr(cliente, metodo)(ruta)

    assert respuesta.status_code in (401, 403)
    assert "inmobiliaria_id" not in respuesta.text


def test_un_token_manipulado_se_rechaza(cliente, inmobiliaria_a):
    valido = inmobiliaria_a.token("analista")
    cabeza, cuerpo, firma = valido.split(".")
    manipulado = f"{cabeza}.{cuerpo}.{'a' * len(firma)}"

    respuesta = cliente.get(
        "/api/admin/propietarios", headers={"Authorization": f"Bearer {manipulado}"}
    )

    assert respuesta.status_code == 401
    assert respuesta.json()["code"] == "UNAUTHORIZED"


def test_un_token_expirado_se_rechaza(cliente, inmobiliaria_a):
    caducado = create_token(
        str(inmobiliaria_a.usuario_id("analista")), "analista", timedelta(minutes=-5), "access"
    )

    respuesta = cliente.get(
        "/api/admin/propietarios", headers={"Authorization": f"Bearer {caducado}"}
    )

    assert respuesta.status_code == 401


def test_un_refresh_token_no_sirve_como_access_token(cliente, inmobiliaria_a):
    refresco = create_token(
        str(inmobiliaria_a.usuario_id("analista")), "analista", timedelta(days=1), "refresh"
    )

    respuesta = cliente.get(
        "/api/admin/propietarios", headers={"Authorization": f"Bearer {refresco}"}
    )

    assert respuesta.status_code == 401


def test_un_token_de_un_usuario_borrado_se_rechaza(cliente):
    respuesta = cliente.get(
        "/api/admin/propietarios",
        headers={"Authorization": f"Bearer {create_token(str(uuid.uuid4()), 'admin', timedelta(minutes=5), 'access')}"},
    )

    assert respuesta.status_code == 401


# ---------------------------------------------------------------------------
# Roles: aquí sí es 403 — el recurso se ve, la acción no se permite
# ---------------------------------------------------------------------------
def test_un_asesor_no_puede_tomar_una_decision_manual(cliente, inmobiliaria_a):
    respuesta = cliente.post(
        f"/api/admin/solicitudes/{inmobiliaria_a.solicitud_id}/decision",
        json=DECISION,
        headers=inmobiliaria_a.cabeceras("asesor"),
    )

    assert respuesta.status_code == 403
    assert respuesta.status_code != 404  # el expediente es de su inmobiliaria: sí existe
    assert respuesta.json()["code"] == "FORBIDDEN"


def test_un_asesor_no_puede_publicar_una_version_del_motor(cliente, inmobiliaria_a):
    respuesta = cliente.post(
        "/api/admin/motor",
        json=_version_motor("v-asesor"),
        headers=inmobiliaria_a.cabeceras("asesor"),
    )

    assert respuesta.status_code == 403


def test_un_asesor_si_puede_leer_lo_de_su_inmobiliaria(cliente, inmobiliaria_a):
    """Contraprueba del 403: el asesor ve el recurso, solo no puede actuar sobre él."""
    respuesta = cliente.get(
        f"/api/admin/propietarios/{inmobiliaria_a.propietario_id}",
        headers=inmobiliaria_a.cabeceras("asesor"),
    )

    assert respuesta.status_code == 200


def test_un_rol_de_consulta_no_puede_crear(cliente, inmobiliaria_a):
    respuesta = cliente.post(
        "/api/admin/propietarios",
        json={"nombre": "Nuevo Propietario", "documento": "99887766"},
        headers=inmobiliaria_a.cabeceras("consulta"),
    )

    assert respuesta.status_code == 403


def test_un_rol_de_consulta_no_puede_decidir(cliente, inmobiliaria_a):
    respuesta = cliente.post(
        f"/api/admin/solicitudes/{inmobiliaria_a.solicitud_id}/decision",
        json=DECISION,
        headers=inmobiliaria_a.cabeceras("consulta"),
    )

    assert respuesta.status_code == 403


def test_un_rol_de_consulta_no_puede_resolver_hallazgos(cliente, inmobiliaria_a):
    respuesta = cliente.patch(
        f"/api/admin/hallazgos/{uuid.uuid4()}/resolver",
        json={"nota": "Verificado con el solicitante."},
        headers=inmobiliaria_a.cabeceras("consulta"),
    )

    # 403 por rol antes de mirar si el hallazgo existe: el permiso se evalúa primero.
    assert respuesta.status_code == 403


def test_un_rol_de_consulta_si_puede_leer(cliente, inmobiliaria_a):
    respuesta = cliente.get(
        "/api/admin/propietarios", headers=inmobiliaria_a.cabeceras("consulta")
    )

    assert respuesta.status_code == 200


def test_un_solicitante_no_entra_al_backoffice(cliente, inmobiliaria_a):
    respuesta = cliente.get(
        "/api/admin/propietarios", headers=inmobiliaria_a.cabeceras("solicitante")
    )

    assert respuesta.status_code == 403


def test_un_solicitante_no_ve_la_solicitud_de_otro(cliente, inmobiliaria_a, inmobiliaria_b):
    respuesta = cliente.get(
        f"/api/solicitudes/{inmobiliaria_b.solicitud_id}",
        headers=inmobiliaria_a.cabeceras("solicitante"),
    )

    assert respuesta.status_code == 404


def test_el_analista_si_puede_decidir_sobre_lo_suyo(cliente, inmobiliaria_a):
    """El 403 del asesor no puede ser un 403 para todo el mundo: el analista llega
    hasta la lógica de negocio (y ahí falla por no haber evaluación previa, 409)."""
    respuesta = cliente.post(
        f"/api/admin/solicitudes/{inmobiliaria_a.solicitud_id}/decision",
        json=DECISION,
        headers=inmobiliaria_a.cabeceras("analista"),
    )

    assert respuesta.status_code == 409
    assert "evaluación automática" in respuesta.json()["message"]
