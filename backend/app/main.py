import logging
import os
import time
import uuid
from contextvars import ContextVar
from http import HTTPStatus
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import (
    admin,
    auditoria,
    auth,
    catalogos,
    documentos,
    inmobiliarias,
    leads,
    motor,
    parametrizacion,
    propiedades,
    propietarios,
    proyectos,
    requisitos,
    simulador,
    solicitudes,
    trazabilidad,
    validacion,
)
from app.core.config import settings
from app.core.errores import ErrorDominio

logger = logging.getLogger("app")

app = FastAPI(title="Plataforma Finca Raíz + Motor de Crédito", version="0.1.0")


# ---------------------------------------------------------------------------
# Contexto de la petición
# ---------------------------------------------------------------------------
#: Identificador de la petición en curso. Vive en un contextvar para que los
#: handlers de error y los logs puedan leerlo sin que nadie tenga que ir
#: pasando el `Request` de función en función.
_request_id_actual: ContextVar[str] = ContextVar("request_id", default="")


def request_id_actual() -> str:
    """Identificador de la petición en curso ("" fuera de una petición)."""
    return _request_id_actual.get()


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Asigna un identificador a cada petición y mide cuánto tarda.

    Si el cliente manda `X-Request-ID` lo respetamos: permite seguir una traza
    que empieza en el frontend. Si no, generamos uno. En ambos casos vuelve en
    la cabecera de *toda* respuesta, de éxito o de error, y es el mismo valor
    que aparece en el cuerpo del sobre de error: es lo que permite pedirle el
    identificador al usuario y buscarlo directamente en el log.
    """

    async def dispatch(self, request: Request, call_next):
        request_id = (request.headers.get("X-Request-ID") or "").strip() or str(uuid.uuid4())
        request.state.request_id = request_id
        testigo = _request_id_actual.set(request_id)
        inicio = time.perf_counter()
        try:
            try:
                respuesta = await call_next(request)
            except Exception:
                # Se atrapa aquí, y no solo en el handler global, porque el
                # manejador de `Exception` de Starlette corre por fuera de este
                # middleware: allí ya no habría ni request_id ni cabeceras.
                respuesta = _error_inesperado(request)
        finally:
            _request_id_actual.reset(testigo)
        duracion_ms = (time.perf_counter() - inicio) * 1000
        respuesta.headers["X-Request-ID"] = request_id
        respuesta.headers["X-Response-Time-ms"] = f"{duracion_ms:.2f}"
        return respuesta


app.add_middleware(RequestContextMiddleware)


# ---------------------------------------------------------------------------
# Contrato de error: un único sobre para todo
# ---------------------------------------------------------------------------
def _sobre(estado_http: int, codigo: str, mensaje: str, detalles: dict | None = None) -> JSONResponse:
    """Respuesta de error con la forma única que consume el frontend."""
    request_id = request_id_actual()
    return JSONResponse(
        status_code=estado_http,
        content={
            "code": codigo,
            "message": mensaje,
            "details": detalles or {},
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id} if request_id else None,
    )


#: Mensajes en español para los errores de esquema. Los textos que produce el
#: validador son técnicos y en inglés; al usuario final no le sirven.
_MENSAJES_VALIDACION = {
    "missing": "Este campo es obligatorio.",
    "value_error.missing": "Este campo es obligatorio.",
    "string_type": "Debe ser un texto.",
    "int_type": "Debe ser un número entero.",
    "int_parsing": "Debe ser un número entero.",
    "float_type": "Debe ser un número.",
    "float_parsing": "Debe ser un número.",
    "decimal_parsing": "Debe ser un número.",
    "bool_type": "Debe ser verdadero o falso.",
    "bool_parsing": "Debe ser verdadero o falso.",
    "uuid_parsing": "No es un identificador válido.",
    "uuid_type": "No es un identificador válido.",
    "date_parsing": "No es una fecha válida.",
    "datetime_parsing": "No es una fecha válida.",
    "enum": "El valor no está entre las opciones permitidas.",
    "greater_than": "El valor es demasiado pequeño.",
    "greater_than_equal": "El valor es demasiado pequeño.",
    "less_than": "El valor es demasiado grande.",
    "less_than_equal": "El valor es demasiado grande.",
    "string_too_short": "El texto es demasiado corto.",
    "string_too_long": "El texto es demasiado largo.",
    "string_pattern_mismatch": "El formato no es válido.",
    "value_error": "El valor no es válido.",
    "json_invalid": "El contenido enviado no es un JSON válido.",
}


def _campo_legible(loc: tuple) -> str:
    """Nombre del campo tal como lo mandó el cliente, sin `body`/`query` delante."""
    partes = [str(p) for p in loc if str(p) not in {"body", "query", "path", "header", "cookie"}]
    return ".".join(partes) or "cuerpo de la petición"


@app.exception_handler(ErrorDominio)
async def _manejar_error_dominio(request: Request, exc: ErrorDominio) -> JSONResponse:
    return _sobre(exc.estado_http, exc.codigo, exc.mensaje, exc.detalles)


@app.exception_handler(RequestValidationError)
async def _manejar_error_validacion(request: Request, exc: RequestValidationError) -> JSONResponse:
    errores = [
        {
            "campo": _campo_legible(error.get("loc", ())),
            "mensaje": _MENSAJES_VALIDACION.get(error.get("type", ""), "El valor no es válido."),
        }
        for error in exc.errors()
    ]
    return _sobre(
        422,
        "VALIDATION_ERROR",
        "Hay datos incompletos o con un formato incorrecto. Revisa los campos marcados.",
        {"errores": errores},
    )


def _frase_estandar(estado_http: int) -> str:
    """Texto en inglés que Starlette pone por defecto en `detail` (p. ej. "Not Found")."""
    try:
        return HTTPStatus(estado_http).phrase
    except ValueError:
        return ""


#: Detalles en inglés que generan las utilidades de seguridad de FastAPI, no nuestros
#: endpoints. No coinciden con la frase estandar de Starlette ("Unauthorized"), asi que
#: sin esta lista se colaban tal cual al usuario final: la sesion caducada es el error
#: mas frecuente que ve alguien, y respondia "Not authenticated".
DETALLES_DEL_FRAMEWORK = frozenset({
    "Not authenticated",
    "Invalid authentication credentials",
    "Could not validate credentials",
})


def _es_detalle_del_framework(detalle: str, estado_http: int) -> bool:
    return detalle == _frase_estandar(estado_http) or detalle in DETALLES_DEL_FRAMEWORK


@app.exception_handler(StarletteHTTPException)
async def _manejar_error_http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    codigos = {
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "TOO_MANY_ATTEMPTS",
    }
    # Cuando el `detail` es el texto por defecto de Starlette ("Not Found",
    # "Method Not Allowed"…) se sustituye por el equivalente en español: al
    # usuario final no le sirve un mensaje en inglés del framework.
    genericos = {
        401: "Necesitas iniciar sesión para continuar.",
        403: "No tienes permiso para realizar esta operación.",
        404: "El recurso solicitado no existe.",
        405: "Esa operación no está disponible en esta dirección.",
        409: "La operación entra en conflicto con el estado actual.",
        429: "Demasiadas peticiones. Espera un momento antes de reintentar.",
    }
    por_defecto = genericos.get(exc.status_code, "No se pudo completar la operación.")

    detalle = exc.detail
    if isinstance(detalle, str) and detalle and not _es_detalle_del_framework(detalle, exc.status_code):
        mensaje = detalle  # mensaje propio del endpoint, ya viene en español
    else:
        mensaje = por_defecto
    detalles = detalle if isinstance(detalle, dict) else {}
    return _sobre(exc.status_code, codigos.get(exc.status_code, "HTTP_ERROR"), mensaje, detalles)


def _error_inesperado(request: Request) -> JSONResponse:
    """500 sin filtrar nada: la traza se queda en el servidor.

    Al cliente solo le llega el `request_id`, que es justo lo que permite
    localizar esta misma línea en el log cuando reporta el problema.
    """
    logger.exception(
        "Error no controlado en %s %s (request_id=%s)",
        request.method,
        request.url.path,
        request_id_actual(),
    )
    return _sobre(
        500,
        "INTERNAL_ERROR",
        "Ocurrió un error inesperado. Inténtalo de nuevo en unos minutos.",
    )


@app.exception_handler(Exception)
async def _manejar_error_inesperado(request: Request, exc: Exception) -> JSONResponse:
    return _error_inesperado(request)

_origins = ["http://localhost:3000"]
_extra = os.getenv("CORS_ORIGINS", "")
if _extra:
    _origins += [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Sin esto el navegador no deja leer las cabeceras de correlación desde el frontend.
    expose_headers=["X-Request-ID", "X-Response-Time-ms"],
)

# Fotos de propiedades: publicas por diseño (a diferencia de los documentos de solicitud,
# que solo se sirven autenticados via app/api/documentos.py).
Path(settings.storage_public_path).mkdir(parents=True, exist_ok=True)
app.mount("/media/propiedades", StaticFiles(directory=settings.storage_public_path), name="propiedades_media")

app.include_router(auth.router)
app.include_router(propiedades.router)
app.include_router(simulador.router)
app.include_router(solicitudes.router)
app.include_router(documentos.router)
app.include_router(admin.router)
app.include_router(propietarios.router)
app.include_router(inmobiliarias.router)
app.include_router(inmobiliarias.router_publico)
app.include_router(motor.router)
app.include_router(auditoria.router)
app.include_router(proyectos.router)
app.include_router(proyectos.router_admin)
app.include_router(catalogos.router)
app.include_router(catalogos.router_admin)
app.include_router(parametrizacion.router)
app.include_router(requisitos.router)
app.include_router(validacion.router)
app.include_router(trazabilidad.router)
app.include_router(leads.router)
app.include_router(leads.router_admin)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
