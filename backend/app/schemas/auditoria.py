import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditoriaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    entidad_tipo: str
    entidad_id: uuid.UUID
    accion: str
    actor_id: uuid.UUID | None
    payload_antes: dict | None
    payload_despues: dict
    timestamp: datetime


class AuditoriaListOut(BaseModel):
    resultados: list[AuditoriaOut]
    total: int
    pagina: int
    tamano_pagina: int
