"""amplia evaluaciones.score para admitir la escala 0-1000 del motor robusto

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("evaluaciones", "score", type_=sa.Numeric(6, 2), existing_type=sa.Numeric(5, 2))


def downgrade() -> None:
    op.alter_column("evaluaciones", "score", type_=sa.Numeric(5, 2), existing_type=sa.Numeric(6, 2))
