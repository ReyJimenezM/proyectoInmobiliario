import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Propietario(Base):
    __tablename__ = "propietarios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inmobiliaria_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inmobiliarias.id"), nullable=False
    )
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo_documento: Mapped[str] = mapped_column(String(10), nullable=False, default="CC")
    documento: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ciudad: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Scoring de riesgo (mismo patron que Anunciante, F2-B3): componentes 0-100
    # verificados por un analista; score_riesgo es la media ponderada escalada a 0-1000.
    componentes_riesgo: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    score_riesgo: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nivel_riesgo: Mapped[str | None] = mapped_column(String(30), nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
