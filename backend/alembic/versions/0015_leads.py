"""leads comerciales capturados por la landing (CRM)

Revision ID: 0015
Revises: 0014
Create Date: 2026-08-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "leads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("codigo", sa.String(20), nullable=False, unique=True),
        # Nullable: la landing publica no sabe a que inmobiliaria pertenece el contacto.
        # Se asigna cuando alguien de un equipo lo gestiona por primera vez.
        sa.Column(
            "inmobiliaria_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inmobiliarias.id"), nullable=True
        ),
        sa.Column(
            "tipo",
            sa.Enum("inmobiliaria", "arrendatario", "propietario", name="tipo_lead"),
            nullable=False,
        ),
        sa.Column("nombre", sa.String(160), nullable=False),
        sa.Column("correo", sa.String(160), nullable=False),
        sa.Column("telefono", sa.String(40), nullable=False),
        sa.Column("empresa", sa.String(160), nullable=True),
        sa.Column("ciudad", sa.String(120), nullable=True),
        sa.Column("inmuebles", sa.String(40), nullable=True),
        sa.Column("interes", sa.String(200), nullable=True),
        sa.Column("mensaje", sa.Text, nullable=True),
        sa.Column("origen", sa.String(60), nullable=False, server_default="landing"),
        sa.Column("utm_source", sa.String(120), nullable=True),
        sa.Column("utm_medium", sa.String(120), nullable=True),
        sa.Column("utm_campaign", sa.String(120), nullable=True),
        sa.Column("pagina", sa.String(300), nullable=True),
        sa.Column(
            "estado",
            sa.Enum("nuevo", "contactado", "en_gestion", "calificado", "ganado", "perdido", name="estado_lead"),
            nullable=False,
            server_default="nuevo",
        ),
        sa.Column("asesor", sa.String(160), nullable=True),
        sa.Column("nota", sa.Text, nullable=True),
        sa.Column("agendado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_origen", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text, nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("ultima_gestion", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # El listado del CRM ordena por fecha y filtra por tenant y estado.
    op.create_index("ix_leads_inmobiliaria_id", "leads", ["inmobiliaria_id"])
    op.create_index("ix_leads_estado", "leads", ["estado"])
    op.create_index("ix_leads_creado_en", "leads", ["creado_en"])


def downgrade() -> None:
    op.drop_index("ix_leads_creado_en", table_name="leads")
    op.drop_index("ix_leads_estado", table_name="leads")
    op.drop_index("ix_leads_inmobiliaria_id", table_name="leads")
    op.drop_table("leads")
    sa.Enum(name="estado_lead").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="tipo_lead").drop(op.get_bind(), checkfirst=True)
