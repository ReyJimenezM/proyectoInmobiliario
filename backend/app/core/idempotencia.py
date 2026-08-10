"""Idempotencia para operaciones con efectos irreversibles.

Sin esto, un reintento —el usuario que pulsa dos veces, un proxy que reenvía,
un cliente con reintento automático— duplica efectos: dos evaluaciones de
riesgo sobre la misma solicitud, dos eventos de auditoría, dos decisiones
manuales sobre el mismo expediente.

El contrato es el habitual: el cliente manda la cabecera ``Idempotency-Key``.

  * Si la clave ya se usó **con la misma petición**, se devuelve la respuesta
    guardada sin volver a ejecutar nada.
  * Si se reutiliza con una petición distinta, es un error del cliente y se
    responde 409 (``IDEMPOTENCY_CONFLICT``): reciclar una clave para otra
    operación es justo lo que la idempotencia debe impedir.
  * La cabecera es opcional: sin ella todo se comporta como siempre.

De momento este módulo **no está enganchado a ningún endpoint**; queda listo
para que se aplique donde haga falta. Uso previsto::

    from app.core.idempotencia import Idempotencia, clave_idempotencia

    @router.post("/solicitudes/{solicitud_id}/evaluar")
    def evaluar(
        solicitud_id: uuid.UUID,
        payload: EvaluarIn,
        db: Session = Depends(get_db),
        clave: str | None = Depends(clave_idempotencia),
    ):
        huella = Idempotencia.huella("evaluar_solicitud", solicitud_id, payload)
        previa = Idempotencia.recuperar_o_reservar(
            db, clave, "evaluar_solicitud", huella, inmobiliaria_id
        )
        if previa is not None:
            return previa            # reintento: se devuelve lo ya emitido

        resultado = servicio.evaluar(...)   # el efecto real, una sola vez
        Idempotencia.guardar(
            db, clave, "evaluar_solicitud", huella, inmobiliaria_id,
            respuesta=resultado, estado_http=200,
        )
        return resultado

``recuperar_o_reservar`` deja el registro reservado (con ``respuesta`` a NULL)
antes de ejecutar, de modo que dos peticiones simultáneas con la misma clave no
puedan ejecutar el efecto las dos: la que pierde la carrera ve la reserva.
"""
from __future__ import annotations

import hashlib
import json
import uuid
from typing import Any, Optional

from fastapi import Header
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errores import ConflictoIdempotencia
from app.models.idempotencia import RegistroIdempotencia

#: Longitud máxima aceptada para la clave (la columna es String(200)).
LONGITUD_MAXIMA_CLAVE = 200


def clave_idempotencia(
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> str | None:
    """Dependencia FastAPI: lee la cabecera ``Idempotency-Key`` (opcional)."""
    if idempotency_key is None:
        return None
    limpia = idempotency_key.strip()[:LONGITUD_MAXIMA_CLAVE]
    return limpia or None


class Idempotencia:
    """Servicio sin estado sobre la tabla ``registros_idempotencia``."""

    @staticmethod
    def huella(operacion: str, recurso_id: Any = None, payload: Any = None) -> str:
        """Huella estable de la petición: misma clave + misma huella = mismo efecto.

        El JSON se serializa con las claves ordenadas para que el mismo cuerpo
        produzca siempre el mismo sha256, sin depender del orden de los campos.
        """
        material = json.dumps(
            {
                "operacion": operacion,
                "recurso": str(recurso_id) if recurso_id is not None else None,
                "cuerpo": jsonable_encoder(payload),
            },
            sort_keys=True,
            ensure_ascii=False,
            default=str,
        )
        return hashlib.sha256(material.encode("utf-8")).hexdigest()

    @staticmethod
    def recuperar_o_reservar(
        db: Session,
        clave: Optional[str],
        operacion: str,
        huella: str,
        inmobiliaria_id: uuid.UUID | None = None,
    ) -> Optional[dict]:
        """Devuelve la respuesta ya emitida, o reserva la clave y devuelve ``None``.

        - Sin clave: no hay idempotencia, devuelve ``None``.
        - Clave conocida con la misma huella: devuelve la respuesta guardada
          (``None`` si la operación sigue en curso y aún no guardó nada).
        - Clave conocida con otra huella: lanza ``ConflictoIdempotencia``.
        """
        if not clave:
            return None

        registro = Idempotencia._buscar(db, clave, inmobiliaria_id)
        if registro is not None:
            Idempotencia._exigir_misma_huella(registro, huella)
            return registro.respuesta

        try:
            with db.begin_nested():
                db.add(
                    RegistroIdempotencia(
                        id=uuid.uuid4(),
                        inmobiliaria_id=inmobiliaria_id,
                        clave=clave,
                        operacion=operacion,
                        huella=huella,
                        respuesta=None,
                        estado_http=200,
                    )
                )
        except IntegrityError:
            # Dos peticiones simultáneas con la misma clave: la que pierde la
            # carrera se limita a leer lo que dejó la otra.
            registro = Idempotencia._buscar(db, clave, inmobiliaria_id)
            if registro is None:
                return None
            Idempotencia._exigir_misma_huella(registro, huella)
            return registro.respuesta
        return None

    @staticmethod
    def guardar(
        db: Session,
        clave: Optional[str],
        operacion: str,
        huella: str,
        inmobiliaria_id: uuid.UUID | None = None,
        *,
        respuesta: Any = None,
        estado_http: int = 200,
    ) -> None:
        """Persiste el resultado para que los reintentos lo reproduzcan."""
        if not clave:
            return

        cuerpo = jsonable_encoder(respuesta)
        registro = Idempotencia._buscar(db, clave, inmobiliaria_id)
        if registro is not None:
            Idempotencia._exigir_misma_huella(registro, huella)
            registro.respuesta = cuerpo
            registro.estado_http = estado_http
            return

        try:
            with db.begin_nested():
                db.add(
                    RegistroIdempotencia(
                        id=uuid.uuid4(),
                        inmobiliaria_id=inmobiliaria_id,
                        clave=clave,
                        operacion=operacion,
                        huella=huella,
                        respuesta=cuerpo,
                        estado_http=estado_http,
                    )
                )
        except IntegrityError:
            # Ya lo guardó otra petición idéntica: no hay nada que hacer.
            pass

    # -- internos ------------------------------------------------------------
    @staticmethod
    def _buscar(
        db: Session, clave: str, inmobiliaria_id: uuid.UUID | None
    ) -> RegistroIdempotencia | None:
        condicion = (
            RegistroIdempotencia.inmobiliaria_id.is_(None)
            if inmobiliaria_id is None
            else RegistroIdempotencia.inmobiliaria_id == inmobiliaria_id
        )
        return db.execute(
            select(RegistroIdempotencia).where(
                condicion, RegistroIdempotencia.clave == clave
            )
        ).scalar_one_or_none()

    @staticmethod
    def _exigir_misma_huella(registro: RegistroIdempotencia, huella: str) -> None:
        if registro.huella != huella:
            raise ConflictoIdempotencia(
                "Esa clave de idempotencia ya se usó para otra operación. "
                "Usa una clave nueva.",
                detalles={"operacion_previa": registro.operacion},
            )


__all__ = ["Idempotencia", "clave_idempotencia"]
