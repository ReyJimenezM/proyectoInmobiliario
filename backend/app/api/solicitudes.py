import random
import string
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, requiere_analista_o_admin, requiere_staff
from app.db.session import get_db
from app.models.auditoria import Auditoria
from app.models.comentario_solicitud import ComentarioSolicitud
from app.models.documento_solicitud import DocumentoSolicitud
from app.models.enums import EstadoSolicitud, RolUsuario
from app.models.evaluacion import Evaluacion
from app.models.motor_decision_config import MotorDecisionConfig
from app.models.politica_credito import PoliticaCredito
from app.models.propiedad import Propiedad
from app.models.solicitud import Solicitud
from app.models.usuario import Usuario
from app.schemas.solicitud import (
    ComentarioIn,
    ComentarioOut,
    ConsultarEstadoIn,
    ConsultarEstadoOut,
    DatosFinancierosIn,
    DatosLaboralesIn,
    DatosPersonalesIn,
    EnviarSolicitudIn,
    EventoTimelineOut,
    GarantiasReferenciasIn,
    ResultadoSolicitudOut,
    SolicitudCrearIn,
    SolicitudOut,
)
from app.services import motor_client
from app.services.auditoria import registrar
from app.services.checklist_documentos import documentos_requeridos
from app.services.flujo import ESTADOS_EDITABLES, transicionar, verificar_editable

router = APIRouter(prefix="/api/solicitudes", tags=["solicitudes"])

_ALFABETO_CODIGO = string.ascii_uppercase + string.digits


def _generar_codigo_seguimiento(db: Session) -> str:
    """Codigo corto de 8 caracteres, unico, para consulta publica del estado (sin login)."""
    while True:
        codigo = "".join(random.choices(_ALFABETO_CODIGO, k=8))
        existe = db.execute(select(Solicitud.id).where(Solicitud.codigo_seguimiento == codigo)).scalar()
        if existe is None:
            return codigo


# Mensaje unico para "no existe" y para "existe pero no es tuya". Un 403 distinto del 404
# confirmaria la existencia del recurso a quien no debe verlo (enumeracion entre tenants).
_SOLICITUD_NO_EXISTE = "La solicitud no existe."


def _obtener_solicitud_propia_o_404(
    solicitud_id: uuid.UUID, usuario: Usuario, db: Session, estados_permitidos: set[EstadoSolicitud] | None = None
) -> Solicitud:
    solicitud = db.get(Solicitud, solicitud_id)
    if solicitud is None:
        raise HTTPException(404, _SOLICITUD_NO_EXISTE)
    if usuario.rol == RolUsuario.solicitante and solicitud.solicitante_id != usuario.id:
        raise HTTPException(404, _SOLICITUD_NO_EXISTE)
    if usuario.rol not in (RolUsuario.solicitante, RolUsuario.super_admin) and solicitud.inmobiliaria_id != usuario.inmobiliaria_id:
        raise HTTPException(404, _SOLICITUD_NO_EXISTE)
    if estados_permitidos is not None and solicitud.estado not in estados_permitidos:
        raise HTTPException(409, f"La solicitud está en estado '{solicitud.estado.value}' y no admite esta acción")
    return solicitud


# Estados en los que el wizard admite edicion (borrador e incompleta), tomados de la
# maquina de estados para que no se desincronicen.
EDITABLE = {EstadoSolicitud(e) for e in ESTADOS_EDITABLES}


@router.post("", response_model=SolicitudOut, status_code=201)
def crear_solicitud(
    payload: SolicitudCrearIn, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
) -> Solicitud:
    propiedad = db.get(Propiedad, payload.propiedad_id)
    if propiedad is None:
        raise HTTPException(404, "Propiedad no encontrada")

    solicitud = Solicitud(
        id=uuid.uuid4(),
        solicitante_id=usuario.id,
        propiedad_id=payload.propiedad_id,
        inmobiliaria_id=propiedad.inmobiliaria_id,
        vertical=payload.vertical,
        estado=EstadoSolicitud.borrador,
        codigo_seguimiento=_generar_codigo_seguimiento(db),
    )
    db.add(solicitud)
    registrar(
        db, entidad_tipo="solicitud", entidad_id=solicitud.id, accion="creada",
        actor_id=usuario.id, payload_despues={"vertical": payload.vertical.value},
    )
    db.commit()
    db.refresh(solicitud)
    return solicitud


@router.get("/{solicitud_id}", response_model=SolicitudOut)
def obtener_solicitud(
    solicitud_id: uuid.UUID, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
) -> Solicitud:
    return _obtener_solicitud_propia_o_404(solicitud_id, usuario, db)


@router.put("/{solicitud_id}/datos-personales", response_model=SolicitudOut)
def actualizar_datos_personales(
    solicitud_id: uuid.UUID, payload: DatosPersonalesIn,
    usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db),
) -> Solicitud:
    solicitud = _obtener_solicitud_propia_o_404(solicitud_id, usuario, db, EDITABLE)
    verificar_editable(solicitud)
    antes = dict(solicitud.datos_personales)
    solicitud.datos_personales = payload.model_dump(mode="json")
    registrar(
        db, entidad_tipo="solicitud", entidad_id=solicitud.id, accion="datos_personales_actualizados",
        actor_id=usuario.id, payload_antes=antes, payload_despues=solicitud.datos_personales,
    )
    db.commit()
    db.refresh(solicitud)
    return solicitud


@router.put("/{solicitud_id}/datos-laborales", response_model=SolicitudOut)
def actualizar_datos_laborales(
    solicitud_id: uuid.UUID, payload: DatosLaboralesIn,
    usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db),
) -> Solicitud:
    solicitud = _obtener_solicitud_propia_o_404(solicitud_id, usuario, db, EDITABLE)
    verificar_editable(solicitud)
    antes = dict(solicitud.datos_laborales)
    solicitud.datos_laborales = payload.model_dump(mode="json")
    registrar(
        db, entidad_tipo="solicitud", entidad_id=solicitud.id, accion="datos_laborales_actualizados",
        actor_id=usuario.id, payload_antes=antes, payload_despues=solicitud.datos_laborales,
    )
    db.commit()
    db.refresh(solicitud)
    return solicitud


@router.put("/{solicitud_id}/datos-financieros", response_model=SolicitudOut)
def actualizar_datos_financieros(
    solicitud_id: uuid.UUID, payload: DatosFinancierosIn,
    usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db),
) -> Solicitud:
    solicitud = _obtener_solicitud_propia_o_404(solicitud_id, usuario, db, EDITABLE)
    verificar_editable(solicitud)
    antes = dict(solicitud.datos_financieros)
    solicitud.datos_financieros = payload.model_dump(mode="json")
    registrar(
        db, entidad_tipo="solicitud", entidad_id=solicitud.id, accion="datos_financieros_actualizados",
        actor_id=usuario.id, payload_antes=antes, payload_despues=solicitud.datos_financieros,
    )
    db.commit()
    db.refresh(solicitud)
    return solicitud


@router.put("/{solicitud_id}/garantias-referencias", response_model=SolicitudOut)
def actualizar_garantias_referencias(
    solicitud_id: uuid.UUID, payload: GarantiasReferenciasIn,
    usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db),
) -> Solicitud:
    solicitud = _obtener_solicitud_propia_o_404(solicitud_id, usuario, db, EDITABLE)
    verificar_editable(solicitud)
    antes = dict(solicitud.garantias_referencias)
    solicitud.garantias_referencias = payload.model_dump(mode="json")
    registrar(
        db, entidad_tipo="solicitud", entidad_id=solicitud.id, accion="garantias_referencias_actualizadas",
        actor_id=usuario.id, payload_antes=antes, payload_despues=solicitud.garantias_referencias,
    )
    db.commit()
    db.refresh(solicitud)
    return solicitud


@router.get("/{solicitud_id}/documentos-requeridos")
def obtener_checklist_documentos(
    solicitud_id: uuid.UUID, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    solicitud = _obtener_solicitud_propia_o_404(solicitud_id, usuario, db)
    requeridos = documentos_requeridos(solicitud.datos_laborales, solicitud.garantias_referencias, solicitud.vertical.value)
    cargados = set(
        db.execute(
            select(DocumentoSolicitud.tipo_documento).where(DocumentoSolicitud.solicitud_id == solicitud_id)
        ).scalars()
    )
    return {"requeridos": requeridos, "cargados": list(cargados)}


@router.post("/{solicitud_id}/enviar", response_model=ResultadoSolicitudOut)
def enviar_solicitud(
    solicitud_id: uuid.UUID, payload: EnviarSolicitudIn,
    usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db),
) -> ResultadoSolicitudOut:
    solicitud = _obtener_solicitud_propia_o_404(solicitud_id, usuario, db, EDITABLE)

    if not solicitud.datos_personales or not solicitud.datos_laborales or not solicitud.datos_financieros \
            or not solicitud.garantias_referencias:
        raise HTTPException(422, "Completa todos los pasos del formulario antes de enviar la solicitud")

    # borrador|incompleta -> enviada -> en_evaluacion -> decision. Cada salto pasa por la
    # maquina de estados: si alguno no fuera valido, se corta aqui y no se evalua nada.
    transicionar(db, solicitud, EstadoSolicitud.enviada, usuario.id, motivo="Envío del formulario")
    registrar(
        db, entidad_tipo="solicitud", entidad_id=solicitud.id, accion="enviada",
        actor_id=usuario.id, payload_despues={"acepta_politica_datos": payload.acepta_politica_datos},
    )

    transicionar(db, solicitud, EstadoSolicitud.en_evaluacion, usuario.id, motivo="Inicio de la evaluación")

    if solicitud.vertical.value == "arriendo":
        # Vertical arriendo: motor robusto de 37 reglas (F2-B2), portado de Habitat Risk.
        motor_activo = db.execute(
            select(MotorDecisionConfig).where(
                MotorDecisionConfig.activa.is_(True), MotorDecisionConfig.inmobiliaria_id == solicitud.inmobiliaria_id
            )
        ).scalar_one_or_none()
        if motor_activo is None:
            raise HTTPException(500, "No hay un motor de decisión activo para tu inmobiliaria")

        propiedad = db.get(Propiedad, solicitud.propiedad_id)
        documentos_cargados = list(
            db.execute(select(DocumentoSolicitud).where(DocumentoSolicitud.solicitud_id == solicitud.id)).scalars()
        )
        evaluacion, estado_sugerido = motor_client.evaluar_solicitud_robusto(
            db, solicitud, motor_activo, propiedad, documentos_cargados
        )
        transicionar(db, solicitud, estado_sugerido, None, motivo=f"Decisión automática ({evaluacion.decision_driver})")
        motor_id_log = str(motor_activo.id)
    else:
        # Vertical compra: motor 5C original (Bloque 2), sigue vigente para hipotecario.
        politica_activa = db.execute(
            select(PoliticaCredito).where(
                PoliticaCredito.vertical == solicitud.vertical, PoliticaCredito.activa.is_(True),
                PoliticaCredito.inmobiliaria_id == solicitud.inmobiliaria_id,
            )
        ).scalar_one_or_none()
        if politica_activa is None:
            raise HTTPException(500, f"No hay una política de crédito activa para la vertical '{solicitud.vertical.value}'")

        evaluacion = motor_client.evaluar_solicitud(db, solicitud, politica_activa)
        if evaluacion.decision.value == "aprobada":
            estado_sugerido = EstadoSolicitud.aprobada
        elif evaluacion.decision.value == "rechazada":
            estado_sugerido = EstadoSolicitud.rechazada
        else:
            estado_sugerido = EstadoSolicitud.revision_manual
        transicionar(db, solicitud, estado_sugerido, None, motivo="Decisión automática (PUNTAJE)")
        motor_id_log = str(politica_activa.id)

    registrar(
        db, entidad_tipo="evaluacion", entidad_id=evaluacion.id, accion="evaluada",
        actor_id=None,
        payload_despues={"score": float(evaluacion.score), "decision": evaluacion.decision.value, "motor_id": motor_id_log},
    )
    db.commit()
    db.refresh(evaluacion)

    return _resultado_desde_evaluacion(solicitud, evaluacion)


@router.get("/{solicitud_id}/resultado", response_model=ResultadoSolicitudOut)
def obtener_resultado(
    solicitud_id: uuid.UUID, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
) -> ResultadoSolicitudOut:
    solicitud = _obtener_solicitud_propia_o_404(solicitud_id, usuario, db)
    ultima_evaluacion = db.execute(
        select(Evaluacion).where(Evaluacion.solicitud_id == solicitud_id).order_by(Evaluacion.evaluado_en.desc())
    ).scalars().first()

    if ultima_evaluacion is None:
        return ResultadoSolicitudOut(estado=solicitud.estado)

    return _resultado_desde_evaluacion(solicitud, ultima_evaluacion)


def _resultado_desde_evaluacion(solicitud: Solicitud, evaluacion) -> ResultadoSolicitudOut:
    ruta_alterna_sugerencias = []
    if not solicitud.garantias_referencias.get("tiene_codeudor"):
        ruta_alterna_sugerencias.append("agregar_codeudor")
    if solicitud.vertical.value == "arriendo" and not solicitud.garantias_referencias.get("tiene_poliza"):
        ruta_alterna_sugerencias.append("tomar_poliza")

    return ResultadoSolicitudOut(
        estado=solicitud.estado,
        score=float(evaluacion.score),
        escala_maxima=1000 if solicitud.vertical.value == "arriendo" else 100,
        decision=evaluacion.decision.value,
        explicacion=evaluacion.explicacion_generada,
        variables_evaluadas=evaluacion.variables_evaluadas,
        ruta_alterna_disponible=evaluacion.decision.value != "aprobada" and len(ruta_alterna_sugerencias) > 0,
        ruta_alterna_sugerencias=ruta_alterna_sugerencias if evaluacion.decision.value != "aprobada" else [],
    )


@router.get("", response_model=list[SolicitudOut])
def listar_solicitudes(
    estado: EstadoSolicitud | None = None,
    usuario: Usuario = Depends(requiere_staff),
    db: Session = Depends(get_db),
) -> list[Solicitud]:
    query = select(Solicitud)
    if usuario.rol != RolUsuario.super_admin:
        query = query.where(Solicitud.inmobiliaria_id == usuario.inmobiliaria_id)
    if estado is not None:
        query = query.where(Solicitud.estado == estado)
    query = query.order_by(Solicitud.creado_en.desc())
    return list(db.execute(query).scalars().all())


_TITULOS_EVENTOS = {
    "creada": "Solicitud creada",
    "enviada": "Solicitud enviada",
    "datos_personales_actualizados": "Datos personales actualizados",
    "datos_laborales_actualizados": "Datos laborales actualizados",
    "datos_financieros_actualizados": "Datos financieros actualizados",
    "garantias_referencias_actualizadas": "Garantías y referencias actualizadas",
    "decision_manual_tomada": "Decisión manual registrada",
    "analista_asignado": "Analista asignado",
    "documento_revisado": "Documento revisado",
    "comentario_agregado": "Comentario agregado",
}


@router.post("/estado", response_model=ConsultarEstadoOut)
def consultar_estado(payload: ConsultarEstadoIn, db: Session = Depends(get_db)) -> ConsultarEstadoOut:
    """Consulta publica (sin autenticacion) del estado de una solicitud, usando el
    codigo de seguimiento entregado al solicitante y su numero de documento como
    segundo factor -- evita que cualquiera con el codigo pueda ver datos de otra persona."""
    solicitud = db.execute(
        select(Solicitud).where(Solicitud.codigo_seguimiento == payload.codigo.strip().upper())
    ).scalar_one_or_none()
    if solicitud is None:
        raise HTTPException(404, "No se encontró una solicitud con ese código de seguimiento")

    documento_registrado = (solicitud.datos_personales or {}).get("numero_documento")
    if not documento_registrado or documento_registrado != payload.documento.strip():
        raise HTTPException(404, "No se encontró una solicitud con ese código de seguimiento y documento")

    eventos = list(
        db.execute(
            select(Auditoria)
            .where(Auditoria.entidad_tipo == "solicitud", Auditoria.entidad_id == solicitud.id)
            .order_by(Auditoria.timestamp.asc())
        ).scalars()
    )

    timeline = [
        EventoTimelineOut(
            fecha=evento.timestamp,
            titulo=_TITULOS_EVENTOS.get(evento.accion, evento.accion.replace("_", " ").capitalize()),
            descripcion=evento.accion,
            estado=solicitud.estado.value,
        )
        for evento in eventos
    ]

    fecha_actuacion = eventos[-1].timestamp if eventos else solicitud.actualizado_en

    return ConsultarEstadoOut(
        estado=solicitud.estado,
        fecha_creacion=solicitud.creado_en,
        fecha_actuacion=fecha_actuacion,
        timeline=timeline,
    )


def _obtener_solicitud_staff_o_404(solicitud_id: uuid.UUID, usuario: Usuario, db: Session) -> Solicitud:
    solicitud = db.get(Solicitud, solicitud_id)
    if solicitud is None:
        raise HTTPException(404, _SOLICITUD_NO_EXISTE)
    if usuario.rol != RolUsuario.super_admin and solicitud.inmobiliaria_id != usuario.inmobiliaria_id:
        # 404, no 403: para el staff de otra inmobiliaria esta solicitud no existe.
        raise HTTPException(404, _SOLICITUD_NO_EXISTE)
    return solicitud


@router.post("/{solicitud_id}/comentarios", response_model=ComentarioOut, status_code=201)
def agregar_comentario(
    solicitud_id: uuid.UUID,
    payload: ComentarioIn,
    usuario: Usuario = Depends(requiere_staff),
    db: Session = Depends(get_db),
) -> ComentarioSolicitud:
    _obtener_solicitud_staff_o_404(solicitud_id, usuario, db)

    comentario = ComentarioSolicitud(
        id=uuid.uuid4(), solicitud_id=solicitud_id, usuario_id=usuario.id, texto=payload.texto,
    )
    db.add(comentario)
    registrar(
        db, entidad_tipo="solicitud", entidad_id=solicitud_id, accion="comentario_agregado",
        actor_id=usuario.id, payload_despues={"texto": payload.texto},
    )
    db.commit()
    db.refresh(comentario)
    return comentario


@router.get("/{solicitud_id}/comentarios", response_model=list[ComentarioOut])
def listar_comentarios(
    solicitud_id: uuid.UUID, usuario: Usuario = Depends(requiere_staff), db: Session = Depends(get_db)
) -> list[ComentarioSolicitud]:
    _obtener_solicitud_staff_o_404(solicitud_id, usuario, db)
    return list(
        db.execute(
            select(ComentarioSolicitud)
            .where(ComentarioSolicitud.solicitud_id == solicitud_id)
            .order_by(ComentarioSolicitud.created_at.asc())
        ).scalars()
    )
