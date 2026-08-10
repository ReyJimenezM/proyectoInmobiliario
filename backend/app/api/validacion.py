"""Motor de calidad de dato / validación en 3 capas sobre una solicitud
(ver app/services/validacion.py).

Dos verbos con semántica distinta a propósito:
  GET  → calcula y devuelve, sin tocar la base. Consultar la pantalla no debe
         dejar rastro ni acumular corridas por cada vez que el analista la abre.
  POST → ejecuta y **persiste** la corrida (agregado, detalle por campo y
         hallazgos), que es lo que alimenta la bandeja de hallazgos resolubles.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import requiere_analista_o_admin, requiere_staff, tenant_id_o_none
from app.db.session import get_db
from app.models.documento_solicitud import DocumentoSolicitud
from app.models.evaluacion import Evaluacion
from app.models.propiedad import Propiedad
from app.models.solicitud import Solicitud
from app.models.usuario import Usuario
from app.services.trazabilidad import registrar_corrida_validacion
from app.services.validacion import to_number, validar_solicitud

router = APIRouter(prefix="/api/admin/solicitudes", tags=["validacion"])


def _solicitud_del_tenant(solicitud_id: uuid.UUID, usuario: Usuario, db: Session) -> Solicitud:
    """Fuera de alcance responde 404, no 403: un 403 confirmaria que el expediente existe."""
    solicitud = db.get(Solicitud, solicitud_id)
    if solicitud is None:
        raise HTTPException(404, "La solicitud no existe.")
    tenant_id = tenant_id_o_none(usuario)
    if tenant_id is not None and solicitud.inmobiliaria_id != tenant_id:
        raise HTTPException(404, "La solicitud no existe.")
    return solicitud


def _ejecutar(solicitud: Solicitud, db: Session) -> dict:
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


@router.get("/{solicitud_id}/validacion")
def validar(
    solicitud_id: uuid.UUID,
    usuario: Usuario = Depends(requiere_staff),
    db: Session = Depends(get_db),
) -> dict:
    return _ejecutar(_solicitud_del_tenant(solicitud_id, usuario, db), db)


@router.post("/{solicitud_id}/validacion")
def validar_y_registrar(
    solicitud_id: uuid.UUID,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Reejecuta la validación y deja constancia. Los hallazgos que el analista ya
    resolvió no reviven: el servicio reapunta los abiertos en vez de duplicarlos."""
    solicitud = _solicitud_del_tenant(solicitud_id, usuario, db)
    resultado = _ejecutar(solicitud, db)

    corrida = registrar_corrida_validacion(
        db,
        solicitud_id=solicitud.id,
        resultado=resultado,
        actor_id=usuario.id,
        inmobiliaria_id=solicitud.inmobiliaria_id,
    )
    db.commit()
    return {**resultado, "corrida_id": str(corrida.id)}
