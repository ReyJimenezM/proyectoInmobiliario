"""Captura de leads desde la landing y su gestion en el CRM.

Lo que se prueba aqui, ademas del camino feliz, es la regla de visibilidad propia de
este modulo: un lead sin inmobiliaria es una bandeja compartida, pero deja de serlo en
cuanto alguien lo gestiona.
"""
import uuid

import pytest
from sqlalchemy import select

from app.api.leads import limitador_leads
from app.models.auditoria import Auditoria
from app.models.lead import Lead


@pytest.fixture(autouse=True)
def _limitador_leads_limpio():
    """El limitador vive en memoria del proceso y todos los tests comparten la IP del
    TestClient: sin limpiarlo, el test numero once fallaria por el freno anti-bots."""
    limitador_leads.reiniciar()
    yield
    limitador_leads.reiniciar()


def _payload(**cambios) -> dict:
    base = {
        "perfil": "inmobiliaria",
        "nombre": "Carolina Restrepo",
        "correo": "Carolina@Ejemplo.CO",
        "telefono": "3001234567",
        "empresa": "Arrendamientos del Sur",
        "ciudad": "Cali",
        "inmuebles": "21 - 100",
        "origen": "landing-inmobiliaria",
        "utm_campaign": "agosto",
    }
    base.update(cambios)
    return base


def _crear(cliente, **cambios) -> dict:
    respuesta = cliente.post("/api/leads", json=_payload(**cambios))
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()


# ---------------------------------------------------------------------------
# Captura publica
# ---------------------------------------------------------------------------
def test_captura_publica_no_requiere_sesion_y_devuelve_radicado(cliente, sesion):
    cuerpo = _crear(cliente)

    assert cuerpo["codigo"].startswith("LD-")
    # La respuesta no devuelve los datos personales que acaba de recibir.
    assert set(cuerpo) == {"id", "codigo"}

    lead = sesion.get(Lead, uuid.UUID(cuerpo["id"]))
    assert lead.correo == "carolina@ejemplo.co"  # normalizado a minusculas
    assert lead.estado.value == "nuevo"
    assert lead.inmobiliaria_id is None  # entra a la bandeja de la plataforma
    assert lead.utm_campaign == "agosto"


@pytest.mark.parametrize(
    "perfil,interes,esperado",
    [
        ("inmobiliaria", None, "inmobiliaria"),
        ("persona", "Tomar un inmueble en arriendo", "arrendatario"),
        ("persona", "Poner mi inmueble en arriendo", "propietario"),
        ("persona", None, "arrendatario"),
    ],
)
def test_el_tipo_del_crm_se_deriva_del_perfil_y_el_interes(cliente, sesion, perfil, interes, esperado):
    cuerpo = _crear(cliente, perfil=perfil, interes=interes)
    assert sesion.get(Lead, uuid.UUID(cuerpo["id"])).tipo.value == esperado


def test_correo_invalido_no_crea_lead(cliente):
    respuesta = cliente.post("/api/leads", json=_payload(correo="no-es-un-correo"))
    assert respuesta.status_code == 422
    assert respuesta.json()["code"] == "VALIDATION_ERROR"


def test_la_captura_queda_en_auditoria_sin_actor(cliente, sesion):
    cuerpo = _crear(cliente)
    registro = sesion.execute(
        select(Auditoria).where(Auditoria.entidad_id == uuid.UUID(cuerpo["id"]), Auditoria.accion == "capturado")
    ).scalar_one()
    assert registro.actor_id is None
    assert registro.payload_despues["codigo"] == cuerpo["codigo"]


def test_el_freno_por_ip_corta_el_envio_masivo(cliente):
    for _ in range(limitador_leads.max_intentos - 1):
        assert cliente.post("/api/leads", json=_payload()).status_code == 201

    respuesta = cliente.post("/api/leads", json=_payload())
    assert respuesta.status_code == 429
    assert respuesta.json()["code"] == "TOO_MANY_ATTEMPTS"


# ---------------------------------------------------------------------------
# Agendamiento (lo llama la landing cuando Calendly confirma)
# ---------------------------------------------------------------------------
def test_marcar_agendado_es_idempotente(cliente, sesion):
    cuerpo = _crear(cliente)

    assert cliente.post(f"/api/leads/{cuerpo['id']}/agendado").status_code == 204
    lead = sesion.get(Lead, uuid.UUID(cuerpo["id"]))
    sesion.refresh(lead)
    primera_marca = lead.agendado_en
    assert primera_marca is not None

    assert cliente.post(f"/api/leads/{cuerpo['id']}/agendado").status_code == 204
    sesion.refresh(lead)
    assert lead.agendado_en == primera_marca


def test_marcar_agendado_de_un_lead_inexistente_da_404(cliente):
    respuesta = cliente.post("/api/leads/11111111-1111-1111-1111-111111111111/agendado")
    assert respuesta.status_code == 404


# ---------------------------------------------------------------------------
# CRM
# ---------------------------------------------------------------------------
def test_el_listado_exige_sesion(cliente):
    respuesta = cliente.get("/api/admin/leads")
    assert respuesta.status_code == 401
    assert respuesta.json()["code"] == "UNAUTHORIZED"


def test_los_leads_sin_asignar_los_ven_todos_los_tenants(cliente, inmobiliaria_a, inmobiliaria_b):
    cuerpo = _crear(cliente)

    for tenant in (inmobiliaria_a, inmobiliaria_b):
        datos = cliente.get("/api/admin/leads", headers=tenant.cabeceras("asesor")).json()
        assert cuerpo["codigo"] in [lead["codigo"] for lead in datos["leads"]]


def test_gestionar_un_lead_lo_reclama_y_lo_oculta_al_otro_tenant(cliente, inmobiliaria_a, inmobiliaria_b):
    cuerpo = _crear(cliente)

    respuesta = cliente.patch(
        f"/api/admin/leads/{cuerpo['id']}",
        json={"estado": "contactado", "asesor": "Pedro Ríos", "nota": "Le interesa la demo."},
        headers=inmobiliaria_a.cabeceras("asesor"),
    )
    assert respuesta.status_code == 200
    actualizado = respuesta.json()
    assert actualizado["estado"] == "contactado"
    assert actualizado["inmobiliaria_id"] == str(inmobiliaria_a.id)

    visible_a = cliente.get("/api/admin/leads", headers=inmobiliaria_a.cabeceras("asesor")).json()
    assert cuerpo["codigo"] in [lead["codigo"] for lead in visible_a["leads"]]

    visible_b = cliente.get("/api/admin/leads", headers=inmobiliaria_b.cabeceras("asesor")).json()
    assert cuerpo["codigo"] not in [lead["codigo"] for lead in visible_b["leads"]]

    # Y de frente tampoco: "no existe", no "no tienes permiso".
    detalle_b = cliente.get(f"/api/admin/leads/{cuerpo['id']}", headers=inmobiliaria_b.cabeceras("asesor"))
    assert detalle_b.status_code == 404


def test_consulta_puede_leer_pero_no_gestionar(cliente, inmobiliaria_a):
    cuerpo = _crear(cliente)

    assert cliente.get("/api/admin/leads", headers=inmobiliaria_a.cabeceras("consulta")).status_code == 200
    respuesta = cliente.patch(
        f"/api/admin/leads/{cuerpo['id']}",
        json={"estado": "ganado"},
        headers=inmobiliaria_a.cabeceras("consulta"),
    )
    assert respuesta.status_code == 403


def test_la_gestion_queda_en_auditoria_con_el_valor_anterior(cliente, sesion, inmobiliaria_a):
    cuerpo = _crear(cliente)
    cliente.patch(
        f"/api/admin/leads/{cuerpo['id']}",
        json={"estado": "calificado"},
        headers=inmobiliaria_a.cabeceras("admin"),
    )

    registro = sesion.execute(
        select(Auditoria).where(Auditoria.entidad_id == uuid.UUID(cuerpo["id"]), Auditoria.accion == "gestionado")
    ).scalar_one()
    assert registro.payload_antes["estado"] == "nuevo"
    assert registro.payload_despues["estado"] == "calificado"
    assert registro.actor_id == inmobiliaria_a.usuario_id("admin")


def test_el_resumen_cuenta_sobre_el_mismo_filtro_del_listado(cliente, inmobiliaria_a):
    ganado = _crear(cliente, nombre="Lead Ganado")
    cliente.patch(
        f"/api/admin/leads/{ganado['id']}",
        json={"estado": "ganado", "asesor": "Pedro Ríos"},
        headers=inmobiliaria_a.cabeceras("asesor"),
    )
    cliente.post(f"/api/leads/{ganado['id']}/agendado")

    datos = cliente.get(
        "/api/admin/leads?estado=ganado", headers=inmobiliaria_a.cabeceras("asesor")
    ).json()

    assert [lead["estado"] for lead in datos["leads"]] == ["ganado"] * len(datos["leads"])
    assert datos["resumen"]["activos"] == 0
    assert datos["resumen"]["ganados"] == datos["resumen"]["total"]
    assert datos["resumen"]["sin_asignar"] == 0
    assert datos["resumen"]["agendados"] >= 1


def test_filtro_por_tipo(cliente, inmobiliaria_a):
    _crear(cliente, perfil="persona", interes="Poner mi inmueble en arriendo", nombre="Dueña de casa")

    datos = cliente.get(
        "/api/admin/leads?tipo=propietario", headers=inmobiliaria_a.cabeceras("asesor")
    ).json()

    assert datos["leads"]
    assert {lead["tipo"] for lead in datos["leads"]} == {"propietario"}
