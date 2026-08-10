"""Ejecución bajo demanda del motor de calidad de dato / validación en 3 capas
sobre una solicitud (ver app/services/validacion.py). Solo lectura: no persiste
hallazgos ni modifica el expediente."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import requiere_staff, tenant_id_o_none
from app.db.session import get_db
from app.models.documento_solicitud import DocumentoSolicitud
from app.models.evaluacion import Evaluacion
from app.models.propiedad import Propiedad
from app.models.solicitud import Solicitud
from app.models.usuario import Usuario
from app.services.validacion import to_number, validar_solicitud

router = APIRouter(prefix="/api/admin/solicitudes", tags=["validacion"])


@router.get("/{solicitud_id}/validacion")
def validar(
    solicitud_id: uuid.UUID,
    usuario: Usuario = Depends(requiere_staff),
    db: Session = Depends(get_db),
) -> dict:
    solicitud = db.get(Solicitud, solicitud_id)
    if solicitud is None:
        raise HTTPException(404, "Solicitud no encontrada")
    tenant_id = tenant_id_o_none(usuario)
    if tenant_id is not None and solicitud.inmobiliaria_id != tenant_id:
        raise HTTPException(404, "Solicitud no encontrada")

    documentos = list(
        db.execute(
            select(DocumentoSolicitud).where(DocumentoSolicitud.solicitud_id == solicitud.id)
        ).scalars().all()
    )
    ultima_evaluacion = db.execute(
        select(Evaluacion)
        .where(Evaluacion.solicitud_id == solicitud.id)
        .order_by(Evaluacion.evaluado_en.desc())
        .limit(1)
    ).scalar_one_or_none()

    # Canon mensual solo aplica en arriendo; en compra la cuota la calcula el simulador.
    canon_mensual = None
    propiedad = db.get(Propiedad, solicitud.propiedad_id)
    if propiedad is not None and getattr(propiedad.operacion, "value", propiedad.operacion) == "arriendo":
        canon_mensual = (to_number(propiedad.precio) or 0) + (to_number(propiedad.valor_admin) or 0)

    return validar_solicitud(
        solicitud, documentos, ultima_evaluacion=ultima_evaluacion, canon_mensual=canon_mensual
    )
