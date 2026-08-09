"""scoring de riesgo para propietario (anunciante) e inmueble (propiedad) -- F2-B3

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for tabla in ("anunciantes", "propiedades"):
        op.add_column(tabla, sa.Column("componentes_riesgo", postgresql.JSONB, nullable=True))
        op.add_column(tabla, sa.Column("score_riesgo", sa.Integer, nullable=True))
        op.add_column(tabla, sa.Column("nivel_riesgo", sa.String(30), nullable=True))


def downgrade() -> None:
    for tabla in ("anunciantes", "propiedades"):
        op.drop_column(tabla, "nivel_riesgo")
        op.drop_column(tabla, "score_riesgo")
        op.drop_column(tabla, "componentes_riesgo")
