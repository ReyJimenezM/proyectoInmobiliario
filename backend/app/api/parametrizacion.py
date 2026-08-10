"""Parametrización operativa del backoffice: SLA por prioridad, flags de operación
y motivos de rechazo configurables. Se guarda como un único documento JSONB por
tenant (clave "parametrizacion" en configuraciones_operativas)."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import requiere_analista_o_admin, requiere_staff
from app.db.session import get_db
from app.models.usuario import Usuario
from app.services.auditoria import registrar
from app.services.configuracion import (
    CLAVE_PARAMETRIZACION,
    DEFAULT_TENANT_ID,
    guardar_config,
    leer_config,
)

router = APIRouter(prefix="/api/admin/parametrizacion", tags=["parametrizacion"])


class SlaIn(BaseModel):
    critica: int | None = Field(default=None, ge=1, le=720)
    alta: int | None = Field(default=None, ge=1, le=720)
    media: int | None = Field(default=None, ge=1, le=720)
    baja: int | None = Field(default=None, ge=1, le=720)


class ParametrizacionIn(BaseModel):
    sla: SlaIn | None = None
    auto_asignacion: bool | None = None
    notificaciones: bool | None = None
    revision_manual_obligatoria: bool | None = None
    motivos_rechazo: list[str] | None = None


def _tenant_de(usuario: Usuario):
    return usuario.inmobiliaria_id or DEFAULT_TENANT_ID


@router.get("")
def obtener_parametrizacion(
    usuario: Usuario = Depends(requiere_staff), db: Session = Depends(get_db)
) -> dict:
    return leer_config(db, _tenant_de(usuario), CLAVE_PARAMETRIZACION)


@router.put("")
def actualizar_parametrizacion(
    payload: ParametrizacionIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> dict:
    tenant_id = _tenant_de(usuario)
    actual = leer_config(db, tenant_id, CLAVE_PARAMETRIZACION)
    antes = {k: v for k, v in actual.items()}

    cambios = payload.model_dump(exclude_none=True)
    if not cambios:
        raise HTTPException(422, "No se envió ningún cambio")

    if "sla" in cambios:
        actual["sla"] = {**actual.get("sla", {}), **cambios.pop("sla")}
    if "motivos_rechazo" in cambios:
        motivos = [m.strip() for m in cambios.pop("motivos_rechazo") if m and m.strip()]
        if not motivos:
            raise HTTPException(422, "Debe existir al menos un motivo de rechazo")
        actual["motivos_rechazo"] = motivos
    actual.update(cambios)

    fila = guardar_config(db, tenant_id, CLAVE_PARAMETRIZACION, actual, actor_id=usuario.id)
    registrar(
        db,
        entidad_tipo="configuracion_operativa",
        entidad_id=fila.id,
        accion="parametrizacion_actualizada",
        actor_id=usuario.id,
        payload_antes=antes,
        payload_despues=actual,
    )
    db.commit()
    return actual
