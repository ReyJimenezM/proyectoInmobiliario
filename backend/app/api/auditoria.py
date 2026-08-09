import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import requiere_analista_o_admin, tenant_id_o_none
from app.db.session import get_db
from app.models.auditoria import Auditoria
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.auditoria import AuditoriaListOut, AuditoriaOut

router = APIRouter(prefix="/api/admin/auditoria", tags=["auditoria"])


@router.get("", response_model=AuditoriaListOut)
def listar_auditoria(
    entidad_tipo: str | None = None,
    accion: str | None = None,
    actor_id: uuid.UUID | None = None,
    pagina: int = Query(default=1, ge=1),
    tamano_pagina: int = Query(default=25, ge=1, le=100),
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> AuditoriaListOut:
    condiciones = []
    tenant_id = tenant_id_o_none(usuario)
    if tenant_id is not None:
        # Limitacion conocida del demo: solo filtra por acciones cuyo actor pertenece a
        # tu inmobiliaria (creadas/actualizadas/decisiones manuales/etc). Las entradas
        # generadas por el sistema sin actor humano (ej. "evaluada", actor_id NULL) no
        # se pueden atribuir a un tenant sin un join mas elaborado por entidad -- quedan
        # visibles solo para super_admin en esta version.
        ids_usuarios_tenant = select(Usuario.id).where(Usuario.inmobiliaria_id == tenant_id)
        condiciones.append(Auditoria.actor_id.in_(ids_usuarios_tenant))
    if entidad_tipo is not None:
        condiciones.append(Auditoria.entidad_tipo == entidad_tipo)
    if accion is not None:
        condiciones.append(Auditoria.accion == accion)
    if actor_id is not None:
        condiciones.append(Auditoria.actor_id == actor_id)

    total = db.scalar(select(func.count()).select_from(select(Auditoria.id).where(*condiciones).subquery())) or 0
    offset = (pagina - 1) * tamano_pagina
    resultados = db.execute(
        select(Auditoria).where(*condiciones).order_by(Auditoria.timestamp.desc()).offset(offset).limit(tamano_pagina)
    ).scalars().all()

    return AuditoriaListOut(
        resultados=[AuditoriaOut.model_validate(a) for a in resultados],
        total=total, pagina=pagina, tamano_pagina=tamano_pagina,
    )
