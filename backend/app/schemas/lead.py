import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import EstadoLead, TipoLead


class LeadCrearIn(BaseModel):
    """Lo que manda la landing. Endpoint publico: nada aqui es de confianza."""

    #: Perfil tal como lo eligio la persona en la landing.
    perfil: str = Field(pattern="^(inmobiliaria|persona)$")
    nombre: str = Field(min_length=3, max_length=160)
    correo: EmailStr
    telefono: str = Field(min_length=7, max_length=40)
    empresa: str | None = Field(default=None, max_length=160)
    ciudad: str | None = Field(default=None, max_length=120)
    inmuebles: str | None = Field(default=None, max_length=40)
    interes: str | None = Field(default=None, max_length=200)
    mensaje: str | None = Field(default=None, max_length=1000)
    origen: str = Field(default="landing", max_length=60)
    utm_source: str | None = Field(default=None, max_length=120)
    utm_medium: str | None = Field(default=None, max_length=120)
    utm_campaign: str | None = Field(default=None, max_length=120)
    pagina: str | None = Field(default=None, max_length=300)
    #: Landing de una inmobiliaria concreta (white-label). Sin esto el lead entra a la
    #: bandeja de la plataforma.
    inmobiliaria_id: uuid.UUID | None = None


class LeadCreadoOut(BaseModel):
    """Respuesta minima: ni siquiera devuelve los datos que acaba de recibir."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    codigo: str


class LeadActualizarIn(BaseModel):
    estado: EstadoLead | None = None
    asesor: str | None = Field(default=None, max_length=160)
    #: Nota de gestion. Reemplaza la anterior en el lead y queda historica en auditoria.
    nota: str | None = Field(default=None, max_length=2000)


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    codigo: str
    inmobiliaria_id: uuid.UUID | None
    tipo: TipoLead
    nombre: str
    correo: str
    telefono: str
    empresa: str | None
    ciudad: str | None
    inmuebles: str | None
    interes: str | None
    mensaje: str | None
    origen: str
    utm_source: str | None
    utm_medium: str | None
    utm_campaign: str | None
    pagina: str | None
    estado: EstadoLead
    asesor: str | None
    nota: str | None
    agendado_en: datetime | None
    creado_en: datetime
    ultima_gestion: datetime


class LeadsResumenOut(BaseModel):
    """Cifras del tablero, calculadas sobre el mismo filtro del listado."""

    total: int
    activos: int
    ganados: int
    cerrados: int
    sin_asignar: int
    agendados: int


class LeadsListaOut(BaseModel):
    leads: list[LeadOut]
    resumen: LeadsResumenOut
