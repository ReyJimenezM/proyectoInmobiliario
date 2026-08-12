"""Captura de leads (publica) y gestion del CRM (autenticada).

Regla de tenant, que aqui no puede ser la misma que en el resto de la aplicacion:
la landing publica de la plataforma no sabe a que inmobiliaria pertenece quien deja
sus datos, asi que el lead nace sin `inmobiliaria_id`. Los leads sin asignar son la
bandeja de entrada compartida de la plataforma y los ve todo el staff; en cuanto
alguien los gestiona quedan asignados a su inmobiliaria y desaparecen para las demas.
Un lead ya asignado a otro tenant nunca es visible ni modificable (404, no 403: un 403
confirmaria que existe).
"""
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.deps import requiere_gestion_comercial, requiere_staff, tenant_id_o_none
from app.core.ratelimit import LimitadorIntentos
from app.db.session import get_db
from app.models.enums import ESTADOS_LEAD_CERRADOS, EstadoLead, RolUsuario, TipoLead
from app.models.lead import Lead
from app.models.usuario import Usuario
from app.schemas.lead import (
    LeadActualizarIn,
    LeadCreadoOut,
    LeadCrearIn,
    LeadOut,
    LeadsListaOut,
    LeadsResumenOut,
)
from app.services.auditoria import registrar

router = APIRouter(prefix="/api/leads", tags=["leads"])
router_admin = APIRouter(prefix="/api/admin/leads", tags=["leads"])

#: El formulario es publico y sin sesion: sin freno, una IP puede llenar la tabla.
#: Ventana corta porque un formulario comercial legitimo se envia una vez, no diez.
limitador_leads = LimitadorIntentos(max_intentos=10, ventana_segundos=600, bloqueo_segundos=600)

#: Interes de la landing que delata a un propietario y no a un arrendatario.
_INTERES_PROPIETARIO = "poner mi inmueble en arriendo"


def _ip_de(request: Request) -> str | None:
    reenviada = request.headers.get("x-forwarded-for")
    if reenviada:
        return reenviada.split(",")[0].strip()[:45]
    return request.client.host[:45] if request.client else None


def _tipo_desde_perfil(perfil: str, interes: str | None) -> TipoLead:
    """La landing distingue inmobiliaria de persona; el CRM necesita saber, ademas,
    si esa persona viene a arrendar o a entregar un inmueble en administracion."""
    if perfil == "inmobiliaria":
        return TipoLead.inmobiliaria
    if interes and _INTERES_PROPIETARIO in interes.lower():
        return TipoLead.propietario
    return TipoLead.arrendatario


def _codigo_nuevo(db: Session) -> str:
    """Codigo corto y no correlativo: dos leads seguidos no revelan cuantos hay."""
    for _ in range(5):
        codigo = f"LD-{secrets.token_hex(4).upper()}"
        if db.execute(select(Lead.id).where(Lead.codigo == codigo)).first() is None:
            return codigo
    raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="No se pudo generar el radicado.")


def _ahora() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Publico: la landing
# ---------------------------------------------------------------------------
@router.post("", response_model=LeadCreadoOut, status_code=201)
def crear_lead(payload: LeadCrearIn, request: Request, db: Session = Depends(get_db)) -> Lead:
    ip = _ip_de(request)
    if ip:
        # Aqui cada envio "cuenta" aunque sea valido: no hay acierto que perdonar como
        # en el login. `registrar_fallo` ya lanza si la IP esta bloqueada.
        limitador_leads.registrar_fallo(ip)

    lead = Lead(
        id=uuid.uuid4(),
        codigo=_codigo_nuevo(db),
        inmobiliaria_id=payload.inmobiliaria_id,
        tipo=_tipo_desde_perfil(payload.perfil, payload.interes),
        nombre=payload.nombre.strip(),
        correo=str(payload.correo).lower(),
        telefono=payload.telefono.strip(),
        empresa=payload.empresa or None,
        ciudad=payload.ciudad or None,
        inmuebles=payload.inmuebles or None,
        interes=payload.interes or None,
        mensaje=payload.mensaje or None,
        origen=payload.origen,
        utm_source=payload.utm_source,
        utm_medium=payload.utm_medium,
        utm_campaign=payload.utm_campaign,
        pagina=payload.pagina,
        estado=EstadoLead.nuevo,
        ip_origen=ip,
        user_agent=(request.headers.get("user-agent") or "")[:1000] or None,
    )
    db.add(lead)
    registrar(
        db,
        entidad_tipo="lead",
        entidad_id=lead.id,
        accion="capturado",
        actor_id=None,  # nadie del staff: lo crea la persona desde la landing
        payload_despues={"codigo": lead.codigo, "origen": lead.origen, "tipo": lead.tipo.value},
    )
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/agendado", status_code=204)
def marcar_agendado(lead_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    """Calendly confirmo la reunion. Publico y sin sesion, como el formulario: lo unico
    que hace falta para llamarlo es el UUID del lead, que solo conoce quien acaba de
    enviarlo. No revela nada del lead ni permite cambiar sus datos."""
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="El lead no existe.")
    if lead.agendado_en is not None:
        return  # idempotente: reagendar no duplica la marca

    lead.agendado_en = _ahora()
    lead.ultima_gestion = lead.agendado_en
    registrar(
        db,
        entidad_tipo="lead",
        entidad_id=lead.id,
        accion="agendado",
        actor_id=None,
        payload_despues={"codigo": lead.codigo, "agendado_en": lead.agendado_en.isoformat()},
    )
    db.commit()


# ---------------------------------------------------------------------------
# Backoffice: el CRM
# ---------------------------------------------------------------------------
def _visible_para(usuario: Usuario):
    """Filtro de visibilidad: lo del tenant propio mas la bandeja sin asignar."""
    tenant_id = tenant_id_o_none(usuario)
    if tenant_id is None:  # super_admin: ve todas las inmobiliarias
        return None
    return or_(Lead.inmobiliaria_id == tenant_id, Lead.inmobiliaria_id.is_(None))


def _lead_visible_o_404(lead_id: uuid.UUID, usuario: Usuario, db: Session) -> Lead:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="El lead no existe.")
    if usuario.rol == RolUsuario.super_admin:
        return lead
    if lead.inmobiliaria_id is not None and lead.inmobiliaria_id != usuario.inmobiliaria_id:
        # Mismo mensaje que "no existe": un 403 confirmaria que el lead es real.
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="El lead no existe.")
    return lead


@router_admin.get("", response_model=LeadsListaOut)
def listar_leads(
    estado: EstadoLead | None = None,
    tipo: TipoLead | None = None,
    q: str | None = None,
    usuario: Usuario = Depends(requiere_staff),
    db: Session = Depends(get_db),
) -> LeadsListaOut:
    query = select(Lead).order_by(Lead.creado_en.desc())
    filtro_tenant = _visible_para(usuario)
    if filtro_tenant is not None:
        query = query.where(filtro_tenant)
    if estado is not None:
        query = query.where(Lead.estado == estado)
    if tipo is not None:
        query = query.where(Lead.tipo == tipo)
    if q:
        patron = f"%{q}%"
        query = query.where(
            Lead.nombre.ilike(patron)
            | Lead.correo.ilike(patron)
            | Lead.empresa.ilike(patron)
            | Lead.codigo.ilike(patron)
        )

    leads = list(db.execute(query).scalars().all())
    cerrados = [lead for lead in leads if lead.estado in ESTADOS_LEAD_CERRADOS]
    return LeadsListaOut(
        leads=[LeadOut.model_validate(lead) for lead in leads],
        resumen=LeadsResumenOut(
            total=len(leads),
            activos=len(leads) - len(cerrados),
            ganados=len([lead for lead in cerrados if lead.estado == EstadoLead.ganado]),
            cerrados=len(cerrados),
            sin_asignar=len([lead for lead in leads if not lead.asesor]),
            agendados=len([lead for lead in leads if lead.agendado_en is not None]),
        ),
    )


@router_admin.get("/{lead_id}", response_model=LeadOut)
def obtener_lead(
    lead_id: uuid.UUID, usuario: Usuario = Depends(requiere_staff), db: Session = Depends(get_db)
) -> Lead:
    return _lead_visible_o_404(lead_id, usuario, db)


@router_admin.patch("/{lead_id}", response_model=LeadOut)
def actualizar_lead(
    lead_id: uuid.UUID,
    payload: LeadActualizarIn,
    usuario: Usuario = Depends(requiere_gestion_comercial),
    db: Session = Depends(get_db),
) -> Lead:
    lead = _lead_visible_o_404(lead_id, usuario, db)
    cambios = payload.model_dump(exclude_unset=True)
    if not cambios:
        return lead

    antes = {"estado": lead.estado.value, "asesor": lead.asesor, "nota": lead.nota}

    # Gestionar un lead de la bandeja comun lo reclama para la inmobiliaria de quien
    # lo trabaja: a partir de aqui deja de ser visible para el resto de tenants.
    if lead.inmobiliaria_id is None and usuario.inmobiliaria_id is not None:
        lead.inmobiliaria_id = usuario.inmobiliaria_id

    for campo, valor in cambios.items():
        setattr(lead, campo, valor)
    lead.ultima_gestion = _ahora()

    registrar(
        db,
        entidad_tipo="lead",
        entidad_id=lead.id,
        accion="gestionado",
        actor_id=usuario.id,
        payload_antes=antes,
        payload_despues={
            "estado": lead.estado.value,
            "asesor": lead.asesor,
            "nota": lead.nota,
            "inmobiliaria_id": str(lead.inmobiliaria_id) if lead.inmobiliaria_id else None,
        },
    )
    db.commit()
    db.refresh(lead)
    return lead
