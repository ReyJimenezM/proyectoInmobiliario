import uuid
from datetime import datetime

from sqlalchemy import Text, DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import DecisionManual as DecisionManualEnum


class DecisionManual(Base):
    __tablename__ = "decisiones_manuales"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evaluacion_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluaciones.id"), nullable=False)
    analista_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    decision_final: Mapped[DecisionManualEnum] = mapped_column(
        Enum(DecisionManualEnum, name="decision_manual_enum"), nullable=False
    )
    comentario: Mapped[str] = mapped_column(Text, nullable=False)
    decidido_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
