"""Requisitos documentales configurables: documentos base, documentos por perfil
(situación laboral) y reglas perfil→documentos. Se guarda como un único documento
JSONB por tenant (clave "requisitos" en configuraciones_operativas)."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import requiere_analista_o_admin, requiere_staff
from app.db.session import get_db
from app.models.usuario import Usuario
from app.services.auditoria import registrar
from app.services.configuracion import (
    CLAVE_REQUISITOS,
    DEFAULT_TENANT_ID,
    guardar_config,
    leer_config,
)

router = APIRouter(prefix="/api/admin/requisitos", tags=["requisitos"])


class DocumentoRequisitoIn(BaseModel):
    nombre: str | None = None
    para: str | None = None
    contiene: str | None = None
    formato: str | None = None
    ejemplo: str | None = None
    sin_validar: str | None = None
    obligatorio: bool | None = None


class ReglaRequisitoIn(BaseModel):
    docs: list[str] | None = None
    activa: bool | None = None


def _tenant_de(usuario: Usuario):
    return usuario.inmobiliaria_id or DEFAULT_TENANT_ID


@router.get("")
def obtener_requisitos(usuario: Usuario = Depends(requiere_staff), db: Session = Depends(get_db)) -> dict:
    return leer_config(db, _tenant_de(usuario), CLAVE_REQUISITOS)


@router.put("/documentos/{perfil}/{doc_id}")
def actualizar_documento_requisito(
    perfil: str,
    doc_id: str,
    payload: DocumentoRequisitoIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> dict:
    tenant_id = _tenant_de(usuario)
    config = leer_config(db, tenant_id, CLAVE_REQUISITOS)

    if perfil == "base":
        lista = config.get("base", [])
    else:
        if perfil not in config.get("perfiles", {}):
            raise HTTPException(404, f"Perfil desconocido: {perfil}")
        lista = config["perfiles"][perfil]

    doc = next((d for d in lista if d.get("id") == doc_id), None)
    if doc is None:
        raise HTTPException(404, f"Documento {doc_id} no existe en el perfil {perfil}")

    cambios = payload.model_dump(exclude_none=True)
    if not cambios:
        raise HTTPException(422, "No se envió ningún cambio")
    antes = dict(doc)
    doc.update(cambios)

    fila = guardar_config(db, tenant_id, CLAVE_REQUISITOS, config, actor_id=usuario.id)
    registrar(
        db,
        entidad_tipo="configuracion_operativa",
        entidad_id=fila.id,
        accion="requisito_documento_actualizado",
        actor_id=usuario.id,
        payload_antes={"perfil": perfil, "documento": antes},
        payload_despues={"perfil": perfil, "documento": doc},
    )
    db.commit()
    return config


@router.put("/reglas/{regla_id}")
def actualizar_regla_requisito(
    regla_id: str,
    payload: ReglaRequisitoIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> dict:
    tenant_id = _tenant_de(usuario)
    config = leer_config(db, tenant_id, CLAVE_REQUISITOS)

    regla = next((r for r in config.get("reglas", []) if r.get("id") == regla_id), None)
    if regla is None:
        raise HTTPException(404, f"Regla desconocida: {regla_id}")

    cambios = payload.model_dump(exclude_none=True)
    if not cambios:
        raise HTTPException(422, "No se envió ningún cambio")

    if "docs" in cambios:
        # Solo se pueden referenciar documentos que existan en el perfil o en la base.
        conocidos = {d["id"] for d in config.get("base", [])}
        conocidos |= {d["id"] for docs in config.get("perfiles", {}).values() for d in docs}
        desconocidos = [d for d in cambios["docs"] if d not in conocidos]
        if desconocidos:
            raise HTTPException(422, f"Documentos desconocidos en la regla: {', '.join(desconocidos)}")

    antes = dict(regla)
    regla.update(cambios)
    regla["autor"] = usuario.nombre_completo
    regla["fecha"] = date.today().isoformat()

    fila = guardar_config(db, tenant_id, CLAVE_REQUISITOS, config, actor_id=usuario.id)
    registrar(
        db,
        entidad_tipo="configuracion_operativa",
        entidad_id=fila.id,
        accion="requisito_regla_actualizada",
        actor_id=usuario.id,
        payload_antes={"regla": antes},
        payload_despues={"regla": regla},
    )
    db.commit()
    return config
