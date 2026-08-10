"""registros de idempotencia (respuestas guardadas por Idempotency-Key para que
un reintento no duplique operaciones con efectos irreversibles)

Revision ID: 0012
Revises: 0011
Create Date: 2026-08-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "registros_idempotencia",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "inmobiliaria_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inmobiliarias.id"), nullable=True
        ),
        sa.Column("clave", sa.String(200), nullable=False),
        sa.Column("operacion", sa.String(80), nullable=False),
        sa.Column("huella", sa.String(64), nullable=False),
        sa.Column("respuesta", postgresql.JSONB, nullable=True),
        sa.Column("estado_http", sa.Integer, nullable=False, server_default="200"),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("inmobiliaria_id", "clave", name="uq_idempotencia_tenant_clave"),
    )
    # Índice pensado para la purga periódica de claves vencidas.
    op.create_index("ix_registros_idempotencia_creado_en", "registros_idempotencia", ["creado_en"])


def downgrade() -> None:
    op.drop_index("ix_registros_idempotencia_creado_en", table_name="registros_idempotencia")
    op.drop_table("registros_idempotencia")
