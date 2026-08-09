"""multi-tenant: inmobiliarias + roles ampliados + scoping

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"


def upgrade() -> None:
    op.create_table(
        "inmobiliarias",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("nombre_legal", sa.String(255), nullable=False),
        sa.Column("nombre_comercial", sa.String(120), nullable=False),
        sa.Column("nit", sa.String(30), nullable=True),
        sa.Column("direccion", sa.String(255), nullable=True),
        sa.Column("telefono", sa.String(30), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("color_primario", sa.String(7), nullable=False, server_default="#C2410C"),
        sa.Column("color_acento", sa.String(7), nullable=False, server_default="#B45309"),
        sa.Column("activa", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.execute(
        f"""
        INSERT INTO inmobiliarias (id, nombre_legal, nombre_comercial, nit, color_primario, color_acento)
        VALUES ('{DEFAULT_TENANT_ID}', 'Raiz Inmobiliaria S.A.S.', 'Raiz', '900.000.000-1', '#C2410C', '#B45309')
        """
    )

    # Ampliar el enum de roles (los valores nuevos se agregan, no se reemplazan).
    for nuevo_rol in ("super_admin", "asesor", "consulta"):
        op.execute(f"ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS '{nuevo_rol}'")


def downgrade() -> None:
    op.drop_table("inmobiliarias")
    # No se revierten los valores del enum rol_usuario: PostgreSQL no soporta
    # remover valores de un enum sin recrearlo por completo.
