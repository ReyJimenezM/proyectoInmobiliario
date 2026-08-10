"""Maquina de estados de la solicitud. El workflow es explicito, no implicito.

Nadie debe escribir `solicitud.estado = X` directamente: se pasa por `transicionar`,
que valida la transicion contra TRANSICIONES y deja rastro en auditoria. Los estados
finales (aprobada / rechazada / cancelada) no tienen salida: una solicitud ya decidida
no se edita ni se reabre; si hay que revisarla, se crea una solicitud nueva.
"""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.enums import EstadoSolicitud
from app.models.solicitud import Solicitud
from app.services.auditoria import registrar

try:  # el modulo de errores de dominio lo publica otro bloque; fallback minimo mientras tanto
    from app.core.errores import EstadoInvalido
except ImportError:  # pragma: no cover - solo aplica si aun no existe app/core/errores.py
    class EstadoInvalido(Exception):
        """Fallback local: la transicion de estado solicitada no esta permitida."""

        def __init__(self, mensaje: str, *, codigo: str = "ESTADO_INVALIDO", detalles: dict | None = None):
            super().__init__(mensaje)
            self.mensaje = mensaje
            self.codigo = codigo
            self.detalles = detalles or {}


#: Transiciones permitidas: origen -> destinos validos. Todo lo que no este aqui, no pasa.
TRANSICIONES: dict[str, set[str]] = {
    "borrador": {"enviada", "cancelada"},
    "enviada": {"en_evaluacion", "cancelada"},
    "en_evaluacion": {"incompleta", "revision_manual", "aprobada", "rechazada", "con_ruta_alterna"},
    "incompleta": {"enviada", "en_evaluacion", "cancelada"},
    # 'incompleta' es la salida de "solicitar informacion adicional": devuelve la
    # solicitud a manos del solicitante para que complete y reenvie.
    "revision_manual": {"aprobada", "rechazada", "con_ruta_alterna", "incompleta"},
    "con_ruta_alterna": {"revision_manual", "aprobada", "rechazada", "incompleta"},
    "aprobada": set(),
    "rechazada": set(),
    "cancelada": set(),
}

#: Estados sin salida: la solicitud ya tiene una decision o fue cerrada.
ESTADOS_FINALES = frozenset({"aprobada", "rechazada", "cancelada"})

#: Estados en los que el solicitante todavia puede editar los datos del wizard.
ESTADOS_EDITABLES = frozenset({"borrador", "incompleta"})


def _valor(estado) -> str:
    return estado.value if isinstance(estado, EstadoSolicitud) else str(estado)


def transiciones_permitidas(estado) -> set[str]:
    return set(TRANSICIONES.get(_valor(estado), set()))


def transicionar(
    db: Session,
    solicitud: Solicitud,
    nuevo_estado: EstadoSolicitud,
    actor_id: uuid.UUID | None,
    motivo: str | None = None,
) -> None:
    """Cambia el estado de la solicitud validando la transicion y auditandola.

    Si el estado no cambia, no hace nada (idempotente). Si la transicion no esta
    permitida, lanza `EstadoInvalido` con el detalle de que si se podia hacer."""
    desde = _valor(solicitud.estado)
    hacia = _valor(nuevo_estado)
    if desde == hacia:
        return

    permitidas = TRANSICIONES.get(desde, set())
    if hacia not in permitidas:
        raise EstadoInvalido(
            f"No es posible pasar la solicitud de '{desde}' a '{hacia}'.",
            codigo="TRANSICION_INVALIDA",
            detalles={"desde": desde, "hacia": hacia, "permitidas": sorted(permitidas)},
        )

    solicitud.estado = nuevo_estado if isinstance(nuevo_estado, EstadoSolicitud) else EstadoSolicitud(hacia)
    registrar(
        db,
        entidad_tipo="solicitud",
        entidad_id=solicitud.id,
        accion="estado_cambiado",
        actor_id=actor_id,
        payload_antes={"estado": desde},
        payload_despues={"estado": hacia, "motivo": motivo},
    )


def verificar_editable(solicitud: Solicitud) -> None:
    """Guard para los endpoints que modifican datos del wizard. Una solicitud ya
    decidida (o en evaluacion) no se edita: alterar los datos despues de decidir
    romperia la trazabilidad entre lo evaluado y lo que quedo guardado."""
    estado = _valor(solicitud.estado)
    if estado not in ESTADOS_EDITABLES:
        raise EstadoInvalido(
            f"La solicitud está en estado '{estado}' y sus datos ya no se pueden editar.",
            codigo="SOLICITUD_NO_EDITABLE",
            detalles={"desde": estado, "hacia": estado, "permitidas": sorted(ESTADOS_EDITABLES)},
        )


def es_final(solicitud: Solicitud) -> bool:
    return _valor(solicitud.estado) in ESTADOS_FINALES
