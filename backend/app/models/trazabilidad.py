"""Trazabilidad del expediente: qué se validó, quién lo movió, qué se autorizó,
qué pasó después y a quién se le preguntó.

Siete tablas que responden preguntas que un motor de decisión debe poder contestar
frente a un cliente, un auditor o la SIC:

* ``corridas_validacion`` / ``resultados_validacion`` -- qué evaluó el motor de
  calidad de dato en cada ejecución y con qué resultado campo a campo.
* ``eventos_consistencia`` -- los hallazgos, con ciclo de vida propio: nacen en una
  corrida y alguien los resuelve dejando constancia de quién y por qué.
* ``historial_estados_solicitud`` -- append-only: quién movió el expediente y cuándo.
* ``consentimientos`` -- habeas data (Ley 1581 de 2012). Sin consentimiento vigente y
  con evidencia no se puede consultar una central de riesgo.
* ``resultados_riesgo`` -- lo que de verdad pasó con el contrato. Es el insumo del
  reentrenamiento: sin outcomes no hay modelo, solo opiniones.
* ``eventos_proveedor_externo`` -- auditoría de llamadas a terceros. Solo metadatos:
  nunca se persiste la respuesta completa de un proveedor de datos personales.
"""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CorridaValidacion(Base):
    """Una ejecución del motor de validación sobre una solicitud.

    Guarda el agregado (verificabilidad y conteos); el detalle campo a campo vive en
    ``resultados_validacion`` y los hallazgos en ``eventos_consistencia``.
    """

    __tablename__ = "corridas_validacion"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solicitud_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("solicitudes.id"), nullable=False, index=True
    )
    inmobiliaria_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inmobiliarias.id"), nullable=True, index=True
    )
    #: Usuario que disparó la corrida; NULL si la ejecutó un proceso automático.
    ejecutado_por: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True
    )
    ejecutado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    #: Índice 0-100 de qué tan soportada está la información del expediente.
    verificabilidad: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    total_campos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    campos_validos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    campos_invalidos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    campos_faltantes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    hallazgos_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    resultados: Mapped[list["ResultadoValidacion"]] = relationship(
        back_populates="corrida", cascade="all, delete-orphan"
    )


class ResultadoValidacion(Base):
    """Un campo evaluado dentro de una corrida: su estado de calidad y de dónde salió."""

    __tablename__ = "resultados_validacion"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    corrida_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("corridas_validacion.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    campo: Mapped[str] = mapped_column(String(80), nullable=False)
    etiqueta: Mapped[str] = mapped_column(String(160), nullable=False)
    #: verificado / con_soporte / declarado / sin_verificar / inconsistente
    estado: Mapped[str] = mapped_column(String(20), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(60), nullable=True)
    mensaje: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: Vista abreviada del valor, en texto. No se guardan documentos ni datos crudos.
    valor: Mapped[str | None] = mapped_column(Text, nullable=True)
    fuente: Mapped[str | None] = mapped_column(String(40), nullable=True)
    peso: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)

    corrida: Mapped[CorridaValidacion] = relationship(back_populates="resultados")


class EventoConsistencia(Base):
    """Hallazgo del motor de consistencia, con ciclo de vida.

    Una inconsistencia no es un fraude: es algo que hay que aclarar. Por eso el
    hallazgo se resuelve dejando constancia de quién lo cerró y con qué nota, en vez
    de borrarse.
    """

    __tablename__ = "eventos_consistencia"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solicitud_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("solicitudes.id"), nullable=False, index=True
    )
    corrida_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("corridas_validacion.id"), nullable=True
    )
    #: Código estable de la comprobación que lo produjo (permite agrupar y no duplicar).
    codigo_comprobacion: Mapped[str] = mapped_column(String(60), nullable=False)
    #: ERROR_DIGITACION / DATO_INUSUAL / NO_VERIFICADO / DOC_INSUFICIENTE /
    #: INCONSISTENCIA / ALERTA_FRAUDE
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    severidad: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    detalle: Mapped[str] = mapped_column(Text, nullable=False)
    #: Contexto del hallazgo (campos implicados, acción sugerida). Nunca documentos.
    valores: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    resuelto: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    resuelto_por: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True
    )
    resuelto_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    nota_resolucion: Mapped[str | None] = mapped_column(Text, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class HistorialEstadoSolicitud(Base):
    """Append-only: quién movió el expediente, de qué estado a cuál y por qué."""

    __tablename__ = "historial_estados_solicitud"
    __table_args__ = (
        Index("ix_historial_estados_solicitud_solicitud_creado", "solicitud_id", "creado_en"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solicitud_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("solicitudes.id"), nullable=False
    )
    #: NULL en la creación de la solicitud (no venía de ningún estado previo).
    estado_anterior: Mapped[str | None] = mapped_column(String(30), nullable=True)
    estado_nuevo: Mapped[str] = mapped_column(String(30), nullable=False)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True
    )
    motivo: Mapped[str | None] = mapped_column(Text, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


#: Finalidades para las que se pide autorización. Nunca un consentimiento genérico:
#: la Ley 1581 de 2012 exige finalidad determinada.
TIPOS_CONSENTIMIENTO = (
    "TRATAMIENTO_DATOS",
    "CONSULTA_CENTRALES",
    "VERIFICACION_IDENTIDAD",
    "DATOS_BANCARIOS",
)


class Consentimiento(Base):
    """Autorización de habeas data por finalidad, con su evidencia.

    Se registra la IP, el agente y la versión del texto aceptado: sin esa evidencia
    la autorización no es demostrable, y sin autorización demostrable no se puede
    consultar una central de riesgo.
    """

    __tablename__ = "consentimientos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solicitud_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("solicitudes.id"), nullable=True, index=True
    )
    #: El consentimiento es de la persona, no del trámite: se identifica por documento
    #: para poder reutilizarlo entre solicitudes de esa misma persona.
    persona_documento: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    otorgado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    #: Versión del texto de la política aceptada; permite saber qué firmó exactamente.
    texto_version: Mapped[str] = mapped_column(String(20), nullable=False)
    ip_origen: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    otorgado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    #: El titular puede revocar en cualquier momento; a partir de aquí no hay consulta.
    revocado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


#: Eventos observados DESPUÉS de la decisión. Nunca son variable de entrada del motor.
TIPOS_OUTCOME = (
    "CONTRATO_INICIADO",
    "PAGO_PUNTUAL",
    "MORA_LEVE",
    "MORA_GRAVE",
    "RESTITUCION",
    "CONTRATO_TERMINADO",
)


class ResultadoRiesgo(Base):
    """Lo que de verdad pasó con el contrato después de aprobar.

    Es el insumo del reentrenamiento: un motor sin outcomes no aprende, solo repite.
    Se registra después de la decisión y jamás se usa como variable de entrada de la
    evaluación que lo originó.
    """

    __tablename__ = "resultados_riesgo"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solicitud_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("solicitudes.id"), nullable=False, index=True
    )
    #: Evaluación cuya decisión originó el contrato, cuando se conoce.
    evaluacion_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("evaluaciones.id"), nullable=True
    )
    tipo: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    ocurrido_en: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    dias_mora: Mapped[int | None] = mapped_column(Integer, nullable=True)
    monto: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    registrado_por: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class EventoProveedorExterno(Base):
    """Metadato de una llamada a un tercero: a quién, para qué y con qué autorización.

    Deliberadamente NO tiene columna para la respuesta del proveedor. Guardar el
    reporte completo de una central de riesgo sería crear una segunda base de datos
    de datos personales sin finalidad ni caducidad definidas.
    """

    __tablename__ = "eventos_proveedor_externo"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solicitud_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("solicitudes.id"), nullable=True, index=True
    )
    proveedor: Mapped[str] = mapped_column(String(40), nullable=False)
    operacion: Mapped[str] = mapped_column(String(60), nullable=False)
    exito: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    codigo_respuesta: Mapped[str | None] = mapped_column(String(40), nullable=True)
    latencia_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    #: Autorización bajo la que se hizo la llamada. Su ausencia en una consulta a
    #: central de riesgo es, por sí sola, un hallazgo de cumplimiento.
    consentimiento_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("consentimientos.id"), nullable=True
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
