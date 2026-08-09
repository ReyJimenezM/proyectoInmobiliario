"""auditoria append-only a nivel de base de datos

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-08

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION bloquear_modificacion_auditoria()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'La tabla auditoria es append-only: % no permitido', TG_OP;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_auditoria_bloquear_update
        BEFORE UPDATE ON auditoria
        FOR EACH ROW EXECUTE FUNCTION bloquear_modificacion_auditoria();
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_auditoria_bloquear_delete
        BEFORE DELETE ON auditoria
        FOR EACH ROW EXECUTE FUNCTION bloquear_modificacion_auditoria();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_auditoria_bloquear_delete ON auditoria;")
    op.execute("DROP TRIGGER IF EXISTS trg_auditoria_bloquear_update ON auditoria;")
    op.execute("DROP FUNCTION IF EXISTS bloquear_modificacion_auditoria();")
