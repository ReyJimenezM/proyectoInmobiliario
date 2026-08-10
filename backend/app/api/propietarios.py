import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import (
    requiere_analista_o_admin,
    requiere_staff,
    tenant_id_o_none,
    verificar_tenant_o_404,
)
from app.db.session import get_db
from app.models.enums import RolUsuario
from app.models.propietario import Propietario
from app.models.usuario import Usuario
from app.schemas.propietario import PropietarioCreateIn, PropietarioOut, PropietarioUpdateIn
from app.schemas.riesgo import ComponentesRiesgoIn, RiesgoOut
from app.services.auditoria import registrar
from motor_decision.robusto import OWNER_COMPS, nivel_riesgo, score_componentes

router = APIRouter(prefix="/api/admin/propietarios", tags=["propietarios"])


def _verificar_propietario_del_tenant(propietario_id: uuid.UUID, usuario: Usuario, db: Session) -> Propietario:
    propietario = db.get(Propietario, propietario_id)
    verificar_tenant_o_404(propietario, usuario, "propietario")
    return propietario


@router.get("", response_model=list[PropietarioOut])
def listar_propietarios(
    q: str | None = None,
    usuario: Usuario = Depends(requiere_staff),
    db: Session = Depends(get_db),
) -> list[Propietario]:
    query = select(Propietario).order_by(Propietario.nombre)
    tenant_id = tenant_id_o_none(usuario)
    if tenant_id is not None:
        query = query.where(Propietario.inmobiliaria_id == tenant_id)
    if q:
        patron = f"%{q}%"
        query = query.where((Propietario.nombre.ilike(patron)) | (Propietario.documento.ilike(patron)))
    return list(db.execute(query).scalars().all())


@router.get("/{propietario_id}", response_model=PropietarioOut)
def obtener_propietario(
    propietario_id: uuid.UUID, usuario: Usuario = Depends(requiere_staff), db: Session = Depends(get_db)
) -> Propietario:
    return _verificar_propietario_del_tenant(propietario_id, usuario, db)


@router.post("", response_model=PropietarioOut, status_code=201)
def crear_propietario(
    payload: PropietarioCreateIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> Propietario:
    if usuario.rol != RolUsuario.super_admin and usuario.inmobiliaria_id is None:
        raise HTTPException(403, "Tu usuario no está asociado a ninguna inmobiliaria")

    propietario = Propietario(
        id=uuid.uuid4(),
        inmobiliaria_id=usuario.inmobiliaria_id,
        **payload.model_dump(),
    )
    db.add(propietario)
    registrar(
        db, entidad_tipo="propietario", entidad_id=propietario.id, accion="creado",
        actor_id=usuario.id, payload_despues={"nombre": propietario.nombre, "documento": propietario.documento},
    )
    db.commit()
    db.refresh(propietario)
    return propietario


@router.patch("/{propietario_id}", response_model=PropietarioOut)
def actualizar_propietario(
    propietario_id: uuid.UUID,
    payload: PropietarioUpdateIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> Propietario:
    propietario = _verificar_propietario_del_tenant(propietario_id, usuario, db)

    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(propietario, campo, valor)

    db.commit()
    return propietario


@router.patch("/{propietario_id}/riesgo", response_model=RiesgoOut)
def actualizar_riesgo_propietario(
    propietario_id: uuid.UUID,
    payload: ComponentesRiesgoIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> Propietario:
    propietario = _verificar_propietario_del_tenant(propietario_id, usuario, db)

    score = score_componentes(payload.componentes, OWNER_COMPS)
    propietario.componentes_riesgo = payload.componentes
    propietario.score_riesgo = score
    propietario.nivel_riesgo = nivel_riesgo(score)

    registrar(
        db, entidad_tipo="propietario", entidad_id=propietario.id, accion="riesgo_actualizado",
        actor_id=usuario.id, payload_despues={"score_riesgo": score, "nivel_riesgo": propietario.nivel_riesgo},
    )
    db.commit()
    return propietario
