import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import requiere_analista_o_admin, requiere_staff, tenant_id_o_none
from app.db.session import get_db
from app.models.motor_decision_config import MotorDecisionConfig
from app.models.usuario import Usuario
from app.schemas.motor import MotorDecisionConfigOut, MotorDecisionCrearIn
from app.services.auditoria import registrar

router = APIRouter(prefix="/api/admin/motor", tags=["motor"])


@router.get("", response_model=list[MotorDecisionConfigOut])
def listar_versiones_motor(
    usuario: Usuario = Depends(requiere_staff), db: Session = Depends(get_db)
) -> list[MotorDecisionConfig]:
    query = select(MotorDecisionConfig).order_by(MotorDecisionConfig.creado_en.desc())
    tenant_id = tenant_id_o_none(usuario)
    if tenant_id is not None:
        query = query.where(MotorDecisionConfig.inmobiliaria_id == tenant_id)
    return list(db.execute(query).scalars().all())


@router.post("", response_model=MotorDecisionConfigOut, status_code=201)
def crear_version_motor(
    payload: MotorDecisionCrearIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> MotorDecisionConfig:
    if usuario.inmobiliaria_id is None:
        raise HTTPException(403, "Tu usuario no está asociado a ninguna inmobiliaria")

    anterior = db.execute(
        select(MotorDecisionConfig).where(
            MotorDecisionConfig.activa.is_(True), MotorDecisionConfig.inmobiliaria_id == usuario.inmobiliaria_id
        )
    ).scalar_one_or_none()
    if anterior is not None:
        anterior.activa = False

    nueva = MotorDecisionConfig(
        id=uuid.uuid4(), inmobiliaria_id=usuario.inmobiliaria_id, version=payload.version,
        autor=usuario.nombre_completo, pesos=payload.pesos, parametros=payload.parametros,
        reglas=[r.model_dump() for r in payload.reglas], activa=True, autor_id=usuario.id, notas=payload.notas,
    )
    db.add(nueva)

    registrar(
        db, entidad_tipo="motor_decision", entidad_id=nueva.id, accion="nueva_version_creada",
        actor_id=usuario.id,
        payload_antes={"version_anterior": anterior.version} if anterior else None,
        payload_despues={"version": payload.version, "notas": payload.notas},
    )

    db.commit()
    db.refresh(nueva)
    return nueva
