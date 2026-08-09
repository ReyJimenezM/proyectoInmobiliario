import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import EstadoDocumento


class DocumentoSolicitud(Base):
    __tablename__ = "documentos_solicitud"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solicitud_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("solicitudes.id"), nullable=False)
    tipo_documento: Mapped[str] = mapped_column(String(120), nullable=False)
    url_archivo: Mapped[str] = mapped_column(String(500), nullable=False)
    estado: Mapped[EstadoDocumento] = mapped_column(
        Enum(EstadoDocumento, name="estado_documento"), nullable=False, default=EstadoDocumento.pendiente
    )
    cargado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
