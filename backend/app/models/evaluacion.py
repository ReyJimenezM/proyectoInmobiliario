import uuid
from datetime import datetime

from sqlalchemy import Numeric, String, Text, DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import DecisionEvaluacion


class Evaluacion(Base):
    __tablename__ = "evaluaciones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solicitud_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("solicitudes.id"), nullable=False)
    # Exactamente una de las dos queda poblada: politica_version_id para el motor 5C
    # (compra), motor_version_id para el motor robusto de 37 reglas (arriendo).
    politica_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("politicas_credito.id"), nullable=True
    )
    motor_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("motores_decision.id"), nullable=True
    )
    score: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    # detalle de cada variable evaluada: [{nombre, peso, valor_calculado, banda, puntaje_obtenido}]
    variables_evaluadas: Mapped[dict] = mapped_column(JSONB, nullable=False)
    decision: Mapped[DecisionEvaluacion] = mapped_column(
        Enum(DecisionEvaluacion, name="decision_evaluacion"), nullable=False
    )
    explicacion_generada: Mapped[str] = mapped_column(Text, nullable=False)
    # Copia de pesos, parametros y reglas activas EN EL MOMENTO de evaluar. Publicar una
    # version nueva del motor no puede alterar evaluaciones anteriores: las lecturas
    # historicas leen este snapshot, nunca la configuracion vigente.
    snapshot_motor: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Reglas duras disparadas: [{codigo, titulo, severidad, detalle}]
    reglas_duras: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # Que gobernó la decision: "PUNTAJE" o "REGLA_DURA".
    decision_driver: Mapped[str | None] = mapped_column(String(20), nullable=True)
    evaluado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
