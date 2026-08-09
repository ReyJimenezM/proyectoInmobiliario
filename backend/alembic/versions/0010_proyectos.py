"""proyectos (catalogo publico de proyectos nuevos de construccion)

Revision ID: 0010
Revises: 0009
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Reutiliza el tipo ENUM "tipo_propiedad" creado en 0001 (no lo vuelve a crear).
    tipo_propiedad = postgresql.ENUM(
        "apartamento", "casa", "apartaestudio", "oficina", "local", "lote", "bodega",
        name="tipo_propiedad", create_type=False,
    )

    op.create_table(
        "proyectos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("inmobiliaria_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inmobiliarias.id"), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("constructora", sa.String(255), nullable=False),
        sa.Column("descripcion", sa.Text, nullable=True),
        sa.Column("ciudad", sa.String(120), nullable=False),
        sa.Column("zona", sa.String(120), nullable=True),
        sa.Column("direccion", sa.String(255), nullable=True),
        sa.Column("tipo", tipo_propiedad, nullable=False),
        sa.Column("precio_desde", sa.Numeric(18, 2), nullable=True),
        sa.Column("precio_hasta", sa.Numeric(18, 2), nullable=True),
        sa.Column("area_desde", sa.Numeric(8, 2), nullable=True),
        sa.Column("area_hasta", sa.Numeric(8, 2), nullable=True),
        sa.Column("habitaciones_desde", sa.Integer, nullable=True),
        sa.Column("habitaciones_hasta", sa.Integer, nullable=True),
        sa.Column("fecha_entrega", sa.String(50), nullable=True),
        sa.Column("estado", sa.String(30), nullable=False, server_default="preventa"),
        sa.Column("imagen_url", sa.String(500), nullable=True),
        sa.Column("imagenes", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("amenidades", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("financiacion_directa", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("subsidio_aplicable", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("activo", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_proyectos_ciudad", "proyectos", ["ciudad"])


def downgrade() -> None:
    op.drop_index("ix_proyectos_ciudad", table_name="proyectos")
    op.drop_table("proyectos")
