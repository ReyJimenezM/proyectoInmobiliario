import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import EstadoLead, TipoLead


class Lead(Base):
    """Contacto comercial capturado por la landing (u otro origen).

    `inmobiliaria_id` es nullable a proposito: la landing publica de la plataforma no
    sabe a que inmobiliaria pertenece quien deja sus datos. Un lead sin tenant es la
    bandeja de entrada de la plataforma; queda asignado a una inmobiliaria en cuanto
    alguien de su equipo lo gestiona (ver `app/api/leads.py`).
    """

    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    #: Identificador corto que se le muestra a la persona al enviar el formulario (LD-XXXXXXXX).
    #: El UUID no se expone en la landing: quien tiene el codigo no puede adivinar el id.
    codigo: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    inmobiliaria_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inmobiliarias.id"), nullable=True
    )

    tipo: Mapped[TipoLead] = mapped_column(Enum(TipoLead, name="tipo_lead"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(160), nullable=False)
    correo: Mapped[str] = mapped_column(String(160), nullable=False)
    telefono: Mapped[str] = mapped_column(String(40), nullable=False)
    empresa: Mapped[str | None] = mapped_column(String(160), nullable=True)
    ciudad: Mapped[str | None] = mapped_column(String(120), nullable=True)
    #: Rango de inmuebles administrados que declaro la inmobiliaria ("21 - 100").
    inmuebles: Mapped[str | None] = mapped_column(String(40), nullable=True)
    interes: Mapped[str | None] = mapped_column(String(200), nullable=True)
    mensaje: Mapped[str | None] = mapped_column(Text, nullable=True)

    origen: Mapped[str] = mapped_column(String(60), nullable=False, default="landing")
    utm_source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    utm_medium: Mapped[str | None] = mapped_column(String(120), nullable=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(120), nullable=True)
    pagina: Mapped[str | None] = mapped_column(String(300), nullable=True)

    estado: Mapped[EstadoLead] = mapped_column(
        Enum(EstadoLead, name="estado_lead"), nullable=False, default=EstadoLead.nuevo
    )
    asesor: Mapped[str | None] = mapped_column(String(160), nullable=True)
    nota: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: Momento en que Calendly confirmo la reunion. Null = dejo los datos pero no agendo.
    agendado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    ip_origen: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ultima_gestion: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
