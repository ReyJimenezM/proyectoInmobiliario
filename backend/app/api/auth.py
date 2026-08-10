import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errores import NoAutorizado
from app.core.ratelimit import clave_login, limitador_login
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.auth import LoginIn, RecuperarPasswordIn, RefreshIn, RegistroIn, TokenOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _emitir_tokens(usuario: Usuario) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(str(usuario.id), usuario.rol.value),
        refresh_token=create_refresh_token(str(usuario.id), usuario.rol.value),
        usuario=usuario,
    )


@router.post("/registro", response_model=TokenOut, status_code=201)
def registro(payload: RegistroIn, db: Session = Depends(get_db)) -> TokenOut:
    existente = db.execute(select(Usuario).where(Usuario.email == payload.email)).scalar_one_or_none()
    if existente is not None:
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con este email")

    usuario = Usuario(
        id=uuid.uuid4(),
        email=payload.email,
        password_hash=hash_password(payload.password),
        rol=RolUsuario.solicitante,
        nombre_completo=payload.nombre_completo,
        telefono=payload.telefono,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return _emitir_tokens(usuario)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)) -> TokenOut:
    ip = request.client.host if request.client else None
    clave = clave_login(payload.email, ip)

    # Se verifica *antes* de mirar la contraseña: mientras dure el bloqueo se
    # rechaza incluso el intento acertado. Si no, la respuesta distinta ante la
    # contraseña buena le confirmaría al atacante que ya la encontró.
    limitador_login.verificar(clave)

    usuario = db.execute(select(Usuario).where(Usuario.email == payload.email)).scalar_one_or_none()
    if usuario is None or not verify_password(payload.password, usuario.password_hash):
        # Mensaje deliberadamente ambiguo: no revela si el email está registrado.
        limitador_login.registrar_fallo(clave)
        raise NoAutorizado("Email o contraseña incorrectos.", codigo="INVALID_CREDENTIALS")

    limitador_login.registrar_exito(clave)
    return _emitir_tokens(usuario)


@router.post("/refresh", response_model=TokenOut)
def refrescar_token(payload: RefreshIn, db: Session = Depends(get_db)) -> TokenOut:
    try:
        datos = decode_token(payload.refresh_token)
        if datos.get("type") != "refresh":
            raise ValueError("no es un refresh token")
        usuario_id = uuid.UUID(datos["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")

    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return _emitir_tokens(usuario)


@router.post("/recuperar-password")
def recuperar_password(payload: RecuperarPasswordIn) -> dict:
    """Flujo simulado para el demo: en producción esto enviaría un correo con un enlace
    de restablecimiento de un solo uso. Aquí solo confirmamos el flujo de UI."""
    return {
        "mensaje": (
            f"Si existe una cuenta asociada a {payload.email}, en producción se enviaría "
            "un correo con instrucciones para restablecer la contraseña."
        ),
        "simulado": True,
    }
