import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ConfiguracionOperativa(Base):
    """Almacen flexible clave/valor (JSONB) para la parametrización operativa por tenant:

    - clave="parametrizacion": SLA por prioridad, flags operativos y motivos de rechazo.
    - clave="requisitos": documentos base, por perfil y reglas configurables.
    - clave="catalogo:<nombre>": override de un catálogo operativo (tipo_inmueble, etc.).

    inmobiliaria_id NULL representa la configuración global/por defecto de la plataforma.
    """

    __tablename__ = "configuraciones_operativas"
    __table_args__ = (UniqueConstraint("inmobiliaria_id", "clave", name="uq_config_operativa_tenant_clave"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inmobiliaria_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inmobiliarias.id"), nullable=True
    )
    clave: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    valor: Mapped[dict] = mapped_column(JSONB, nullable=False)
    actualizado_por: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
