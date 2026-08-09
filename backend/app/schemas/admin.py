import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.models.enums import DecisionManual as DecisionManualEnum
from app.models.enums import Vertical


class DecisionManualIn(BaseModel):
    decision_final: DecisionManualEnum
    comentario: str = Field(min_length=10)


class DecisionManualOut(BaseModel):
    id: uuid.UUID
    evaluacion_id: uuid.UUID
    analista_id: uuid.UUID
    decision_final: DecisionManualEnum
    comentario: str
    decidido_en: datetime

    class Config:
        from_attributes = True


class BandaVariableIn(BaseModel):
    etiqueta: str
    puntaje: float = Field(ge=0, le=100)
    condicion: dict = {}


class VariablePoliticaIn(BaseModel):
    nombre: str
    peso: float = Field(gt=0, le=1)
    bandas: list[BandaVariableIn]


class BandasDecisionIn(BaseModel):
    aprobado_min: float
    revision_min: float
    revision_max: float


class PoliticaCreditoCrearIn(BaseModel):
    vertical: Vertical
    variables: list[VariablePoliticaIn]
    bandas_decision: BandasDecisionIn
    motivo_cambio: str = Field(min_length=10)

    @field_validator("variables")
    @classmethod
    def pesos_deben_sumar_uno(cls, variables: list[VariablePoliticaIn]) -> list[VariablePoliticaIn]:
        suma = round(sum(v.peso for v in variables), 4)
        if suma != 1.0:
            raise ValueError(f"Los pesos de las variables deben sumar 1.0 (suman {suma})")
        return variables


class PoliticaCreditoOut(BaseModel):
    id: uuid.UUID
    version: int
    vertical: Vertical
    variables: list[dict]
    bandas_decision: dict
    activa: bool
    autor_id: uuid.UUID
    creado_en: datetime
    motivo_cambio: str | None

    class Config:
        from_attributes = True


class MetricaEstadoOut(BaseModel):
    estado: str
    cantidad: int


class DashboardOut(BaseModel):
    total_solicitudes: int
    solicitudes_por_estado: list[MetricaEstadoOut]
    tasa_aprobacion: float
    tiempo_promedio_evaluacion_horas: float | None
    distribucion_scores: list[dict]
