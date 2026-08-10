"""Esquemas de entrada/salida de los endpoints de trazabilidad."""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class HallazgoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    solicitud_id: uuid.UUID
    corrida_id: uuid.UUID | None = None
    codigo_comprobacion: str
    tipo: str
    severidad: int
    titulo: str
    detalle: str
    valores: dict = Field(default_factory=dict)
    resuelto: bool
    resuelto_por: uuid.UUID | None = None
    resuelto_en: datetime | None = None
    nota_resolucion: str | None = None
    creado_en: datetime


class ResolverHallazgoIn(BaseModel):
    #: Por qué se da por cerrado. Un hallazgo cerrado sin explicación no es
    #: trazabilidad, es ruido: obliga a que alguien deje constancia.
    nota: str = Field(min_length=3, max_length=2000)


class HistorialEstadoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    solicitud_id: uuid.UUID
    estado_anterior: str | None = None
    estado_nuevo: str
    actor_id: uuid.UUID | None = None
    motivo: str | None = None
    creado_en: datetime


class ConsentimientoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    solicitud_id: uuid.UUID | None = None
    persona_documento: str
    tipo: str
    otorgado: bool
    texto_version: str
    ip_origen: str | None = None
    user_agent: str | None = None
    otorgado_en: datetime
    revocado_en: datetime | None = None

    @property
    def vigente(self) -> bool:
        return self.otorgado and self.revocado_en is None


class OutcomeIn(BaseModel):
    #: CONTRATO_INICIADO / PAGO_PUNTUAL / MORA_LEVE / MORA_GRAVE / RESTITUCION /
    #: CONTRATO_TERMINADO
    tipo: str
    ocurrido_en: date
    evaluacion_id: uuid.UUID | None = None
    dias_mora: int | None = Field(default=None, ge=0, le=3650)
    monto: float | None = Field(default=None, ge=0)
    notas: str | None = Field(default=None, max_length=2000)


class OutcomeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    solicitud_id: uuid.UUID
    evaluacion_id: uuid.UUID | None = None
    tipo: str
    ocurrido_en: date
    dias_mora: int | None = None
    monto: float | None = None
    notas: str | None = None
    registrado_por: uuid.UUID | None = None
    creado_en: datetime


class ProveedorEstadoOut(BaseModel):
    tipo: str
    nombre: str
    descripcion: str
    configurado: bool
    requiere_consentimiento: str | None = None
