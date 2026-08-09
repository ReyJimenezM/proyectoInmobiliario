import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ReglaMotorIn(BaseModel):
    id: str
    grupo: str
    tipo: str  # "escala" | "ajuste"
    prioridad: int
    variable: str
    operador: str
    valor: float
    puntos: float
    nombre: str
    descripcion: str
    activa: bool = True


class MotorDecisionCrearIn(BaseModel):
    version: str
    pesos: dict[str, float]
    parametros: dict[str, float]
    reglas: list[ReglaMotorIn]
    notas: str = Field(min_length=10)

    @field_validator("pesos")
    @classmethod
    def pesos_deben_sumar_100(cls, pesos: dict[str, float]) -> dict[str, float]:
        suma = round(sum(pesos.values()), 2)
        if suma != 100:
            raise ValueError(f"Los pesos de los grupos deben sumar 100 (suman {suma})")
        return pesos


class MotorDecisionConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    version: str
    autor: str
    pesos: dict
    parametros: dict
    reglas: list[dict]
    activa: bool
    autor_id: uuid.UUID
    notas: str | None
    creado_en: datetime
