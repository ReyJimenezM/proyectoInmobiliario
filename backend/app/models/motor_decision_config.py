import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MotorDecisionConfig(Base):
    """Version del motor de decision robusto (Fase 2), analoga a politicas_credito pero
    con la estructura de reglas/grupos/pesos del motor_decision.robusto. Versionado igual:
    nunca se sobreescribe, se crea una fila nueva y se desactiva la anterior."""

    __tablename__ = "motores_decision"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inmobiliaria_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inmobiliarias.id"), nullable=False
    )
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    autor: Mapped[str] = mapped_column(String(255), nullable=False)
    pesos: Mapped[dict] = mapped_column(JSONB, nullable=False)  # {grupo: peso}
    parametros: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # reglas: [{id, grupo, tipo, prioridad, variable, operador, valor, puntos, nombre, descripcion, activa}]
    reglas: Mapped[list] = mapped_column(JSONB, nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    autor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
