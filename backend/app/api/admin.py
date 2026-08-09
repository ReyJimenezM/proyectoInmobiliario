import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import requiere_analista_o_admin, requiere_staff, tenant_id_o_none
from app.db.session import get_db
from app.models.anunciante import Anunciante
from app.models.decision_manual import DecisionManual
from app.models.enums import DecisionEvaluacion, EstadoSolicitud, RolUsuario, Vertical
from app.models.evaluacion import Evaluacion
from app.models.politica_credito import PoliticaCredito
from app.models.propiedad import Propiedad
from app.models.solicitud import Solicitud
from app.models.usuario import Usuario
from app.schemas.propiedad import AnuncianteOut, PropiedadListItemOut
from app.schemas.admin import (
    DashboardOut,
    DecisionManualIn,
    DecisionManualOut,
    MetricaEstadoOut,
    PoliticaCreditoCrearIn,
    PoliticaCreditoOut,
)
from app.schemas.riesgo import ComponentesRiesgoIn, RiesgoOut
from app.services.auditoria import registrar
from motor_decision.robusto import OWNER_COMPS, nivel_riesgo, score_componentes

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/solicitudes/{solicitud_id}/decision", response_model=DecisionManualOut)
def tomar_decision_manual(
    solicitud_id: uuid.UUID,
    payload: DecisionManualIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> DecisionManual:
    solicitud = db.get(Solicitud, solicitud_id)
    if solicitud is None:
        raise HTTPException(404, "Solicitud no encontrada")
    if usuario.rol != RolUsuario.super_admin and solicitud.inmobiliaria_id != usuario.inmobiliaria_id:
        raise HTTPException(403, "Esta solicitud no pertenece a tu inmobiliaria")

    ultima_evaluacion = db.execute(
        select(Evaluacion).where(Evaluacion.solicitud_id == solicitud_id).order_by(Evaluacion.evaluado_en.desc())
    ).scalars().first()
    if ultima_evaluacion is None:
        raise HTTPException(409, "Esta solicitud aún no tiene una evaluación automática")

    decision = DecisionManual(
        id=uuid.uuid4(),
        evaluacion_id=ultima_evaluacion.id,
        analista_id=usuario.id,
        decision_final=payload.decision_final,
        comentario=payload.comentario,
    )
    db.add(decision)

    if payload.decision_final.value == "aprobada":
        solicitud.estado = EstadoSolicitud.aprobada
    elif payload.decision_final.value == "rechazada":
        solicitud.estado = EstadoSolicitud.rechazada
    # "solicitar_info" no cambia el estado: la solicitud sigue en revision_manual
    # mientras el solicitante completa lo pedido.

    registrar(
        db, entidad_tipo="solicitud", entidad_id=solicitud.id, accion="decision_manual_tomada",
        actor_id=usuario.id,
        payload_despues={"decision_final": payload.decision_final.value, "comentario": payload.comentario},
    )

    db.commit()
    db.refresh(decision)
    return decision


@router.get("/politicas", response_model=list[PoliticaCreditoOut])
def listar_politicas(
    vertical: Vertical | None = None,
    usuario: Usuario = Depends(requiere_staff),
    db: Session = Depends(get_db),
) -> list[PoliticaCredito]:
    query = select(PoliticaCredito).order_by(PoliticaCredito.vertical, PoliticaCredito.version.desc())
    tenant_id = tenant_id_o_none(usuario)
    if tenant_id is not None:
        query = query.where(PoliticaCredito.inmobiliaria_id == tenant_id)
    if vertical is not None:
        query = query.where(PoliticaCredito.vertical == vertical)
    return list(db.execute(query).scalars().all())


@router.post("/politicas", response_model=PoliticaCreditoOut, status_code=201)
def crear_version_politica(
    payload: PoliticaCreditoCrearIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> PoliticaCredito:
    if usuario.inmobiliaria_id is None:
        raise HTTPException(403, "Tu usuario no está asociado a ninguna inmobiliaria")

    ultima_version = db.execute(
        select(func.max(PoliticaCredito.version)).where(
            PoliticaCredito.vertical == payload.vertical, PoliticaCredito.inmobiliaria_id == usuario.inmobiliaria_id
        )
    ).scalar() or 0

    # No se sobreescribe la version anterior: se desactiva y se crea una nueva fila versionada.
    politica_activa_anterior = db.execute(
        select(PoliticaCredito).where(
            PoliticaCredito.vertical == payload.vertical, PoliticaCredito.activa.is_(True),
            PoliticaCredito.inmobiliaria_id == usuario.inmobiliaria_id,
        )
    ).scalar_one_or_none()
    if politica_activa_anterior is not None:
        politica_activa_anterior.activa = False

    nueva_politica = PoliticaCredito(
        id=uuid.uuid4(),
        version=ultima_version + 1,
        vertical=payload.vertical,
        variables=[v.model_dump() for v in payload.variables],
        bandas_decision=payload.bandas_decision.model_dump(),
        activa=True,
        autor_id=usuario.id,
        inmobiliaria_id=usuario.inmobiliaria_id,
        motivo_cambio=payload.motivo_cambio,
    )
    db.add(nueva_politica)

    registrar(
        db, entidad_tipo="politica_credito", entidad_id=nueva_politica.id, accion="nueva_version_creada",
        actor_id=usuario.id,
        payload_antes={"version_anterior": politica_activa_anterior.version} if politica_activa_anterior else None,
        payload_despues={"version": nueva_politica.version, "vertical": payload.vertical.value},
    )

    db.commit()
    db.refresh(nueva_politica)
    return nueva_politica


@router.get("/propiedades", response_model=list[PropiedadListItemOut])
def listar_propiedades_admin(
    usuario: Usuario = Depends(requiere_staff), db: Session = Depends(get_db)
) -> list[PropiedadListItemOut]:
    query = select(Propiedad).order_by(Propiedad.creado_en.desc())
    tenant_id = tenant_id_o_none(usuario)
    if tenant_id is not None:
        query = query.where(Propiedad.inmobiliaria_id == tenant_id)
    propiedades = db.execute(query).scalars().all()
    return [PropiedadListItemOut.model_validate(p) for p in propiedades]


@router.get("/anunciantes", response_model=list[AnuncianteOut])
def listar_anunciantes_admin(
    usuario: Usuario = Depends(requiere_staff), db: Session = Depends(get_db)
) -> list[Anunciante]:
    query = select(Anunciante).order_by(Anunciante.nombre)
    tenant_id = tenant_id_o_none(usuario)
    if tenant_id is not None:
        query = query.where(Anunciante.inmobiliaria_id == tenant_id)
    return list(db.execute(query).scalars().all())


@router.patch("/anunciantes/{anunciante_id}/riesgo", response_model=RiesgoOut)
def actualizar_riesgo_anunciante(
    anunciante_id: uuid.UUID,
    payload: ComponentesRiesgoIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> Anunciante:
    anunciante = db.get(Anunciante, anunciante_id)
    if anunciante is None:
        raise HTTPException(404, "Anunciante no encontrado")
    if usuario.rol != RolUsuario.super_admin and anunciante.inmobiliaria_id != usuario.inmobiliaria_id:
        raise HTTPException(403, "Este anunciante no pertenece a tu inmobiliaria")

    score = score_componentes(payload.componentes, OWNER_COMPS)
    anunciante.componentes_riesgo = payload.componentes
    anunciante.score_riesgo = score
    anunciante.nivel_riesgo = nivel_riesgo(score)

    registrar(
        db, entidad_tipo="anunciante", entidad_id=anunciante.id, accion="riesgo_actualizado",
        actor_id=usuario.id, payload_despues={"score_riesgo": score, "nivel_riesgo": anunciante.nivel_riesgo},
    )
    db.commit()
    return anunciante


@router.get("/dashboard", response_model=DashboardOut)
def obtener_dashboard(
    usuario: Usuario = Depends(requiere_staff), db: Session = Depends(get_db)
) -> DashboardOut:
    tenant_id = tenant_id_o_none(usuario)
    filtro_tenant = [Solicitud.inmobiliaria_id == tenant_id] if tenant_id is not None else []

    conteos = db.execute(
        select(Solicitud.estado, func.count()).where(*filtro_tenant).group_by(Solicitud.estado)
    ).all()
    solicitudes_por_estado = [MetricaEstadoOut(estado=estado.value, cantidad=cantidad) for estado, cantidad in conteos]
    total_solicitudes = sum(m.cantidad for m in solicitudes_por_estado)

    evaluaciones_query = select(Evaluacion).join(Solicitud, Solicitud.id == Evaluacion.solicitud_id).where(*filtro_tenant)
    total_evaluadas = db.execute(
        select(func.count()).select_from(evaluaciones_query.subquery())
    ).scalar() or 0
    total_aprobadas = db.execute(
        select(func.count()).select_from(
            evaluaciones_query.where(Evaluacion.decision == DecisionEvaluacion.aprobada).subquery()
        )
    ).scalar() or 0
    tasa_aprobacion = round(total_aprobadas / total_evaluadas, 4) if total_evaluadas > 0 else 0.0

    tiempos = db.execute(
        select(Solicitud.creado_en, Evaluacion.evaluado_en)
        .join(Evaluacion, Evaluacion.solicitud_id == Solicitud.id)
        .where(*filtro_tenant)
    ).all()
    if tiempos:
        segundos = [(evaluado_en - creado_en).total_seconds() for creado_en, evaluado_en in tiempos]
        tiempo_promedio_horas = round(sum(segundos) / len(segundos) / 3600, 2)
    else:
        tiempo_promedio_horas = None

    scores = db.execute(evaluaciones_query.with_only_columns(Evaluacion.score)).scalars().all()
    bandas_histograma = [(0, 45), (45, 70), (70, 101)]
    distribucion_scores = []
    for minimo, maximo in bandas_histograma:
        cantidad = sum(1 for s in scores if minimo <= float(s) < maximo)
        distribucion_scores.append({"rango": f"{minimo}-{maximo - 1}", "cantidad": cantidad})

    return DashboardOut(
        total_solicitudes=total_solicitudes,
        solicitudes_por_estado=solicitudes_por_estado,
        tasa_aprobacion=tasa_aprobacion,
        tiempo_promedio_evaluacion_horas=tiempo_promedio_horas,
        distribucion_scores=distribucion_scores,
    )
