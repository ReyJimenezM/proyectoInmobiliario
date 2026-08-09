"""evaluaciones puede referenciar un motores_decision (motor robusto) en vez de una
politica_credito -- exactamente una de las dos FK va poblada, decidido en motor_client.py.

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("evaluaciones", "politica_version_id", nullable=True)
    op.add_column(
        "evaluaciones",
        sa.Column(
            "motor_version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("motores_decision.id"), nullable=True
        ),
    )


def downgrade() -> None:
    op.drop_column("evaluaciones", "motor_version_id")
    op.alter_column("evaluaciones", "politica_version_id", nullable=False)
