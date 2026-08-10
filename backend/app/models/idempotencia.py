import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RegistroIdempotencia(Base):
    """Respuesta ya emitida para una clave ``Idempotency-Key``.

    Permite que un reintento (doble clic, proxy que reenvía, cliente con
    reintento automático) devuelva el resultado original en lugar de repetir
    una operación con efectos irreversibles.

    inmobiliaria_id NULL cubre las operaciones que no cuelgan de un tenant.
    """

    __tablename__ = "registros_idempotencia"
    __table_args__ = (
        UniqueConstraint("inmobiliaria_id", "clave", name="uq_idempotencia_tenant_clave"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inmobiliaria_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inmobiliarias.id"), nullable=True
    )
    clave: Mapped[str] = mapped_column(String(200), nullable=False)
    operacion: Mapped[str] = mapped_column(String(80), nullable=False)
    #: sha256 de la petición: misma clave + misma huella = mismo efecto.
    huella: Mapped[str] = mapped_column(String(64), nullable=False)
    respuesta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    estado_http: Mapped[int] = mapped_column(Integer, nullable=False, default=200)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
