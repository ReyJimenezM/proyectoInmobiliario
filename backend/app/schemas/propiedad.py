import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import EstadoPropiedad, OperacionPropiedad, TipoAnunciante, TipoPropiedad


class ImagenPropiedadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    url: str
    orden: int


class AnuncianteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    tipo: TipoAnunciante
    nombre: str
    telefono_contacto: str | None
    email: str | None
    componentes_riesgo: dict | None = None
    score_riesgo: int | None = None
    nivel_riesgo: str | None = None


class PropiedadListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    titulo: str
    tipo: TipoPropiedad
    operacion: OperacionPropiedad
    precio: Decimal
    area_m2: Decimal
    habitaciones: int
    banos: int
    ciudad: str
    zona: str | None
    barrio: str | None
    simulador_activo: bool
    imagen_principal: str | None = None


class PropiedadListOut(BaseModel):
    resultados: list[PropiedadListItemOut]
    total: int
    pagina: int
    tamano_pagina: int
    total_paginas: int


class PropiedadDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    titulo: str
    descripcion: str
    tipo: TipoPropiedad
    operacion: OperacionPropiedad
    precio: Decimal
    valor_admin: Decimal | None
    area_m2: Decimal
    habitaciones: int
    banos: int
    parqueaderos: int
    ciudad: str
    zona: str | None
    barrio: str | None
    direccion: str | None
    estrato: int | None
    simulador_activo: bool
    estado: EstadoPropiedad
    imagenes: list[ImagenPropiedadOut]
    anunciante: AnuncianteOut
    componentes_riesgo: dict | None = None
    score_riesgo: int | None = None
    nivel_riesgo: str | None = None


class PropiedadCreateIn(BaseModel):
    titulo: str
    descripcion: str
    tipo: TipoPropiedad
    operacion: OperacionPropiedad
    precio: Decimal
    valor_admin: Decimal | None = None
    area_m2: Decimal
    habitaciones: int = 0
    banos: int = 0
    parqueaderos: int = 0
    ciudad: str
    zona: str | None = None
    barrio: str | None = None
    direccion: str | None = None
    estrato: int | None = None
    anunciante_id: uuid.UUID
    simulador_activo: bool = True
    imagenes: list[str] = []


class PropiedadUpdateIn(BaseModel):
    titulo: str | None = None
    descripcion: str | None = None
    tipo: TipoPropiedad | None = None
    operacion: OperacionPropiedad | None = None
    precio: Decimal | None = None
    valor_admin: Decimal | None = None
    area_m2: Decimal | None = None
    habitaciones: int | None = None
    banos: int | None = None
    parqueaderos: int | None = None
    ciudad: str | None = None
    zona: str | None = None
    barrio: str | None = None
    direccion: str | None = None
    estrato: int | None = None
    simulador_activo: bool | None = None
    estado: EstadoPropiedad | None = None


class ReordenarImagenesIn(BaseModel):
    orden_imagenes: list[uuid.UUID]
