"""Jerarquía de errores de dominio con mensaje apto para el usuario final.

La idea es separar dos audiencias en el mismo error:

  * ``mensaje``: texto en español, claro y sin jerga, que se le puede mostrar
    tal cual a quien está usando la plataforma.
  * ``codigo``: identificador técnico estable (``NOT_FOUND``, ``INVALID_STATE``…)
    que el frontend y el backoffice pueden usar para ramificar lógica o buscar
    en los logs sin depender del texto.

Los handlers globales registrados en ``app/main.py`` traducen cualquier
``ErrorDominio`` al sobre uniforme::

    {"code": ..., "message": ..., "details": {...}, "request_id": ...}

Levantar uno de estos errores desde un servicio o un endpoint es suficiente:
no hace falta construir ``HTTPException`` ni acordarse del código HTTP.
"""
from __future__ import annotations


class ErrorDominio(Exception):
    """Error de negocio previsto. Nunca representa un fallo del sistema."""

    estado_http: int = 400
    codigo: str = "DOMAIN_ERROR"

    def __init__(
        self,
        mensaje: str,
        *,
        codigo: str | None = None,
        detalles: dict | None = None,
    ) -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje
        if codigo:
            self.codigo = codigo
        self.detalles: dict = detalles or {}


class NoEncontrado(ErrorDominio):
    """El recurso pedido no existe o no es visible para quien pregunta."""

    estado_http = 404
    codigo = "NOT_FOUND"


class Prohibido(ErrorDominio):
    """Está identificado, pero no tiene permiso para esta operación."""

    estado_http = 403
    codigo = "FORBIDDEN"


class NoAutorizado(ErrorDominio):
    """Faltan credenciales o son inválidas."""

    estado_http = 401
    codigo = "UNAUTHORIZED"


class EstadoInvalido(ErrorDominio):
    """La operación no cabe en el estado actual del recurso."""

    estado_http = 409
    codigo = "INVALID_STATE"


class ConflictoIdempotencia(ErrorDominio):
    """Se reutilizó una clave de idempotencia para otra petición distinta."""

    estado_http = 409
    codigo = "IDEMPOTENCY_CONFLICT"


class DemasiadosIntentos(ErrorDominio):
    """Se superó el límite de intentos permitido para una operación sensible."""

    estado_http = 429
    codigo = "TOO_MANY_ATTEMPTS"


__all__ = [
    "ErrorDominio",
    "NoEncontrado",
    "Prohibido",
    "NoAutorizado",
    "EstadoInvalido",
    "ConflictoIdempotencia",
    "DemasiadosIntentos",
]
