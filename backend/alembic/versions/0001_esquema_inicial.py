"""esquema inicial

Revision ID: 0001
Revises:
Create Date: 2026-08-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "rol",
            sa.Enum("solicitante", "analista", "admin", name="rol_usuario"),
            nullable=False,
        ),
        sa.Column("nombre_completo", sa.String(255), nullable=False),
        sa.Column("telefono", sa.String(30), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "anunciantes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tipo",
            sa.Enum("particular", "inmobiliaria", "constructora", name="tipo_anunciante"),
            nullable=False,
        ),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("telefono_contacto", sa.String(30), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=True),
    )

    op.create_table(
        "propiedades",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("descripcion", sa.Text, nullable=False),
        sa.Column(
            "tipo",
            sa.Enum(
                "apartamento", "casa", "apartaestudio", "oficina", "local", "lote", "bodega",
                name="tipo_propiedad",
            ),
            nullable=False,
        ),
        sa.Column("operacion", sa.Enum("venta", "arriendo", name="operacion_propiedad"), nullable=False),
        sa.Column("precio", sa.Numeric(14, 2), nullable=False),
        sa.Column("valor_admin", sa.Numeric(12, 2), nullable=True),
        sa.Column("area_m2", sa.Numeric(10, 2), nullable=False),
        sa.Column("habitaciones", sa.Integer, nullable=False, server_default="0"),
        sa.Column("banos", sa.Integer, nullable=False, server_default="0"),
        sa.Column("parqueaderos", sa.Integer, nullable=False, server_default="0"),
        sa.Column("ciudad", sa.String(120), nullable=False),
        sa.Column("zona", sa.String(120), nullable=True),
        sa.Column("barrio", sa.String(120), nullable=True),
        sa.Column("direccion", sa.String(255), nullable=True),
        sa.Column("estrato", sa.Integer, nullable=True),
        sa.Column("anunciante_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("anunciantes.id"), nullable=False),
        sa.Column("simulador_activo", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column(
            "estado",
            sa.Enum("activo", "pausado", "arrendado", "vendido", name="estado_propiedad"),
            nullable=False,
            server_default="activo",
        ),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_propiedades_ciudad", "propiedades", ["ciudad"])

    op.create_table(
        "imagenes_propiedad",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("propiedad_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("propiedades.id"), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("orden", sa.Integer, nullable=False, server_default="0"),
    )

    op.create_table(
        "politicas_credito",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("version", sa.Integer, nullable=False),
        sa.Column("vertical", sa.Enum("compra", "arriendo", name="vertical_politica"), nullable=False),
        sa.Column("variables", postgresql.JSONB, nullable=False),
        sa.Column("bandas_decision", postgresql.JSONB, nullable=False),
        sa.Column("activa", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("autor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("motivo_cambio", sa.Text, nullable=True),
    )

    op.create_table(
        "solicitudes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("solicitante_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("propiedad_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("propiedades.id"), nullable=False),
        sa.Column("vertical", sa.Enum("compra", "arriendo", name="vertical_solicitud"), nullable=False),
        sa.Column(
            "estado",
            sa.Enum(
                "borrador", "enviada", "en_evaluacion", "revision_manual", "aprobada",
                "rechazada", "con_ruta_alterna", name="estado_solicitud",
            ),
            nullable=False,
            server_default="borrador",
        ),
        sa.Column("datos_personales", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("datos_laborales", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("datos_financieros", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("garantias_referencias", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "documentos_solicitud",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("solicitud_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("solicitudes.id"), nullable=False),
        sa.Column("tipo_documento", sa.String(120), nullable=False),
        sa.Column("url_archivo", sa.String(500), nullable=False),
        sa.Column(
            "estado",
            sa.Enum("cargado", "pendiente", "rechazado", name="estado_documento"),
            nullable=False,
            server_default="pendiente",
        ),
        sa.Column("cargado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "evaluaciones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("solicitud_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("solicitudes.id"), nullable=False),
        sa.Column(
            "politica_version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("politicas_credito.id"),
            nullable=False,
        ),
        sa.Column("score", sa.Numeric(5, 2), nullable=False),
        sa.Column("variables_evaluadas", postgresql.JSONB, nullable=False),
        sa.Column(
            "decision",
            sa.Enum("aprobada", "revision_manual", "rechazada", name="decision_evaluacion"),
            nullable=False,
        ),
        sa.Column("explicacion_generada", sa.Text, nullable=False),
        sa.Column("evaluado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "decisiones_manuales",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("evaluacion_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("evaluaciones.id"), nullable=False),
        sa.Column("analista_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column(
            "decision_final",
            sa.Enum("aprobada", "rechazada", "solicitar_info", name="decision_manual_enum"),
            nullable=False,
        ),
        sa.Column("comentario", sa.Text, nullable=False),
        sa.Column("decidido_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "auditoria",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("entidad_tipo", sa.String(80), nullable=False),
        sa.Column("entidad_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("accion", sa.String(80), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payload_antes", postgresql.JSONB, nullable=True),
        sa.Column("payload_despues", postgresql.JSONB, nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "simulaciones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("propiedad_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("propiedades.id"), nullable=True),
        sa.Column("vertical", sa.Enum("compra", "arriendo", name="vertical_simulacion"), nullable=False),
        sa.Column("inputs", postgresql.JSONB, nullable=False),
        sa.Column("resultado", postgresql.JSONB, nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("simulaciones")
    op.drop_table("auditoria")
    op.drop_table("decisiones_manuales")
    op.drop_table("evaluaciones")
    op.drop_table("documentos_solicitud")
    op.drop_table("solicitudes")
    op.drop_table("politicas_credito")
    op.drop_table("imagenes_propiedad")
    op.drop_index("ix_propiedades_ciudad", table_name="propiedades")
    op.drop_table("propiedades")
    op.drop_table("anunciantes")
    op.drop_table("usuarios")

    for enum_name in [
        "vertical_simulacion", "decision_manual_enum", "decision_evaluacion", "estado_documento",
        "estado_solicitud", "vertical_solicitud", "vertical_politica", "estado_propiedad",
        "operacion_propiedad", "tipo_propiedad", "tipo_anunciante", "rol_usuario",
    ]:
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
