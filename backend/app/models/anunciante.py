import uuid

from sqlalchemy import Integer, String, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import TipoAnunciante


class Anunciante(Base):
    __tablename__ = "anunciantes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo: Mapped[TipoAnunciante] = mapped_column(Enum(TipoAnunciante, name="tipo_anunciante"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    telefono_contacto: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True
    )
    inmobiliaria_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inmobiliarias.id"), nullable=False
    )
    # Scoring de riesgo del propietario (F2-B3): componentes 0-100 verificados por un
    # analista (titularidad, situacion juridica, documentacion, identidad, antifraude,
    # historial, cumplimiento); score_riesgo es la media ponderada escalada a 0-1000.
    componentes_riesgo: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    score_riesgo: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nivel_riesgo: Mapped[str | None] = mapped_column(String(30), nullable=True)
