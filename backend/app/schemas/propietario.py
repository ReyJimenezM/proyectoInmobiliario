import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PropietarioCreateIn(BaseModel):
    nombre: str
    tipo_documento: str = "CC"
    documento: str
    email: str | None = None
    telefono: str | None = None
    ciudad: str | None = None
    notas: str | None = None


class PropietarioUpdateIn(BaseModel):
    nombre: str | None = None
    tipo_documento: str | None = None
    documento: str | None = None
    email: str | None = None
    telefono: str | None = None
    ciudad: str | None = None
    notas: str | None = None
    activo: bool | None = None


class PropietarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    inmobiliaria_id: uuid.UUID
    nombre: str
    tipo_documento: str
    documento: str
    email: str | None
    telefono: str | None
    ciudad: str | None
    componentes_riesgo: dict | None = None
    score_riesgo: int | None = None
    nivel_riesgo: str | None = None
    notas: str | None
    activo: bool
    created_at: datetime
