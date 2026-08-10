"""Catálogos oficiales (DIVIPOLA, CIIU) y catálogos operativos parametrizables.

Los catálogos oficiales son públicos y estáticos (viven en app/catalogos). Los
operativos parten de un default en código y admiten override por tenant guardado
en configuraciones_operativas (clave "catalogo:<nombre>").
"""
import unicodedata

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.catalogos import (
    CATALOGOS_OPERATIVOS_DEFAULTS,
    CIIU_CLASES,
    CIIU_DIVISIONES,
    CIIU_SECCIONES,
    CIIU_SINONIMOS,
    CIIU_TOTAL_OFICIAL,
    DEPARTAMENTOS,
    MUNICIPIOS,
)
from app.core.deps import requiere_analista_o_admin
from app.db.session import get_db
from app.models.usuario import Usuario
from app.services.auditoria import registrar
from app.services.configuracion import (
    DEFAULT_TENANT_ID,
    PREFIJO_CATALOGO,
    guardar_config,
    leer_config,
)

router = APIRouter(prefix="/api/catalogos", tags=["catalogos"])
router_admin = APIRouter(prefix="/api/admin/catalogos", tags=["catalogos"])

_DIVISIONES_POR_COD = {d[0]: d for d in CIIU_DIVISIONES}
_SECCIONES_POR_COD = {s[0]: s for s in CIIU_SECCIONES}
_STOPWORDS = {"de", "del", "la", "el", "los", "las", "y", "en", "para", "por", "con", "un", "una", "al"}


def _normalizar(texto: str) -> str:
    plano = unicodedata.normalize("NFD", str(texto or ""))
    return "".join(c for c in plano if unicodedata.category(c) != "Mn").lower()


def _ciiu_info(codigo: str, descripcion: str) -> dict:
    division = _DIVISIONES_POR_COD.get(codigo[:2], ("", "", ""))
    seccion = _SECCIONES_POR_COD.get(division[1], ("", "", ""))
    return {
        "codigo": codigo,
        "descripcion": descripcion,
        "seccion": division[1],
        "seccion_nombre": seccion[1],
        "division": codigo[:2],
        "division_nombre": division[2],
    }


@router.get("/divipola")
def divipola() -> dict:
    return {
        "departamentos": [
            {"cod": d["cod"], "nombre": d["nombre"], "municipios": MUNICIPIOS.get(d["cod"], [])}
            for d in DEPARTAMENTOS
        ]
    }


@router.get("/ciiu")
def buscar_ciiu(q: str = "") -> list[dict]:
    q = str(q or "").strip()
    if len(q) < 2:
        return []
    tokens = [t for t in _normalizar(q).split() if t and t not in _STOPWORDS]
    if not tokens and not q.isdigit():
        return []

    resultados: list[tuple[int, dict]] = []
    for codigo, descripcion in CIIU_CLASES:
        info = _ciiu_info(codigo, descripcion)
        heno = _normalizar(
            f"{descripcion} {CIIU_SINONIMOS.get(codigo, '')} {info['division_nombre']} {info['seccion_nombre']}"
        )
        if codigo.startswith(q):
            puntaje = 100
        else:
            puntaje = sum((10 if len(t) >= 4 else 4) for t in tokens if t in heno)
            if tokens and all(t in heno for t in tokens) and puntaje > 0:
                puntaje += 20
        if puntaje > 0:
            resultados.append((puntaje, info))

    resultados.sort(key=lambda x: (-x[0], x[1]["codigo"]))
    return [info for _, info in resultados[:20]]


@router.get("/ciiu/estructura")
def estructura_ciiu() -> dict:
    return {
        "secciones": [{"codigo": s[0], "nombre": s[1], "divisiones": s[2]} for s in CIIU_SECCIONES],
        "divisiones": [
            {
                "codigo": d[0],
                "seccion": d[1],
                "nombre": d[2],
                "clases_cargadas": sum(1 for c in CIIU_CLASES if c[0].startswith(d[0])),
            }
            for d in CIIU_DIVISIONES
        ],
        "total_clases": len(CIIU_CLASES),
        "total_oficial": CIIU_TOTAL_OFICIAL,
    }


@router.get("/operativos")
def catalogos_operativos(db: Session = Depends(get_db)) -> dict:
    """Catálogos operativos con overrides del tenant por defecto aplicados. Endpoint
    público: lo consumen los formularios del portal sin autenticación."""
    return {
        nombre: leer_config(db, DEFAULT_TENANT_ID, PREFIJO_CATALOGO + nombre)
        for nombre in CATALOGOS_OPERATIVOS_DEFAULTS
    }


class CatalogoOperativoIn(BaseModel):
    valores: list


@router_admin.put("/operativos/{clave}")
def actualizar_catalogo_operativo(
    clave: str,
    payload: CatalogoOperativoIn,
    usuario: Usuario = Depends(requiere_analista_o_admin),
    db: Session = Depends(get_db),
) -> dict:
    if clave not in CATALOGOS_OPERATIVOS_DEFAULTS:
        raise HTTPException(404, f"Catálogo desconocido: {clave}")
    if not payload.valores:
        raise HTTPException(422, "El catálogo no puede quedar vacío")

    tenant_id = usuario.inmobiliaria_id or DEFAULT_TENANT_ID
    anterior = leer_config(db, tenant_id, PREFIJO_CATALOGO + clave)
    fila = guardar_config(
        db, tenant_id, PREFIJO_CATALOGO + clave, {"valores": payload.valores}, actor_id=usuario.id
    )
    registrar(
        db,
        entidad_tipo="configuracion_operativa",
        entidad_id=fila.id,
        accion="catalogo_actualizado",
        actor_id=usuario.id,
        payload_antes={"catalogo": clave, "valores": anterior},
        payload_despues={"catalogo": clave, "valores": payload.valores},
    )
    db.commit()

    return {
        nombre: leer_config(db, tenant_id, PREFIJO_CATALOGO + nombre)
        for nombre in CATALOGOS_OPERATIVOS_DEFAULTS
    }
