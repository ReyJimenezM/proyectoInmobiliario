import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import Vertical, EstadoSolicitud


class Solicitud(Base):
    __tablename__ = "solicitudes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solicitante_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    propiedad_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("propiedades.id"), nullable=False)
    inmobiliaria_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inmobiliarias.id"), nullable=False
    )
    vertical: Mapped[Vertical] = mapped_column(Enum(Vertical, name="vertical_solicitud"), nullable=False)
    estado: Mapped[EstadoSolicitud] = mapped_column(
        Enum(EstadoSolicitud, name="estado_solicitud"), nullable=False, default=EstadoSolicitud.borrador
    )
    datos_personales: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    datos_laborales: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    datos_financieros: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    garantias_referencias: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
