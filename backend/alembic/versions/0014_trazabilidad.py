"""trazabilidad del expediente: corridas de validacion, hallazgos con ciclo de vida,
historial de estados, consentimientos de habeas data, outcomes de riesgo y auditoria
de llamadas a proveedores externos

Revision ID: 0014
Revises: 0013
Create Date: 2026-08-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Corridas del motor de validacion y su detalle campo a campo
    # ------------------------------------------------------------------
    op.create_table(
        "corridas_validacion",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "solicitud_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("solicitudes.id"), nullable=False
        ),
        sa.Column(
            "inmobiliaria_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inmobiliarias.id"), nullable=True
        ),
        sa.Column("ejecutado_por", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("ejecutado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("verificabilidad", sa.Numeric(5, 2), nullable=True),
        sa.Column("total_campos", sa.Integer, nullable=False, server_default="0"),
        sa.Column("campos_validos", sa.Integer, nullable=False, server_default="0"),
        sa.Column("campos_invalidos", sa.Integer, nullable=False, server_default="0"),
        sa.Column("campos_faltantes", sa.Integer, nullable=False, server_default="0"),
        sa.Column("hallazgos_count", sa.Integer, nullable=False, server_default="0"),
    )
    op.create_index("ix_corridas_validacion_solicitud_id", "corridas_validacion", ["solicitud_id"])
    op.create_index("ix_corridas_validacion_inmobiliaria_id", "corridas_validacion", ["inmobiliaria_id"])

    op.create_table(
        "resultados_validacion",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "corrida_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("corridas_validacion.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("campo", sa.String(80), nullable=False),
        sa.Column("etiqueta", sa.String(160), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("codigo", sa.String(60), nullable=True),
        sa.Column("mensaje", sa.Text, nullable=True),
        sa.Column("valor", sa.Text, nullable=True),
        sa.Column("fuente", sa.String(40), nullable=True),
        sa.Column("peso", sa.Numeric(3, 2), nullable=True),
    )
    op.create_index("ix_resultados_validacion_corrida_id", "resultados_validacion", ["corrida_id"])

    # ------------------------------------------------------------------
    # Hallazgos de consistencia (se resuelven, no se borran)
    # ------------------------------------------------------------------
    op.create_table(
        "eventos_consistencia",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "solicitud_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("solicitudes.id"), nullable=False
        ),
        sa.Column(
            "corrida_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("corridas_validacion.id"), nullable=True
        ),
        sa.Column("codigo_comprobacion", sa.String(60), nullable=False),
        sa.Column("tipo", sa.String(30), nullable=False),
        sa.Column("severidad", sa.Integer, nullable=False, server_default="1"),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("detalle", sa.Text, nullable=False),
        sa.Column("valores", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("resuelto", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("resuelto_por", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("resuelto_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("nota_resolucion", sa.Text, nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_eventos_consistencia_solicitud_id", "eventos_consistencia", ["solicitud_id"])

    # ------------------------------------------------------------------
    # Historial de estados (append-only)
    # ------------------------------------------------------------------
    op.create_table(
        "historial_estados_solicitud",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "solicitud_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("solicitudes.id"), nullable=False
        ),
        sa.Column("estado_anterior", sa.String(30), nullable=True),
        sa.Column("estado_nuevo", sa.String(30), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("motivo", sa.Text, nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_historial_estados_solicitud_solicitud_creado",
        "historial_estados_solicitud",
        ["solicitud_id", "creado_en"],
    )

    # ------------------------------------------------------------------
    # Consentimientos de habeas data (Ley 1581 de 2012)
    # ------------------------------------------------------------------
    op.create_table(
        "consentimientos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "solicitud_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("solicitudes.id"), nullable=True
        ),
        sa.Column("persona_documento", sa.String(30), nullable=False),
        sa.Column("tipo", sa.String(40), nullable=False),
        sa.Column("otorgado", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("texto_version", sa.String(20), nullable=False),
        sa.Column("ip_origen", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text, nullable=True),
        sa.Column("otorgado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("revocado_en", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_consentimientos_solicitud_id", "consentimientos", ["solicitud_id"])
    # Busqueda tipica: ¿esta persona autorizo esta finalidad y sigue vigente?
    op.create_index("ix_consentimientos_documento_tipo", "consentimientos", ["persona_documento", "tipo"])

    # ------------------------------------------------------------------
    # Outcomes: lo que paso despues de la decision (insumo del reentrenamiento)
    # ------------------------------------------------------------------
    op.create_table(
        "resultados_riesgo",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "solicitud_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("solicitudes.id"), nullable=False
        ),
        sa.Column(
            "evaluacion_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("evaluaciones.id"), nullable=True
        ),
        sa.Column("tipo", sa.String(30), nullable=False),
        sa.Column("ocurrido_en", sa.Date, nullable=False),
        sa.Column("dias_mora", sa.Integer, nullable=True),
        sa.Column("monto", sa.Numeric(18, 2), nullable=True),
        sa.Column("notas", sa.Text, nullable=True),
        sa.Column("registrado_por", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_resultados_riesgo_solicitud_id", "resultados_riesgo", ["solicitud_id"])
    op.create_index("ix_resultados_riesgo_tipo", "resultados_riesgo", ["tipo"])
    op.create_index("ix_resultados_riesgo_ocurrido_en", "resultados_riesgo", ["ocurrido_en"])

    # ------------------------------------------------------------------
    # Auditoria de proveedores externos (solo metadatos, nunca la respuesta)
    # ------------------------------------------------------------------
    op.create_table(
        "eventos_proveedor_externo",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "solicitud_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("solicitudes.id"), nullable=True
        ),
        sa.Column("proveedor", sa.String(40), nullable=False),
        sa.Column("operacion", sa.String(60), nullable=False),
        sa.Column("exito", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("codigo_respuesta", sa.String(40), nullable=True),
        sa.Column("latencia_ms", sa.Integer, nullable=True),
        sa.Column(
            "consentimiento_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("consentimientos.id"),
            nullable=True,
        ),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_eventos_proveedor_externo_solicitud_id", "eventos_proveedor_externo", ["solicitud_id"])
    op.create_index("ix_eventos_proveedor_externo_creado_en", "eventos_proveedor_externo", ["creado_en"])


def downgrade() -> None:
    op.drop_index("ix_eventos_proveedor_externo_creado_en", table_name="eventos_proveedor_externo")
    op.drop_index("ix_eventos_proveedor_externo_solicitud_id", table_name="eventos_proveedor_externo")
    op.drop_table("eventos_proveedor_externo")

    op.drop_index("ix_resultados_riesgo_ocurrido_en", table_name="resultados_riesgo")
    op.drop_index("ix_resultados_riesgo_tipo", table_name="resultados_riesgo")
    op.drop_index("ix_resultados_riesgo_solicitud_id", table_name="resultados_riesgo")
    op.drop_table("resultados_riesgo")

    op.drop_index("ix_consentimientos_documento_tipo", table_name="consentimientos")
    op.drop_index("ix_consentimientos_solicitud_id", table_name="consentimientos")
    op.drop_table("consentimientos")

    op.drop_index("ix_historial_estados_solicitud_solicitud_creado", table_name="historial_estados_solicitud")
    op.drop_table("historial_estados_solicitud")

    op.drop_index("ix_eventos_consistencia_solicitud_id", table_name="eventos_consistencia")
    op.drop_table("eventos_consistencia")

    op.drop_index("ix_resultados_validacion_corrida_id", table_name="resultados_validacion")
    op.drop_table("resultados_validacion")

    op.drop_index("ix_corridas_validacion_inmobiliaria_id", table_name="corridas_validacion")
    op.drop_index("ix_corridas_validacion_solicitud_id", table_name="corridas_validacion")
    op.drop_table("corridas_validacion")
