import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.enums import RolUsuario
from app.models.usuario import Usuario

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido: se esperaba un access token")
        usuario_id = uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return usuario


def requiere_roles(*roles: RolUsuario):
    def _verificar(usuario: Usuario = Depends(get_current_user)) -> Usuario:
        if usuario.rol not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="No tienes permisos para esta acción")
        return usuario

    return _verificar


# Cualquier rol de staff con acceso al backoffice (lectura como minimo).
requiere_staff = requiere_roles(
    RolUsuario.super_admin, RolUsuario.admin, RolUsuario.analista, RolUsuario.asesor, RolUsuario.consulta
)
# Roles que pueden tomar decisiones y modificar catalogos (no "consulta", que es solo lectura).
requiere_analista_o_admin = requiere_roles(RolUsuario.super_admin, RolUsuario.admin, RolUsuario.analista)
requiere_super_admin = requiere_roles(RolUsuario.super_admin)
# Branding/marca es informacion sensible (NIT, contacto legal) -- solo el admin del tenant
# o super_admin pueden editarla, no analista/asesor/consulta.
requiere_admin_tenant = requiere_roles(RolUsuario.super_admin, RolUsuario.admin)
# Gestion comercial (CRM de leads): el asesor SI trabaja aqui, a diferencia de las
# decisiones de credito. "consulta" queda fuera: es solo lectura.
requiere_gestion_comercial = requiere_roles(
    RolUsuario.super_admin, RolUsuario.admin, RolUsuario.analista, RolUsuario.asesor
)


# --- Aislamiento entre inmobiliarias -------------------------------------------------
# Cruzar tenants responde 404, no 403. Un 403 ("esta solicitud no pertenece a tu
# inmobiliaria") confirma que el recurso EXISTE: permite enumerar ids ajenos y contar
# volumen de la competencia. Para quien no tiene acceso, el recurso simplemente no existe.
# Excepcion deliberada: los errores de ROL siguen siendo 403 -- ahi el recurso es visible
# para ese usuario, lo que no esta permitido es la accion.
NO_EXISTE = {
    "solicitud": "La solicitud no existe.",
    "propiedad": "La propiedad no existe.",
    "anunciante": "El anunciante no existe.",
    "propietario": "El propietario no existe.",
    "proyecto": "El proyecto no existe.",
    "documento": "El documento no existe.",
}


def mensaje_no_existe(entidad: str) -> str:
    """Mensaje unico para 'no existe' y para 'existe pero es de otra inmobiliaria'."""
    return NO_EXISTE.get(entidad, "El recurso no existe.")


def verificar_tenant_o_404(recurso, usuario: Usuario, entidad: str) -> None:
    """Lanza 404 si el recurso es de otra inmobiliaria (o si es None). El super_admin
    atraviesa todos los tenants."""
    if recurso is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=mensaje_no_existe(entidad))
    if usuario.rol == RolUsuario.super_admin:
        return
    if getattr(recurso, "inmobiliaria_id", None) != usuario.inmobiliaria_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=mensaje_no_existe(entidad))


def tenant_id_o_none(usuario: Usuario) -> uuid.UUID | None:
    """Los super_admin ven todas las inmobiliarias (sin filtro); el resto del staff
    queda limitado a la suya. Usar como: filtro = tenant_id_o_none(usuario); si no es
    None, agregar `.where(Modelo.inmobiliaria_id == filtro)` a la query."""
    if usuario.rol == RolUsuario.super_admin:
        return None
    if usuario.inmobiliaria_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Tu usuario no está asociado a ninguna inmobiliaria")
    return usuario.inmobiliaria_id
