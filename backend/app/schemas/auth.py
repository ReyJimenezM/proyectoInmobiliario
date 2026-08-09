import uuid

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import RolUsuario


class RegistroIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    nombre_completo: str
    telefono: str | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class UsuarioOut(BaseModel):
    id: uuid.UUID
    email: str
    nombre_completo: str
    rol: RolUsuario
    inmobiliaria_id: uuid.UUID | None = None

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


class RecuperarPasswordIn(BaseModel):
    email: EmailStr
