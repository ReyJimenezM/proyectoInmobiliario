"""propietarios + seguimiento publico de solicitudes + comentarios + asignacion de analista

Revision ID: 0009
Revises: 0008
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "propietarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("inmobiliaria_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inmobiliarias.id"), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("tipo_documento", sa.String(10), nullable=False, server_default="CC"),
        sa.Column("documento", sa.String(50), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("telefono", sa.String(30), nullable=True),
        sa.Column("ciudad", sa.String(120), nullable=True),
        sa.Column("componentes_riesgo", postgresql.JSONB, nullable=True),
        sa.Column("score_riesgo", sa.Integer, nullable=True),
        sa.Column("nivel_riesgo", sa.String(30), nullable=True),
        sa.Column("notas", sa.Text, nullable=True),
        sa.Column("activo", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.add_column("solicitudes", sa.Column("codigo_seguimiento", sa.String(8), nullable=True))
    op.create_unique_constraint("uq_solicitudes_codigo_seguimiento", "solicitudes", ["codigo_seguimiento"])
    op.add_column(
        "solicitudes",
        sa.Column(
            "analista_asignado_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=True
        ),
    )

    # Nuevo estado de documento: "aprobado" (revision manual de un documento cargado).
    op.execute("ALTER TYPE estado_documento ADD VALUE IF NOT EXISTS 'aprobado'")

    op.create_table(
        "comentarios_solicitud",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("solicitud_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("solicitudes.id"), nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("texto", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("comentarios_solicitud")
    # No se revierte el valor 'aprobado' del enum estado_documento: PostgreSQL no
    # soporta remover valores de un enum sin recrearlo por completo.
    op.drop_column("solicitudes", "analista_asignado_id")
    op.drop_constraint("uq_solicitudes_codigo_seguimiento", "solicitudes", type_="unique")
    op.drop_column("solicitudes", "codigo_seguimiento")
    op.drop_table("propietarios")
