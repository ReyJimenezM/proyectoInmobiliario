import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import requiere_analista_o_admin, verificar_tenant_o_404
from app.db.session import get_db
from app.models.enums import RolUsuario, TipoPropiedad
from app.models.proyecto import Proyecto
from app.models.usuario import Usuario
from app.schemas.proyecto import ProyectoCreateIn, ProyectoOut, ProyectoUpdateIn

router = APIRouter(prefix="/api/proyectos", tags=["proyectos"])
router_admin = APIRouter(prefix="/api/admin/proyectos", tags=["proyectos"])


@router.get("", response_model=list[ProyectoOut])
def listar_proyectos(
    ciudad: str | None = None,
    tipo: TipoPropiedad | None = None,
    precio_min: Decimal | None = None,
    precio_max: Decimal | None = None,
    db: Session = Depends(get_db),
) -> list[Proyecto]:
    """Publico: catalogo de proyectos nuevos activos. No requiere autenticacion,
    igual que el listado publico de propiedades."""
    condiciones = [Proyecto.activo.is_(True)]
    if ciudad is not None:
        condiciones.append(Proyecto.ciudad.ilike(ciudad))
    if tipo is not None:
        condiciones.append(Proyecto.tipo == tipo)
    if precio_min is not None:
        condiciones.append((Proyecto.precio_hasta.is_(None)) | (Proyecto.precio_hasta >= precio_min))
    if precio_max is not None:
        condiciones.append((Proyecto.precio_desde.is_(None)) | (Proyecto.precio_desde <= precio_max))

    return list(
        db.execute(select(Proyecto).where(*condiciones).order_by(Proyecto.creado_en.desc())).scalars().all()
    )


@router.get("/{proyecto_id}", response_model=ProyectoOut)
def obtener_proyecto(proyecto_id: uuid.UUID, db: Session = Depends(get_db)) -> Proyecto:
    proyecto = db.get(Proyecto, proyecto_id)
    if proyecto is None or not proyecto.activo:
        raise HTTPException(404, "Proyecto no encontrado")
    return proyecto


@router_admin.post("", response_model=ProyectoOut, status_code=201)
def crear_proyecto(
    payload: ProyectoCreateIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> Proyecto:
    if usuario.inmobiliaria_id is None:
        raise HTTPException(403, "Tu usuario no está asociado a ninguna inmobiliaria")

    proyecto = Proyecto(id=uuid.uuid4(), inmobiliaria_id=usuario.inmobiliaria_id, **payload.model_dump())
    db.add(proyecto)
    db.commit()
    db.refresh(proyecto)
    return proyecto


def _verificar_proyecto_del_tenant(proyecto_id: uuid.UUID, usuario: Usuario, db: Session) -> Proyecto:
    proyecto = db.get(Proyecto, proyecto_id)
    verificar_tenant_o_404(proyecto, usuario, "proyecto")
    return proyecto


@router_admin.patch("/{proyecto_id}", response_model=ProyectoOut)
def actualizar_proyecto(
    proyecto_id: uuid.UUID,
    payload: ProyectoUpdateIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> Proyecto:
    proyecto = _verificar_proyecto_del_tenant(proyecto_id, usuario, db)

    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(proyecto, campo, valor)

    db.commit()
    db.refresh(proyecto)
    return proyecto
