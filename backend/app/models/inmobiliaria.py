import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Inmobiliaria(Base):
    """Tenant white-label (Fase 2). Cada usuario/propiedad/solicitud/politica queda
    scoped a una inmobiliaria, excepto los super_admin que administran el catalogo."""

    __tablename__ = "inmobiliarias"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre_legal: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre_comercial: Mapped[str] = mapped_column(String(120), nullable=False)
    nit: Mapped[str | None] = mapped_column(String(30), nullable=True)
    direccion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    color_primario: Mapped[str] = mapped_column(String(7), nullable=False, default="#C2410C")
    color_acento: Mapped[str] = mapped_column(String(7), nullable=False, default="#B45309")
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
