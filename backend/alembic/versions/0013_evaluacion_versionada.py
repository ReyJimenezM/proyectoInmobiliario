"""evaluacion versionada e inmutable (snapshot del motor, reglas duras, driver de la
decision) + estados nuevos de solicitud: incompleta y cancelada.

El snapshot es lo que hace la evaluacion auditable: publicar una version nueva del motor
no puede cambiar lo que decia una evaluacion de hace seis meses.

Nota: `motor_version_id` ya existe desde la migracion 0007; aqui solo se agregan las tres
columnas restantes.

Revision ID: 0013
Revises: 0012
Create Date: 2026-08-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Valores nuevos del enum estado_solicitud. ADD VALUE IF NOT EXISTS es idempotente y no
# falla si el valor ya esta (por ejemplo si la base se creo con create_all).
_ESTADOS_NUEVOS = ("incompleta", "cancelada")


def upgrade() -> None:
    op.add_column("evaluaciones", sa.Column("snapshot_motor", postgresql.JSONB, nullable=True))
    op.add_column("evaluaciones", sa.Column("reglas_duras", postgresql.JSONB, nullable=True))
    op.add_column("evaluaciones", sa.Column("decision_driver", sa.String(20), nullable=True))

    if op.get_bind().dialect.name == "postgresql":
        # ALTER TYPE ... ADD VALUE no corre dentro de un bloque transaccional en PG < 12;
        # con autocommit_block funciona en cualquier version soportada.
        with op.get_context().autocommit_block():
            for valor in _ESTADOS_NUEVOS:
                op.execute(f"ALTER TYPE estado_solicitud ADD VALUE IF NOT EXISTS '{valor}'")


def downgrade() -> None:
    # Los valores del enum no se eliminan: PostgreSQL no soporta DROP VALUE y quitarlos
    # implicaria recrear el tipo y reescribir las filas que ya los usan.
    op.drop_column("evaluaciones", "decision_driver")
    op.drop_column("evaluaciones", "reglas_duras")
    op.drop_column("evaluaciones", "snapshot_motor")
