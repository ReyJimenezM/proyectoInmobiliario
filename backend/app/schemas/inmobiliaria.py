import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class InmobiliariaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    nombre_legal: str
    nombre_comercial: str
    nit: str | None
    direccion: str | None
    telefono: str | None
    email: str | None
    logo_url: str | None
    color_primario: str
    color_acento: str
    activa: bool
    creado_en: datetime


class InmobiliariaCrearIn(BaseModel):
    nombre_legal: str
    nombre_comercial: str
    nit: str | None = None
    direccion: str | None = None
    telefono: str | None = None
    email: str | None = None
    color_primario: str = "#C2410C"
    color_acento: str = "#B45309"


class InmobiliariaActualizarIn(BaseModel):
    nombre_legal: str | None = None
    nombre_comercial: str | None = None
    nit: str | None = None
    direccion: str | None = None
    telefono: str | None = None
    email: str | None = None
    logo_url: str | None = None
    color_primario: str | None = None
    color_acento: str | None = None
    activa: bool | None = None


class UsuarioStaffCrearIn(BaseModel):
    email: str
    password: str
    nombre_completo: str
    telefono: str | None = None
    rol: str  # admin | analista | asesor | consulta (super_admin no se crea por este endpoint)
    inmobiliaria_id: uuid.UUID
