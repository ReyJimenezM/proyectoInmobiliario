import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import TipoPropiedad


class Proyecto(Base):
    """Proyecto de construcción nueva (preventa / en construcción / entrega inmediata).

    A diferencia de `Propiedad`, un Proyecto no es una unidad individual sino un
    desarrollo con varias unidades disponibles; por eso maneja rangos de precio,
    área y habitaciones en vez de valores puntuales.
    """

    __tablename__ = "proyectos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inmobiliaria_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inmobiliarias.id"), nullable=False
    )
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    constructora: Mapped[str] = mapped_column(String(255), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    ciudad: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    zona: Mapped[str | None] = mapped_column(String(120), nullable=True)
    direccion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tipo: Mapped[TipoPropiedad] = mapped_column(SAEnum(TipoPropiedad, name="tipo_propiedad"), nullable=False)
    precio_desde: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    precio_hasta: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    area_desde: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    area_hasta: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    habitaciones_desde: Mapped[int | None] = mapped_column(Integer, nullable=True)
    habitaciones_hasta: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fecha_entrega: Mapped[str | None] = mapped_column(String(50), nullable=True)
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="preventa")
    imagen_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    imagenes: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    amenidades: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    financiacion_directa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    subsidio_aplicable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
