import uuid
from datetime import datetime

from sqlalchemy import Integer, Boolean, DateTime, Text, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import Vertical


class PoliticaCredito(Base):
    __tablename__ = "politicas_credito"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    vertical: Mapped[Vertical] = mapped_column(Enum(Vertical, name="vertical_politica"), nullable=False)
    # variables: [{nombre, peso, bandas: [{min, max, puntaje, etiqueta}]}]
    variables: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # bandas_decision: {aprobado_min, revision_min, rechazado_max}
    bandas_decision: Mapped[dict] = mapped_column(JSONB, nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    autor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    inmobiliaria_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inmobiliarias.id"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    motivo_cambio: Mapped[str | None] = mapped_column(Text, nullable=True)
