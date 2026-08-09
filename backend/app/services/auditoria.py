"""Unico punto de escritura hacia la tabla auditoria. No existe (ni debe existir) ningun
endpoint de UPDATE/DELETE sobre esta tabla -- ademas, la migracion 0002 agrega un trigger
a nivel de PostgreSQL que rechaza esas operaciones aunque alguien las intente directo
contra la base de datos (No Negociable #1)."""
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.auditoria import Auditoria


def registrar(
    db: Session,
    *,
    entidad_tipo: str,
    entidad_id: uuid.UUID,
    accion: str,
    actor_id: uuid.UUID | None,
    payload_despues: dict[str, Any],
    payload_antes: dict[str, Any] | None = None,
) -> Auditoria:
    entrada = Auditoria(
        id=uuid.uuid4(),
        entidad_tipo=entidad_tipo,
        entidad_id=entidad_id,
        accion=accion,
        actor_id=actor_id,
        payload_antes=payload_antes,
        payload_despues=payload_despues,
    )
    db.add(entrada)
    return entrada
