import uuid
from datetime import datetime

from sqlalchemy import String, Text, Numeric, Integer, Boolean, DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import TipoPropiedad, OperacionPropiedad, EstadoPropiedad


class Propiedad(Base):
    __tablename__ = "propiedades"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[TipoPropiedad] = mapped_column(Enum(TipoPropiedad, name="tipo_propiedad"), nullable=False)
    operacion: Mapped[OperacionPropiedad] = mapped_column(
        Enum(OperacionPropiedad, name="operacion_propiedad"), nullable=False
    )
    precio: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    valor_admin: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    area_m2: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    habitaciones: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    banos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    parqueaderos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ciudad: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    zona: Mapped[str | None] = mapped_column(String(120), nullable=True)
    barrio: Mapped[str | None] = mapped_column(String(120), nullable=True)
    direccion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    estrato: Mapped[int | None] = mapped_column(Integer, nullable=True)
    anunciante_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("anunciantes.id"), nullable=False)
    inmobiliaria_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inmobiliarias.id"), nullable=False
    )
    simulador_activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    estado: Mapped[EstadoPropiedad] = mapped_column(
        Enum(EstadoPropiedad, name="estado_propiedad"), nullable=False, default=EstadoPropiedad.activo
    )
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Scoring de riesgo del inmueble (F2-B3): componentes 0-100 (documentacion, titularidad
    # registral, ubicacion, estado, propiedad horizontal, restricciones/gravamenes, precio,
    # consistencia declarado vs. documento); score_riesgo escalado a 0-1000.
    componentes_riesgo: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    score_riesgo: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nivel_riesgo: Mapped[str | None] = mapped_column(String(30), nullable=True)

    imagenes: Mapped[list["ImagenPropiedad"]] = relationship(back_populates="propiedad", cascade="all, delete-orphan")
    anunciante: Mapped["Anunciante"] = relationship()


class ImagenPropiedad(Base):
    __tablename__ = "imagenes_propiedad"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    propiedad_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("propiedades.id"), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    propiedad: Mapped["Propiedad"] = relationship(back_populates="imagenes")
