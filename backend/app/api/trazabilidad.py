"""Trazabilidad del expediente para el backoffice.

Expone lo que el motor y los analistas dejan registrado: hallazgos abiertos y
resueltos, historial de estados, autorizaciones de habeas data, outcomes reales del
contrato y el estado de configuración de los proveedores externos.

Todo pasa por auth de staff y por el alcance de la inmobiliaria: un analista solo ve
expedientes de su tenant; el super_admin ve todos (ver ``tenant_id_o_none``).
"""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import requiere_analista_o_admin, requiere_staff, tenant_id_o_none
from app.db.session import get_db
from app.integraciones import estado_proveedores
from app.models.solicitud import Solicitud
from app.models.trazabilidad import (
    TIPOS_OUTCOME,
    Consentimiento,
    EventoConsistencia,
    HistorialEstadoSolicitud,
    ResultadoRiesgo,
)
from app.models.usuario import Usuario
from app.schemas.trazabilidad import (
    ConsentimientoOut,
    HallazgoOut,
    HistorialEstadoOut,
    OutcomeIn,
    OutcomeOut,
    ProveedorEstadoOut,
    ResolverHallazgoIn,
)
from app.services import auditoria as servicio_auditoria
from app.services import trazabilidad as servicio

router = APIRouter(prefix="/api/admin", tags=["trazabilidad"])


def _solicitud_del_tenant(db: Session, solicitud_id: uuid.UUID, usuario: Usuario) -> Solicitud:
    """Carga la solicitud respetando el alcance del usuario.

    Fuera de alcance responde 404 y no 403: un 403 confirmaría que el expediente
    existe en otra inmobiliaria.
    """
    solicitud = db.get(Solicitud, solicitud_id)
    if solicitud is None:
        raise HTTPException(404, "Solicitud no encontrada")
    tenant_id = tenant_id_o_none(usuario)
    if tenant_id is not None and solicitud.inmobiliaria_id != tenant_id:
        raise HTTPException(404, "Solicitud no encontrada")
    return solicitud


# ---------------------------------------------------------------------------
# Hallazgos de consistencia
# ---------------------------------------------------------------------------
@router.get("/solicitudes/{solicitud_id}/hallazgos", response_model=list[HallazgoOut])
def listar_hallazgos(
    solicitud_id: uuid.UUID,
    resuelto: bool | None = Query(default=None, description="Filtra por estado de resolución"),
    usuario: Usuario = Depends(requiere_staff),
    db: Session = Depends(get_db),
) -> list[EventoConsistencia]:
    """Hallazgos del expediente, abiertos y cerrados, con su nota de resolución."""
    _solicitud_del_tenant(db, solicitud_id, usuario)
    consulta = select(EventoConsistencia).where(EventoConsistencia.solicitud_id == solicitud_id)
    if resuelto is not None:
        consulta = consulta.where(EventoConsistencia.resuelto.is_(resuelto))
    # Lo más grave y lo más reciente primero: es el orden en que un analista trabaja.
    consulta = consulta.order_by(
        EventoConsistencia.resuelto.asc(),
        EventoConsistencia.severidad.desc(),
        EventoConsistencia.creado_en.desc(),
    )
    return list(db.execute(consulta).scalars().all())


@router.patch("/hallazgos/{evento_id}/resolver", response_model=HallazgoOut)
def resolver_hallazgo(
    evento_id: uuid.UUID,
    datos: ResolverHallazgoIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> EventoConsistencia:
    """Cierra un hallazgo con justificación. Queda auditado quién lo cerró y por qué."""
    evento = db.get(EventoConsistencia, evento_id)
    if evento is None:
        raise HTTPException(404, "Hallazgo no encontrado")
    _solicitud_del_tenant(db, evento.solicitud_id, usuario)
    if evento.resuelto:
        raise HTTPException(409, "El hallazgo ya fue resuelto")

    servicio.resolver_hallazgo(db, evento_id, usuario.id, datos.nota)
    servicio_auditoria.registrar(
        db,
        entidad_tipo="evento_consistencia",
        entidad_id=evento.id,
        accion="resolver_hallazgo",
        actor_id=usuario.id,
        payload_despues={
            "solicitud_id": str(evento.solicitud_id),
            "codigo_comprobacion": evento.codigo_comprobacion,
            "severidad": evento.severidad,
            "nota": datos.nota,
        },
    )
    db.commit()
    db.refresh(evento)
    return evento


# ---------------------------------------------------------------------------
# Historial de estados
# ---------------------------------------------------------------------------
@router.get("/solicitudes/{solicitud_id}/historial-estados", response_model=list[HistorialEstadoOut])
def listar_historial_estados(
    solicitud_id: uuid.UUID,
    usuario: Usuario = Depends(requiere_staff),
    db: Session = Depends(get_db),
) -> list[HistorialEstadoSolicitud]:
    """Quién movió el expediente, de qué estado a cuál y con qué motivo."""
    _solicitud_del_tenant(db, solicitud_id, usuario)
    return list(
        db.execute(
            select(HistorialEstadoSolicitud)
            .where(HistorialEstadoSolicitud.solicitud_id == solicitud_id)
            .order_by(HistorialEstadoSolicitud.creado_en.asc())
        )
        .scalars()
        .all()
    )


# ---------------------------------------------------------------------------
# Consentimientos (habeas data)
# ---------------------------------------------------------------------------
@router.get("/solicitudes/{solicitud_id}/consentimientos", response_model=list[ConsentimientoOut])
def listar_consentimientos(
    solicitud_id: uuid.UUID,
    usuario: Usuario = Depends(requiere_staff),
    db: Session = Depends(get_db),
) -> list[Consentimiento]:
    """Autorizaciones asociadas al expediente, con su evidencia y vigencia."""
    _solicitud_del_tenant(db, solicitud_id, usuario)
    return list(
        db.execute(
            select(Consentimiento)
            .where(Consentimiento.solicitud_id == solicitud_id)
            .order_by(Consentimiento.otorgado_en.desc())
        )
        .scalars()
        .all()
    )


# ---------------------------------------------------------------------------
# Outcomes: lo que realmente pasó con el contrato
# ---------------------------------------------------------------------------
@router.post("/solicitudes/{solicitud_id}/outcomes", response_model=OutcomeOut, status_code=201)
def registrar_outcome(
    solicitud_id: uuid.UUID,
    datos: OutcomeIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> ResultadoRiesgo:
    """Registra un resultado real del contrato (mora, restitución, pago puntual...).

    Es información posterior a la decisión: alimenta el reentrenamiento, nunca la
    evaluación que la originó.
    """
    _solicitud_del_tenant(db, solicitud_id, usuario)
    if datos.tipo not in TIPOS_OUTCOME:
        raise HTTPException(422, f"Tipo de outcome inválido. Admitidos: {', '.join(TIPOS_OUTCOME)}")
    if datos.ocurrido_en > date.today():
        raise HTTPException(422, "Un outcome no puede ocurrir en el futuro")

    outcome = servicio.registrar_outcome(
        db,
        solicitud_id=solicitud_id,
        tipo=datos.tipo,
        ocurrido_en=datos.ocurrido_en,
        evaluacion_id=datos.evaluacion_id,
        dias_mora=datos.dias_mora,
        monto=datos.monto,
        notas=datos.notas,
        registrado_por=usuario.id,
    )
    servicio_auditoria.registrar(
        db,
        entidad_tipo="resultado_riesgo",
        entidad_id=outcome.id,
        accion="registrar_outcome",
        actor_id=usuario.id,
        payload_despues={
            "solicitud_id": str(solicitud_id),
            "tipo": datos.tipo,
            "ocurrido_en": datos.ocurrido_en.isoformat(),
            "dias_mora": datos.dias_mora,
        },
    )
    db.commit()
    db.refresh(outcome)
    return outcome


@router.get("/outcomes", response_model=list[OutcomeOut])
def listar_outcomes(
    tipo: str | None = Query(default=None, description="Filtra por tipo de outcome"),
    desde: date | None = Query(default=None, description="Ocurridos desde esta fecha (inclusive)"),
    hasta: date | None = Query(default=None, description="Ocurridos hasta esta fecha (inclusive)"),
    limite: int = Query(default=200, ge=1, le=1000),
    usuario: Usuario = Depends(requiere_staff),
    db: Session = Depends(get_db),
) -> list[ResultadoRiesgo]:
    """Listado de outcomes para medir la cobertura del dataset de reentrenamiento."""
    if tipo is not None and tipo not in TIPOS_OUTCOME:
        raise HTTPException(422, f"Tipo de outcome inválido. Admitidos: {', '.join(TIPOS_OUTCOME)}")

    consulta = select(ResultadoRiesgo)
    tenant_id = tenant_id_o_none(usuario)
    if tenant_id is not None:
        # El outcome no lleva tenant propio: se acota por la solicitud que lo origina.
        consulta = consulta.join(Solicitud, Solicitud.id == ResultadoRiesgo.solicitud_id).where(
            Solicitud.inmobiliaria_id == tenant_id
        )
    if tipo is not None:
        consulta = consulta.where(ResultadoRiesgo.tipo == tipo)
    if desde is not None:
        consulta = consulta.where(ResultadoRiesgo.ocurrido_en >= desde)
    if hasta is not None:
        consulta = consulta.where(ResultadoRiesgo.ocurrido_en <= hasta)

    consulta = consulta.order_by(ResultadoRiesgo.ocurrido_en.desc()).limit(limite)
    return list(db.execute(consulta).scalars().all())


# ---------------------------------------------------------------------------
# Proveedores externos
# ---------------------------------------------------------------------------
@router.get("/proveedores", response_model=list[ProveedorEstadoOut])
def listar_proveedores(usuario: Usuario = Depends(requiere_staff)) -> list[dict]:
    """Qué integraciones existen, para qué sirven y cuáles están configuradas.

    Hoy ninguna lo está: el sistema opera sin proveedores contratados y lo declara,
    en vez de simular respuestas que darían una falsa sensación de verificación.
    """
    return estado_proveedores()
