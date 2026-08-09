import math
import uuid
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.deps import requiere_analista_o_admin
from app.db.session import get_db
from app.models.anunciante import Anunciante
from app.models.enums import EstadoPropiedad, OperacionPropiedad, RolUsuario, TipoPropiedad
from app.models.propiedad import ImagenPropiedad, Propiedad
from app.models.usuario import Usuario
from app.services.storage import ArchivoInvalidoError, EXTENSIONES_IMAGEN, get_public_storage_backend
from app.schemas.propiedad import (
    ImagenPropiedadOut,
    PropiedadCreateIn,
    PropiedadDetailOut,
    PropiedadListItemOut,
    PropiedadListOut,
    PropiedadUpdateIn,
    ReordenarImagenesIn,
)
from app.schemas.riesgo import ComponentesRiesgoIn, RiesgoOut
from app.services.auditoria import registrar
from motor_decision.robusto import PROP_COMPS, nivel_riesgo, score_componentes

router = APIRouter(prefix="/api/propiedades", tags=["propiedades"])


@router.get("", response_model=PropiedadListOut)
def listar_propiedades(
    operacion: OperacionPropiedad | None = None,
    tipo: TipoPropiedad | None = None,
    ciudad: str | None = None,
    zona: str | None = None,
    barrio: str | None = None,
    precio_min: Decimal | None = None,
    precio_max: Decimal | None = None,
    area_min: Decimal | None = None,
    area_max: Decimal | None = None,
    habitaciones_min: int | None = None,
    banos_min: int | None = None,
    orden: Literal["relevancia", "precio_asc", "precio_desc", "recientes"] = "relevancia",
    pagina: int = Query(default=1, ge=1),
    tamano_pagina: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db),
) -> PropiedadListOut:
    condiciones = [Propiedad.estado == EstadoPropiedad.activo]
    if operacion is not None:
        condiciones.append(Propiedad.operacion == operacion)
    if tipo is not None:
        condiciones.append(Propiedad.tipo == tipo)
    if ciudad is not None:
        condiciones.append(Propiedad.ciudad.ilike(ciudad))
    if zona is not None:
        condiciones.append(Propiedad.zona.ilike(zona))
    if barrio is not None:
        condiciones.append(Propiedad.barrio.ilike(barrio))
    if precio_min is not None:
        condiciones.append(Propiedad.precio >= precio_min)
    if precio_max is not None:
        condiciones.append(Propiedad.precio <= precio_max)
    if area_min is not None:
        condiciones.append(Propiedad.area_m2 >= area_min)
    if area_max is not None:
        condiciones.append(Propiedad.area_m2 <= area_max)
    if habitaciones_min is not None:
        condiciones.append(Propiedad.habitaciones >= habitaciones_min)
    if banos_min is not None:
        condiciones.append(Propiedad.banos >= banos_min)

    query = select(Propiedad).where(*condiciones)

    if orden == "precio_asc":
        query = query.order_by(asc(Propiedad.precio))
    elif orden == "precio_desc":
        query = query.order_by(desc(Propiedad.precio))
    elif orden == "recientes":
        query = query.order_by(desc(Propiedad.creado_en))
    else:
        query = query.order_by(desc(Propiedad.simulador_activo), desc(Propiedad.creado_en))

    total = db.scalar(select(func.count()).select_from(select(Propiedad.id).where(*condiciones).subquery()))

    offset = (pagina - 1) * tamano_pagina
    propiedades = db.execute(query.offset(offset).limit(tamano_pagina)).scalars().all()

    resultados = []
    for prop in propiedades:
        imagen = db.execute(
            select(ImagenPropiedad.url)
            .where(ImagenPropiedad.propiedad_id == prop.id)
            .order_by(asc(ImagenPropiedad.orden))
            .limit(1)
        ).scalar()
        item = PropiedadListItemOut.model_validate(prop)
        item.imagen_principal = imagen
        resultados.append(item)

    return PropiedadListOut(
        resultados=resultados,
        total=total,
        pagina=pagina,
        tamano_pagina=tamano_pagina,
        total_paginas=max(1, math.ceil(total / tamano_pagina)),
    )


@router.get("/{propiedad_id}", response_model=PropiedadDetailOut)
def obtener_propiedad(propiedad_id: uuid.UUID, db: Session = Depends(get_db)) -> Propiedad:
    propiedad = db.execute(
        select(Propiedad)
        .where(Propiedad.id == propiedad_id)
        .options(joinedload(Propiedad.imagenes), joinedload(Propiedad.anunciante))
    ).unique().scalar_one_or_none()

    if propiedad is None:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")

    return propiedad


@router.post("", response_model=PropiedadDetailOut, status_code=201)
def crear_propiedad(
    payload: PropiedadCreateIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> Propiedad:
    if usuario.inmobiliaria_id is None:
        raise HTTPException(403, "Tu usuario no está asociado a ninguna inmobiliaria")

    anunciante = db.get(Anunciante, payload.anunciante_id)
    if anunciante is None or anunciante.inmobiliaria_id != usuario.inmobiliaria_id:
        raise HTTPException(422, "El anunciante no existe o no pertenece a tu inmobiliaria")

    datos = payload.model_dump(exclude={"imagenes"})
    propiedad = Propiedad(id=uuid.uuid4(), inmobiliaria_id=usuario.inmobiliaria_id, **datos)
    db.add(propiedad)
    db.flush()

    for orden, url in enumerate(payload.imagenes):
        db.add(ImagenPropiedad(id=uuid.uuid4(), propiedad_id=propiedad.id, url=url, orden=orden))

    db.commit()
    db.refresh(propiedad)
    return obtener_propiedad(propiedad.id, db)


def _verificar_propiedad_del_tenant(propiedad_id: uuid.UUID, usuario: Usuario, db: Session) -> Propiedad:
    propiedad = db.get(Propiedad, propiedad_id)
    if propiedad is None:
        raise HTTPException(404, "Propiedad no encontrada")
    if usuario.rol != RolUsuario.super_admin and propiedad.inmobiliaria_id != usuario.inmobiliaria_id:
        raise HTTPException(403, "Esta propiedad no pertenece a tu inmobiliaria")
    return propiedad


@router.patch("/{propiedad_id}", response_model=PropiedadDetailOut)
def actualizar_propiedad(
    propiedad_id: uuid.UUID,
    payload: PropiedadUpdateIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> Propiedad:
    propiedad = _verificar_propiedad_del_tenant(propiedad_id, usuario, db)

    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(propiedad, campo, valor)

    db.commit()
    return obtener_propiedad(propiedad_id, db)


@router.patch("/{propiedad_id}/riesgo", response_model=RiesgoOut)
def actualizar_riesgo_propiedad(
    propiedad_id: uuid.UUID,
    payload: ComponentesRiesgoIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> Propiedad:
    propiedad = _verificar_propiedad_del_tenant(propiedad_id, usuario, db)

    score = score_componentes(payload.componentes, PROP_COMPS)
    propiedad.componentes_riesgo = payload.componentes
    propiedad.score_riesgo = score
    propiedad.nivel_riesgo = nivel_riesgo(score)

    registrar(
        db, entidad_tipo="propiedad", entidad_id=propiedad.id, accion="riesgo_actualizado",
        actor_id=usuario.id, payload_despues={"score_riesgo": score, "nivel_riesgo": propiedad.nivel_riesgo},
    )
    db.commit()
    return propiedad


@router.post("/{propiedad_id}/imagenes", response_model=ImagenPropiedadOut, status_code=201)
def subir_imagen_propiedad(
    propiedad_id: uuid.UUID,
    archivo: UploadFile,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> ImagenPropiedad:
    _verificar_propiedad_del_tenant(propiedad_id, usuario, db)

    contenido = archivo.file.read()
    storage = get_public_storage_backend()
    try:
        ruta_relativa = storage.guardar(
            propiedad_id, archivo.filename or "foto.jpg", contenido, extensiones_permitidas=EXTENSIONES_IMAGEN
        )
    except ArchivoInvalidoError as exc:
        raise HTTPException(422, str(exc))

    url_publica = f"{settings.public_base_url}/media/propiedades/{ruta_relativa}"
    siguiente_orden = db.scalar(
        select(func.coalesce(func.max(ImagenPropiedad.orden), -1)).where(ImagenPropiedad.propiedad_id == propiedad_id)
    ) + 1

    imagen = ImagenPropiedad(id=uuid.uuid4(), propiedad_id=propiedad_id, url=url_publica, orden=siguiente_orden)
    db.add(imagen)
    db.commit()
    db.refresh(imagen)
    return imagen


@router.delete("/{propiedad_id}/imagenes/{imagen_id}", status_code=204)
def eliminar_imagen_propiedad(
    propiedad_id: uuid.UUID,
    imagen_id: uuid.UUID,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> None:
    _verificar_propiedad_del_tenant(propiedad_id, usuario, db)
    imagen = db.get(ImagenPropiedad, imagen_id)
    if imagen is None or imagen.propiedad_id != propiedad_id:
        raise HTTPException(404, "Imagen no encontrada")

    if imagen.url.startswith(settings.public_base_url):
        ruta_relativa = imagen.url.replace(f"{settings.public_base_url}/media/propiedades/", "")
        get_public_storage_backend().eliminar(ruta_relativa)

    db.delete(imagen)
    db.commit()


@router.put("/{propiedad_id}/imagenes/orden", response_model=list[ImagenPropiedadOut])
def reordenar_imagenes_propiedad(
    propiedad_id: uuid.UUID,
    payload: ReordenarImagenesIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> list[ImagenPropiedad]:
    _verificar_propiedad_del_tenant(propiedad_id, usuario, db)
    imagenes = {
        img.id: img
        for img in db.execute(select(ImagenPropiedad).where(ImagenPropiedad.propiedad_id == propiedad_id)).scalars()
    }
    if set(payload.orden_imagenes) != set(imagenes.keys()):
        raise HTTPException(422, "La lista de orden debe incluir exactamente las imágenes actuales de la propiedad")

    for orden, imagen_id in enumerate(payload.orden_imagenes):
        imagenes[imagen_id].orden = orden

    db.commit()
    return sorted(imagenes.values(), key=lambda i: i.orden)
