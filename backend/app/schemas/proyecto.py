import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import TipoPropiedad


class ProyectoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    inmobiliaria_id: uuid.UUID
    nombre: str
    constructora: str
    descripcion: str | None
    ciudad: str
    zona: str | None
    direccion: str | None
    tipo: TipoPropiedad
    precio_desde: Decimal | None
    precio_hasta: Decimal | None
    area_desde: Decimal | None
    area_hasta: Decimal | None
    habitaciones_desde: int | None
    habitaciones_hasta: int | None
    fecha_entrega: str | None
    estado: str
    imagen_url: str | None
    imagenes: list[str] = []
    amenidades: list[str] = []
    financiacion_directa: bool
    subsidio_aplicable: bool
    activo: bool


class ProyectoCreateIn(BaseModel):
    nombre: str
    constructora: str
    descripcion: str | None = None
    ciudad: str
    zona: str | None = None
    direccion: str | None = None
    tipo: TipoPropiedad
    precio_desde: Decimal | None = None
    precio_hasta: Decimal | None = None
    area_desde: Decimal | None = None
    area_hasta: Decimal | None = None
    habitaciones_desde: int | None = None
    habitaciones_hasta: int | None = None
    fecha_entrega: str | None = None
    estado: str = "preventa"
    imagen_url: str | None = None
    imagenes: list[str] = []
    amenidades: list[str] = []
    financiacion_directa: bool = False
    subsidio_aplicable: bool = False
    activo: bool = True


class ProyectoUpdateIn(BaseModel):
    nombre: str | None = None
    constructora: str | None = None
    descripcion: str | None = None
    ciudad: str | None = None
    zona: str | None = None
    direccion: str | None = None
    tipo: TipoPropiedad | None = None
    precio_desde: Decimal | None = None
    precio_hasta: Decimal | None = None
    area_desde: Decimal | None = None
    area_hasta: Decimal | None = None
    habitaciones_desde: int | None = None
    habitaciones_hasta: int | None = None
    fecha_entrega: str | None = None
    estado: str | None = None
    imagen_url: str | None = None
    imagenes: list[str] | None = None
    amenidades: list[str] | None = None
    financiacion_directa: bool | None = None
    subsidio_aplicable: bool | None = None
    activo: bool | None = None
