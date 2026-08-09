import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import requiere_admin_tenant, requiere_analista_o_admin, requiere_super_admin
from app.core.security import hash_password
from app.db.session import get_db
from app.models.enums import RolUsuario
from app.models.inmobiliaria import Inmobiliaria
from app.models.usuario import Usuario
from app.schemas.auth import UsuarioOut
from app.schemas.inmobiliaria import (
    InmobiliariaActualizarIn,
    InmobiliariaCrearIn,
    InmobiliariaOut,
    UsuarioStaffCrearIn,
)
from app.services.auditoria import registrar
from app.services.storage import ArchivoInvalidoError, EXTENSIONES_IMAGEN, get_public_storage_backend

router = APIRouter(prefix="/api/admin/inmobiliarias", tags=["inmobiliarias"])
router_publico = APIRouter(prefix="/api/inmobiliarias", tags=["inmobiliarias"])

ROLES_ASIGNABLES = {RolUsuario.admin, RolUsuario.analista, RolUsuario.asesor, RolUsuario.consulta}


@router.get("", response_model=list[InmobiliariaOut])
def listar_inmobiliarias(
    usuario: Usuario = Depends(requiere_super_admin), db: Session = Depends(get_db)
) -> list[Inmobiliaria]:
    return list(db.execute(select(Inmobiliaria).order_by(Inmobiliaria.nombre_comercial)).scalars().all())


@router.post("", response_model=InmobiliariaOut, status_code=201)
def crear_inmobiliaria(
    payload: InmobiliariaCrearIn, usuario: Usuario = Depends(requiere_super_admin), db: Session = Depends(get_db)
) -> Inmobiliaria:
    inmobiliaria = Inmobiliaria(id=uuid.uuid4(), **payload.model_dump())
    db.add(inmobiliaria)
    registrar(
        db, entidad_tipo="inmobiliaria", entidad_id=inmobiliaria.id, accion="creada",
        actor_id=usuario.id, payload_despues={"nombre_comercial": payload.nombre_comercial},
    )
    db.commit()
    db.refresh(inmobiliaria)
    return inmobiliaria


@router.patch("/{inmobiliaria_id}", response_model=InmobiliariaOut)
def actualizar_inmobiliaria(
    inmobiliaria_id: uuid.UUID,
    payload: InmobiliariaActualizarIn,
    usuario: Usuario = Depends(requiere_admin_tenant),
    db: Session = Depends(get_db),
) -> Inmobiliaria:
    # El admin de un tenant puede editar SU marca (branding white-label); solo super_admin
    # puede editar cualquier inmobiliaria o activar/desactivar tenants ajenos.
    if usuario.rol != RolUsuario.super_admin and usuario.inmobiliaria_id != inmobiliaria_id:
        raise HTTPException(403, "Solo puedes editar tu propia inmobiliaria")

    inmobiliaria = db.get(Inmobiliaria, inmobiliaria_id)
    if inmobiliaria is None:
        raise HTTPException(404, "Inmobiliaria no encontrada")

    datos = payload.model_dump(exclude_unset=True)
    if usuario.rol != RolUsuario.super_admin:
        datos.pop("activa", None)  # activar/desactivar un tenant es exclusivo de super_admin

    for campo, valor in datos.items():
        setattr(inmobiliaria, campo, valor)

    registrar(
        db, entidad_tipo="inmobiliaria", entidad_id=inmobiliaria.id, accion="branding_actualizado",
        actor_id=usuario.id, payload_despues=datos,
    )
    db.commit()
    return inmobiliaria


@router.post("/{inmobiliaria_id}/logo", response_model=InmobiliariaOut)
def subir_logo_inmobiliaria(
    inmobiliaria_id: uuid.UUID,
    archivo: UploadFile,
    usuario: Usuario = Depends(requiere_admin_tenant),
    db: Session = Depends(get_db),
) -> Inmobiliaria:
    if usuario.rol != RolUsuario.super_admin and usuario.inmobiliaria_id != inmobiliaria_id:
        raise HTTPException(403, "Solo puedes editar tu propia inmobiliaria")

    inmobiliaria = db.get(Inmobiliaria, inmobiliaria_id)
    if inmobiliaria is None:
        raise HTTPException(404, "Inmobiliaria no encontrada")

    contenido = archivo.file.read()
    # Reutiliza el mismo storage/mount publico que las fotos de propiedades (misma
    # carpeta fisica, distinta subcarpeta por inmobiliaria_id -- sin colision de UUIDs).
    storage = get_public_storage_backend()
    try:
        ruta_relativa = storage.guardar(
            inmobiliaria_id, archivo.filename or "logo.png", contenido, extensiones_permitidas=EXTENSIONES_IMAGEN
        )
    except ArchivoInvalidoError as exc:
        raise HTTPException(422, str(exc))

    inmobiliaria.logo_url = f"{settings.public_base_url}/media/propiedades/{ruta_relativa}"
    db.commit()
    return inmobiliaria


@router.get("/{inmobiliaria_id}/usuarios", response_model=list[UsuarioOut])
def listar_usuarios_inmobiliaria(
    inmobiliaria_id: uuid.UUID,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> list[Usuario]:
    if usuario.rol != RolUsuario.super_admin and usuario.inmobiliaria_id != inmobiliaria_id:
        raise HTTPException(403, "No tienes acceso a los usuarios de esta inmobiliaria")
    return list(
        db.execute(
            select(Usuario).where(Usuario.inmobiliaria_id == inmobiliaria_id).order_by(Usuario.nombre_completo)
        ).scalars()
    )


@router.post("/{inmobiliaria_id}/usuarios", response_model=UsuarioOut, status_code=201)
def crear_usuario_staff(
    inmobiliaria_id: uuid.UUID,
    payload: UsuarioStaffCrearIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> Usuario:
    if usuario.rol != RolUsuario.super_admin and usuario.inmobiliaria_id != inmobiliaria_id:
        raise HTTPException(403, "No puedes crear usuarios para otra inmobiliaria")
    if payload.inmobiliaria_id != inmobiliaria_id:
        raise HTTPException(422, "inmobiliaria_id del payload no coincide con la ruta")

    try:
        rol = RolUsuario(payload.rol)
    except ValueError:
        raise HTTPException(422, f"Rol inválido: {payload.rol}")
    if rol not in ROLES_ASIGNABLES:
        raise HTTPException(422, "Solo se pueden crear usuarios con rol admin, analista, asesor o consulta")

    existente = db.execute(select(Usuario).where(Usuario.email == payload.email)).scalar_one_or_none()
    if existente is not None:
        raise HTTPException(409, "Ya existe una cuenta con este email")

    nuevo = Usuario(
        id=uuid.uuid4(),
        email=payload.email,
        password_hash=hash_password(payload.password),
        rol=rol,
        nombre_completo=payload.nombre_completo,
        telefono=payload.telefono,
        inmobiliaria_id=inmobiliaria_id,
    )
    db.add(nuevo)
    registrar(
        db, entidad_tipo="usuario", entidad_id=nuevo.id, accion="staff_creado",
        actor_id=usuario.id, payload_despues={"email": payload.email, "rol": rol.value},
    )
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router_publico.get("", response_model=list[InmobiliariaOut])
def listar_inmobiliarias_publicas(db: Session = Depends(get_db)) -> list[Inmobiliaria]:
    """Sin autenticacion: para el selector de tenant en el frontend (branding white-label)."""
    return list(
        db.execute(
            select(Inmobiliaria).where(Inmobiliaria.activa.is_(True)).order_by(Inmobiliaria.nombre_comercial)
        ).scalars()
    )


@router_publico.get("/{inmobiliaria_id}", response_model=InmobiliariaOut)
def obtener_inmobiliaria_publica(inmobiliaria_id: uuid.UUID, db: Session = Depends(get_db)) -> Inmobiliaria:
    inmobiliaria = db.get(Inmobiliaria, inmobiliaria_id)
    if inmobiliaria is None or not inmobiliaria.activa:
        raise HTTPException(404, "Inmobiliaria no encontrada")
    return inmobiliaria
