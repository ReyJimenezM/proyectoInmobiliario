"""tabla motores_decision (motor robusto versionado, Fase 2)

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "motores_decision",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("inmobiliaria_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inmobiliarias.id"), nullable=False),
        sa.Column("version", sa.String(20), nullable=False),
        sa.Column("autor", sa.String(255), nullable=False),
        sa.Column("pesos", postgresql.JSONB, nullable=False),
        sa.Column("parametros", postgresql.JSONB, nullable=False),
        sa.Column("reglas", postgresql.JSONB, nullable=False),
        sa.Column("activa", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("autor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("notas", sa.Text, nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("motores_decision")
