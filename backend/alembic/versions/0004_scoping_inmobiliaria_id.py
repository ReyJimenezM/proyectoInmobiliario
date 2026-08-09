"""agrega inmobiliaria_id (scoping de tenant) a usuarios, anunciantes, propiedades,
politicas_credito y solicitudes, con backfill al tenant por defecto.

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"

# (tabla, es_obligatorio_tras_backfill)
TABLAS_SCOPED = [
    ("usuarios", False),  # solicitantes y super_admin quedan sin tenant (NULL)
    ("anunciantes", True),
    ("propiedades", True),
    ("politicas_credito", True),
    ("solicitudes", True),
]


def upgrade() -> None:
    for tabla, _ in TABLAS_SCOPED:
        op.add_column(
            tabla,
            sa.Column(
                "inmobiliaria_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inmobiliarias.id"), nullable=True
            ),
        )

    # Backfill: todo lo existente pertenece al tenant por defecto creado en 0003.
    op.execute(f"UPDATE anunciantes SET inmobiliaria_id = '{DEFAULT_TENANT_ID}'")
    op.execute(f"UPDATE propiedades SET inmobiliaria_id = '{DEFAULT_TENANT_ID}'")
    op.execute(f"UPDATE politicas_credito SET inmobiliaria_id = '{DEFAULT_TENANT_ID}'")
    op.execute(f"UPDATE solicitudes SET inmobiliaria_id = '{DEFAULT_TENANT_ID}'")
    op.execute(
        f"UPDATE usuarios SET inmobiliaria_id = '{DEFAULT_TENANT_ID}' "
        "WHERE rol IN ('admin', 'analista', 'asesor', 'consulta')"
    )

    for tabla, obligatorio in TABLAS_SCOPED:
        if obligatorio:
            op.alter_column(tabla, "inmobiliaria_id", nullable=False)


def downgrade() -> None:
    for tabla, _ in TABLAS_SCOPED:
        op.drop_column(tabla, "inmobiliaria_id")
