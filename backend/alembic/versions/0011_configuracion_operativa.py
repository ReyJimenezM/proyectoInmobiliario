"""configuraciones operativas (parametría flexible por tenant: sla/flags/motivos,
requisitos documentales configurables y overrides de catálogos operativos)

Revision ID: 0011
Revises: 0010
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "configuraciones_operativas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "inmobiliaria_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inmobiliarias.id"), nullable=True
        ),
        sa.Column("clave", sa.String(120), nullable=False),
        sa.Column("valor", postgresql.JSONB, nullable=False),
        sa.Column("actualizado_por", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("inmobiliaria_id", "clave", name="uq_config_operativa_tenant_clave"),
    )
    op.create_index("ix_configuraciones_operativas_clave", "configuraciones_operativas", ["clave"])


def downgrade() -> None:
    op.drop_index("ix_configuraciones_operativas_clave", table_name="configuraciones_operativas")
    op.drop_table("configuraciones_operativas")
