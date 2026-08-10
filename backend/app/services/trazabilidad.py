"""Escritura de la trazabilidad del expediente.

Este módulo **no calcula nada**: recibe resultados ya producidos por el motor de
validación (``app/services/validacion.py``) y los persiste. La separación importa:
si persistir y evaluar vivieran juntos, cada guardado podría cambiar el veredicto.

Todas las funciones hacen ``db.add`` + ``db.flush()`` y **nunca** ``commit``. El
commit es de quien orquesta la transacción: así una corrida de validación y el
cambio de estado que la acompaña se guardan o se pierden juntos, nunca a medias.
"""
import hashlib
import re
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.trazabilidad import (
    TIPOS_CONSENTIMIENTO,
    TIPOS_OUTCOME,
    Consentimiento,
    CorridaValidacion,
    EventoConsistencia,
    EventoProveedorExterno,
    HistorialEstadoSolicitud,
    ResultadoRiesgo,
    ResultadoValidacion,
)

#: Estados de calidad que cuentan como campo respaldado.
_ESTADOS_VALIDOS = {"verificado", "con_soporte"}
#: Estado que indica que el dato se contradice con otro del expediente.
_ESTADOS_INVALIDOS = {"inconsistente"}


def _codigo_comprobacion(hallazgo: dict) -> str:
    """Código estable que identifica la comprobación que produjo el hallazgo.

    El motor de validación no emite un código propio, así que se deriva del tipo y
    del título. Es determinista: la misma comprobación produce el mismo código en
    cada corrida, que es justo lo que permite no duplicar un hallazgo ya abierto.
    """
    tipo = str(hallazgo.get("tipo") or "HALLAZGO")
    titulo = str(hallazgo.get("titulo") or "")
    base = re.sub(r"[^a-z0-9]+", "_", titulo.lower()).strip("_")[:32]
    firma = hashlib.sha256(f"{tipo}|{titulo}".encode("utf-8")).hexdigest()[:8]
    return f"{tipo}:{base}:{firma}" if base else f"{tipo}:{firma}"


def _texto(valor) -> str | None:
    if valor is None:
        return None
    texto = str(valor)
    return texto if texto.strip() else None


def registrar_corrida_validacion(
    db: Session,
    solicitud_id: uuid.UUID,
    resultado: dict,
    actor_id: uuid.UUID | None = None,
    inmobiliaria_id: uuid.UUID | None = None,
) -> CorridaValidacion:
    """Persiste una corrida completa: agregado, detalle por campo y hallazgos.

    ``resultado`` es exactamente lo que devuelve ``validar_solicitud``: no se
    recalcula ni se reinterpreta nada, solo se guarda lo ya decidido.

    Los hallazgos ya abiertos y sin resolver no se duplican: se reapunta el hallazgo
    existente a la corrida nueva. De lo contrario, cada consulta de la pantalla de
    validación crearía copias del mismo problema y el analista perdería la nota de
    resolución que ya había escrito.
    """
    calidad = list(resultado.get("calidad") or [])
    hallazgos = list(resultado.get("hallazgos") or [])

    campos_validos = sum(1 for c in calidad if c.get("estado") in _ESTADOS_VALIDOS)
    campos_invalidos = sum(1 for c in calidad if c.get("estado") in _ESTADOS_INVALIDOS)
    campos_faltantes = sum(1 for c in calidad if _texto(c.get("valor")) is None)

    corrida = CorridaValidacion(
        id=uuid.uuid4(),
        solicitud_id=solicitud_id,
        inmobiliaria_id=inmobiliaria_id,
        ejecutado_por=actor_id,
        verificabilidad=resultado.get("verificabilidad"),
        total_campos=len(calidad),
        campos_validos=campos_validos,
        campos_invalidos=campos_invalidos,
        campos_faltantes=campos_faltantes,
        hallazgos_count=len(hallazgos),
    )
    db.add(corrida)
    db.flush()

    for campo in calidad:
        db.add(
            ResultadoValidacion(
                id=uuid.uuid4(),
                corrida_id=corrida.id,
                campo=str(campo.get("campo") or "")[:80],
                etiqueta=str(campo.get("etiqueta") or campo.get("campo") or "")[:160],
                estado=str(campo.get("estado") or "declarado")[:20],
                codigo=(_texto(campo.get("codigo")) or None),
                mensaje=_texto(campo.get("estado_etiqueta")),
                valor=_texto(campo.get("valor")),
                fuente=(_texto(campo.get("fuente")) or "")[:40] or None,
                peso=campo.get("peso"),
            )
        )

    abiertos = {
        evento.codigo_comprobacion: evento
        for evento in db.execute(
            select(EventoConsistencia).where(
                EventoConsistencia.solicitud_id == solicitud_id,
                EventoConsistencia.resuelto.is_(False),
            )
        ).scalars()
    }

    for hallazgo in hallazgos:
        codigo = _codigo_comprobacion(hallazgo)
        existente = abiertos.get(codigo)
        if existente is not None:
            existente.corrida_id = corrida.id
            continue
        evento = EventoConsistencia(
            id=uuid.uuid4(),
            solicitud_id=solicitud_id,
            corrida_id=corrida.id,
            codigo_comprobacion=codigo[:60],
            tipo=str(hallazgo.get("tipo") or "INCONSISTENCIA")[:30],
            severidad=int(hallazgo.get("severidad") or 1),
            titulo=str(hallazgo.get("titulo") or "Hallazgo sin título")[:200],
            detalle=str(hallazgo.get("detalle") or ""),
            valores={
                "campos": hallazgo.get("campos") or [],
                "accion": hallazgo.get("accion"),
                "tipo_etiqueta": hallazgo.get("tipo_etiqueta"),
            },
        )
        db.add(evento)
        abiertos[codigo] = evento

    db.flush()
    return corrida


def resolver_hallazgo(
    db: Session,
    evento_id: uuid.UUID,
    actor_id: uuid.UUID | None,
    nota: str | None = None,
) -> EventoConsistencia | None:
    """Cierra un hallazgo dejando constancia de quién y con qué justificación.

    No borra: un hallazgo resuelto sigue siendo parte de la historia del expediente.
    Devuelve None si el evento no existe.
    """
    evento = db.get(EventoConsistencia, evento_id)
    if evento is None:
        return None
    evento.resuelto = True
    evento.resuelto_por = actor_id
    evento.resuelto_en = datetime.now(timezone.utc)
    evento.nota_resolucion = nota
    db.add(evento)
    db.flush()
    return evento


def registrar_cambio_estado(
    db: Session,
    solicitud_id: uuid.UUID,
    anterior: str | None,
    nuevo: str,
    actor_id: uuid.UUID | None = None,
    motivo: str | None = None,
) -> HistorialEstadoSolicitud:
    """Anota un movimiento del expediente. Append-only: nunca se edita ni se borra."""
    registro = HistorialEstadoSolicitud(
        id=uuid.uuid4(),
        solicitud_id=solicitud_id,
        estado_anterior=(anterior[:30] if anterior else None),
        estado_nuevo=str(nuevo)[:30],
        actor_id=actor_id,
        motivo=motivo,
    )
    db.add(registro)
    db.flush()
    return registro


def registrar_consentimiento(
    db: Session,
    persona_documento: str,
    tipo: str,
    otorgado: bool,
    texto_version: str,
    solicitud_id: uuid.UUID | None = None,
    ip_origen: str | None = None,
    user_agent: str | None = None,
) -> Consentimiento:
    """Registra una autorización de habeas data con su evidencia.

    La IP, el agente y la versión del texto no son adorno: son lo que permite probar
    ante la SIC qué autorizó exactamente el titular y cuándo.
    """
    if tipo not in TIPOS_CONSENTIMIENTO:
        raise ValueError(f"Tipo de consentimiento desconocido: {tipo}")
    consentimiento = Consentimiento(
        id=uuid.uuid4(),
        solicitud_id=solicitud_id,
        persona_documento=str(persona_documento)[:30],
        tipo=tipo,
        otorgado=bool(otorgado),
        texto_version=str(texto_version)[:20],
        ip_origen=(ip_origen[:45] if ip_origen else None),
        user_agent=user_agent,
    )
    db.add(consentimiento)
    db.flush()
    return consentimiento


def tiene_consentimiento(db: Session, documento: str, tipo: str) -> bool:
    """¿Esa persona autorizó esa finalidad y la autorización sigue vigente?

    Un consentimiento revocado no vale, aunque exista el registro. Consultar sin
    esto es exactamente la infracción que la Ley 1581 sanciona.
    """
    consentimiento = db.execute(
        select(Consentimiento)
        .where(
            Consentimiento.persona_documento == str(documento)[:30],
            Consentimiento.tipo == tipo,
            Consentimiento.otorgado.is_(True),
            Consentimiento.revocado_en.is_(None),
        )
        .order_by(Consentimiento.otorgado_en.desc())
        .limit(1)
    ).scalar_one_or_none()
    return consentimiento is not None


def revocar_consentimiento(db: Session, consentimiento_id: uuid.UUID) -> Consentimiento | None:
    """Marca la revocación. El registro se conserva: revocar no es borrar."""
    consentimiento = db.get(Consentimiento, consentimiento_id)
    if consentimiento is None:
        return None
    consentimiento.revocado_en = datetime.now(timezone.utc)
    db.add(consentimiento)
    db.flush()
    return consentimiento


def registrar_outcome(
    db: Session,
    solicitud_id: uuid.UUID,
    tipo: str,
    ocurrido_en: date,
    evaluacion_id: uuid.UUID | None = None,
    dias_mora: int | None = None,
    monto: float | None = None,
    notas: str | None = None,
    registrado_por: uuid.UUID | None = None,
) -> ResultadoRiesgo:
    """Registra lo que realmente pasó con el contrato.

    Es la única fuente legítima para medir si el motor acierta. Sin outcomes no hay
    forma de saber si una política aprueba bien o simplemente aprueba mucho.
    """
    if tipo not in TIPOS_OUTCOME:
        raise ValueError(f"Tipo de outcome desconocido: {tipo}")
    outcome = ResultadoRiesgo(
        id=uuid.uuid4(),
        solicitud_id=solicitud_id,
        evaluacion_id=evaluacion_id,
        tipo=tipo,
        ocurrido_en=ocurrido_en,
        dias_mora=dias_mora,
        monto=monto,
        notas=notas,
        registrado_por=registrado_por,
    )
    db.add(outcome)
    db.flush()
    return outcome


def registrar_evento_proveedor(
    db: Session,
    proveedor: str,
    operacion: str,
    exito: bool,
    solicitud_id: uuid.UUID | None = None,
    codigo_respuesta: str | None = None,
    latencia_ms: int | None = None,
    consentimiento_id: uuid.UUID | None = None,
) -> EventoProveedorExterno:
    """Deja constancia de una llamada a un tercero.

    Solo metadatos, por diseño: a quién se le preguntó, para qué, si respondió y
    bajo qué autorización. La respuesta del proveedor no se persiste nunca.
    """
    evento = EventoProveedorExterno(
        id=uuid.uuid4(),
        solicitud_id=solicitud_id,
        proveedor=str(proveedor)[:40],
        operacion=str(operacion)[:60],
        exito=bool(exito),
        codigo_respuesta=(codigo_respuesta[:40] if codigo_respuesta else None),
        latencia_ms=latencia_ms,
        consentimiento_id=consentimiento_id,
    )
    db.add(evento)
    db.flush()
    return evento
