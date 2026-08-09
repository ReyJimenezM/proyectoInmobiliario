import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, requiere_staff
from app.db.session import get_db
from app.models.documento_solicitud import DocumentoSolicitud
from app.models.enums import EstadoDocumento, RolUsuario
from app.models.solicitud import Solicitud
from app.models.usuario import Usuario
from app.schemas.solicitud import DocumentoOut, RevisionDocumentoIn
from app.services.auditoria import registrar
from app.services.storage import ArchivoInvalidoError, get_storage_backend

router = APIRouter(prefix="/api/solicitudes/{solicitud_id}/documentos", tags=["documentos"])


def _verificar_acceso(solicitud_id: uuid.UUID, usuario: Usuario, db: Session) -> Solicitud:
    solicitud = db.get(Solicitud, solicitud_id)
    if solicitud is None:
        raise HTTPException(404, "Solicitud no encontrada")
    if usuario.rol == RolUsuario.solicitante and solicitud.solicitante_id != usuario.id:
        raise HTTPException(403, "No tienes acceso a esta solicitud")
    return solicitud


@router.post("", response_model=DocumentoOut, status_code=201)
def cargar_documento(
    solicitud_id: uuid.UUID,
    tipo_documento: str,
    archivo: UploadFile,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentoSolicitud:
    solicitud = _verificar_acceso(solicitud_id, usuario, db)

    contenido = archivo.file.read()
    storage = get_storage_backend()
    try:
        url_archivo = storage.guardar(solicitud_id, archivo.filename or "documento", contenido)
    except ArchivoInvalidoError as exc:
        raise HTTPException(422, str(exc))

    documento = DocumentoSolicitud(
        id=uuid.uuid4(), solicitud_id=solicitud_id, tipo_documento=tipo_documento,
        url_archivo=url_archivo, estado=EstadoDocumento.cargado,
    )
    db.add(documento)
    registrar(
        db, entidad_tipo="documento_solicitud", entidad_id=documento.id, accion="cargado",
        actor_id=usuario.id, payload_despues={"tipo_documento": tipo_documento, "solicitud_id": str(solicitud_id)},
    )
    db.commit()
    db.refresh(documento)
    return documento


@router.get("", response_model=list[DocumentoOut])
def listar_documentos(
    solicitud_id: uuid.UUID, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[DocumentoSolicitud]:
    _verificar_acceso(solicitud_id, usuario, db)
    return list(
        db.execute(select(DocumentoSolicitud).where(DocumentoSolicitud.solicitud_id == solicitud_id)).scalars()
    )


@router.get("/{documento_id}/archivo")
def descargar_documento(
    solicitud_id: uuid.UUID, documento_id: uuid.UUID,
    usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db),
) -> Response:
    _verificar_acceso(solicitud_id, usuario, db)
    documento = db.get(DocumentoSolicitud, documento_id)
    if documento is None or documento.solicitud_id != solicitud_id:
        raise HTTPException(404, "Documento no encontrado")

    storage = get_storage_backend()
    contenido = storage.leer(documento.url_archivo)
    return Response(content=contenido, media_type="application/octet-stream")


@router.patch("/{documento_id}/revision", response_model=DocumentoOut)
def revisar_documento(
    solicitud_id: uuid.UUID,
    documento_id: uuid.UUID,
    payload: RevisionDocumentoIn,
    usuario: Usuario = Depends(requiere_staff),
    db: Session = Depends(get_db),
) -> DocumentoSolicitud:
    solicitud = db.get(Solicitud, solicitud_id)
    if solicitud is None:
        raise HTTPException(404, "Solicitud no encontrada")
    if usuario.rol != RolUsuario.super_admin and solicitud.inmobiliaria_id != usuario.inmobiliaria_id:
        raise HTTPException(403, "Esta solicitud no pertenece a tu inmobiliaria")

    documento = db.get(DocumentoSolicitud, documento_id)
    if documento is None or documento.solicitud_id != solicitud_id:
        raise HTTPException(404, "Documento no encontrado")

    estado_anterior = documento.estado.value
    documento.estado = EstadoDocumento.aprobado if payload.estado == "aprobado" else EstadoDocumento.rechazado

    registrar(
        db, entidad_tipo="documento_solicitud", entidad_id=documento.id, accion="documento_revisado",
        actor_id=usuario.id,
        payload_antes={"estado": estado_anterior},
        payload_despues={"estado": documento.estado.value, "comentario": payload.comentario},
    )
    db.commit()
    db.refresh(documento)
    return documento
