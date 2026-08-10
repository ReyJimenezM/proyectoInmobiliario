"""Infraestructura de pruebas: base SQLite en memoria y dos inmobiliarias aisladas.

Por qué SQLite y no PostgreSQL: la suite tiene que correr sin servicios externos.
El precio son dos tipos de PostgreSQL que SQLite no conoce:

  * ``JSONB``: se le enseña a compilarse como ``JSON`` **solo** en el dialecto
    sqlite (ver ``_jsonb_como_json_en_sqlite``). Los procesadores de bind/result
    los hereda de ``sqlalchemy.types.JSON``, así que los diccionarios entran y
    salen igual que en producción.
  * ``UUID``: en SQLAlchemy 2.x ``postgresql.UUID`` ya deriva del ``Uuid``
    genérico y se serializa solo en otros dialectos. No hace falta tocarlo.

Los ``Enum`` de la aplicación se declaran con ``sqlalchemy.Enum`` (no con el ENUM
nativo de PostgreSQL), así que en SQLite se materializan como VARCHAR + CHECK.

Con eso, ``Base.metadata.create_all`` levanta el esquema completo: no hace falta
saltarse ningún módulo.
"""
from __future__ import annotations

import os
import sys
import tempfile
import uuid
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

import pytest

# `motor_decision` vive en la raíz del repo y está instalado en el venv en modo
# editable: no se añade su carpeta contenedora a sys.path porque el directorio
# `<raiz>/motor_decision/` ensombrecería al paquete real como namespace package.
_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

# `app.main` hace mkdir sobre storage_public_path al importarse. En producción es
# /app/storage/propiedades; aquí se redirige a un temporal para no escribir fuera
# del entorno de pruebas.
_MEDIA_TMP = Path(tempfile.gettempdir()) / "pruebas-inmobiliario" / "propiedades"
os.environ.setdefault("STORAGE_PUBLIC_PATH", str(_MEDIA_TMP))
os.environ.setdefault("STORAGE_LOCAL_PATH", str(_MEDIA_TMP.parent / "documentos"))

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.dialects.postgresql import JSONB  # noqa: E402
from sqlalchemy.ext.compiler import compiles  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402


@compiles(JSONB, "sqlite")
def _jsonb_como_json_en_sqlite(tipo, compilador, **kw) -> str:
    """JSONB no existe en SQLite; el equivalente funcional es JSON."""
    return "JSON"


import app.models  # noqa: E402,F401  (registra todas las tablas en Base.metadata)
from app.core.errores import ErrorDominio, NoEncontrado  # noqa: E402
from app.core.ratelimit import limitador_login  # noqa: E402
from app.core.security import create_access_token, hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app as app_fastapi  # noqa: E402
from app.models.anunciante import Anunciante  # noqa: E402
from app.models.enums import (  # noqa: E402
    EstadoPropiedad,
    EstadoSolicitud,
    OperacionPropiedad,
    RolUsuario,
    TipoAnunciante,
    TipoPropiedad,
    Vertical,
)
from app.models.inmobiliaria import Inmobiliaria  # noqa: E402
from app.models.propiedad import Propiedad  # noqa: E402
from app.models.propietario import Propietario  # noqa: E402
from app.models.solicitud import Solicitud  # noqa: E402
from app.models.usuario import Usuario  # noqa: E402

#: Contraseña única de la suite. El hash bcrypt se calcula una sola vez: cada
#: hash cuesta cientos de milisegundos y sembramos una docena de usuarios.
PASSWORD = "Demo1234*"
_HASH_PASSWORD = hash_password(PASSWORD)

motor_pruebas = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    future=True,
)
SesionPruebas = sessionmaker(bind=motor_pruebas, autoflush=False, expire_on_commit=False)


def _get_db_pruebas():
    sesion = SesionPruebas()
    try:
        yield sesion
    finally:
        sesion.close()


app_fastapi.dependency_overrides[get_db] = _get_db_pruebas


# ---------------------------------------------------------------------------
# Rutas auxiliares: existen solo para poder observar el contrato de error desde
# fuera (un 500 real y un error de dominio arbitrario). Viven aquí, en tests/,
# y no en la aplicación.
# ---------------------------------------------------------------------------
MENSAJE_SECRETO = "clave-de-base-de-datos-super-secreta"


@app_fastapi.get("/api/_pruebas/explota")
def _ruta_que_explota() -> dict:
    raise RuntimeError(MENSAJE_SECRETO)


@app_fastapi.get("/api/_pruebas/dominio")
def _ruta_error_dominio() -> dict:
    raise NoEncontrado("El recurso de prueba no existe.", detalles={"pista": "es a propósito"})


@app_fastapi.get("/api/_pruebas/ok")
def _ruta_ok() -> dict:
    return {"ok": True}


# ---------------------------------------------------------------------------
# Semilla
# ---------------------------------------------------------------------------
ROLES_SEMBRADOS = (
    RolUsuario.admin,
    RolUsuario.analista,
    RolUsuario.asesor,
    RolUsuario.consulta,
)


def _sembrar_inmobiliaria(sesion, slug: str, nombre: str) -> dict:
    inmobiliaria = Inmobiliaria(
        id=uuid.uuid4(),
        nombre_legal=f"{nombre} S.A.S.",
        nombre_comercial=nombre,
        nit="900123456-1",
    )
    sesion.add(inmobiliaria)
    sesion.flush()

    usuarios: dict[str, Usuario] = {}
    for rol in ROLES_SEMBRADOS:
        usuario = Usuario(
            id=uuid.uuid4(),
            email=f"{rol.value}@{slug}.co",
            password_hash=_HASH_PASSWORD,
            rol=rol,
            nombre_completo=f"{rol.value.title()} de {nombre}",
            inmobiliaria_id=inmobiliaria.id,
        )
        sesion.add(usuario)
        usuarios[rol.value] = usuario

    # El solicitante no pertenece a ninguna inmobiliaria: su identidad es compartida.
    solicitante = Usuario(
        id=uuid.uuid4(),
        email=f"solicitante@{slug}.co",
        password_hash=_HASH_PASSWORD,
        rol=RolUsuario.solicitante,
        nombre_completo=f"Solicitante de {nombre}",
        inmobiliaria_id=None,
    )
    sesion.add(solicitante)
    usuarios["solicitante"] = solicitante
    sesion.flush()

    anunciante = Anunciante(
        id=uuid.uuid4(),
        tipo=TipoAnunciante.inmobiliaria,
        nombre=nombre,
        email=f"contacto@{slug}.co",
        inmobiliaria_id=inmobiliaria.id,
    )
    sesion.add(anunciante)
    sesion.flush()

    propiedad = Propiedad(
        id=uuid.uuid4(),
        titulo=f"Apartamento de {nombre}",
        descripcion="Inmueble de prueba con tres alcobas.",
        tipo=TipoPropiedad.apartamento,
        operacion=OperacionPropiedad.arriendo,
        precio=Decimal("3200000"),
        valor_admin=Decimal("480000"),
        area_m2=Decimal("78"),
        habitaciones=3,
        banos=2,
        parqueaderos=1,
        ciudad="Bogotá",
        zona="Chapinero",
        barrio="Chicó",
        estrato=5,
        anunciante_id=anunciante.id,
        inmobiliaria_id=inmobiliaria.id,
        estado=EstadoPropiedad.activo,
    )
    sesion.add(propiedad)

    propietario = Propietario(
        id=uuid.uuid4(),
        inmobiliaria_id=inmobiliaria.id,
        nombre=f"Propietario de {nombre}",
        tipo_documento="CC",
        documento=f"10{abs(hash(slug)) % 100000000:08d}",
        ciudad="Bogotá",
    )
    sesion.add(propietario)
    sesion.flush()

    solicitud = Solicitud(
        id=uuid.uuid4(),
        solicitante_id=solicitante.id,
        propiedad_id=propiedad.id,
        inmobiliaria_id=inmobiliaria.id,
        vertical=Vertical.arriendo,
        estado=EstadoSolicitud.borrador,
        codigo_seguimiento=slug.upper()[:8].ljust(8, "0"),
    )
    sesion.add(solicitud)
    sesion.flush()

    return {
        "inmobiliaria": inmobiliaria,
        "usuarios": usuarios,
        "anunciante": anunciante,
        "propiedad": propiedad,
        "propietario": propietario,
        "solicitud": solicitud,
    }


class _Tenant:
    """Vista cómoda de una inmobiliaria sembrada: ids planos, sin objetos ORM vivos."""

    def __init__(self, datos: dict):
        self.id = datos["inmobiliaria"].id
        self.nombre = datos["inmobiliaria"].nombre_comercial
        self.propiedad_id = datos["propiedad"].id
        self.propietario_id = datos["propietario"].id
        self.solicitud_id = datos["solicitud"].id
        self.anunciante_id = datos["anunciante"].id
        self.usuarios = {
            rol: {"id": u.id, "email": u.email, "rol": u.rol}
            for rol, u in datos["usuarios"].items()
        }

    def usuario_id(self, rol: str) -> uuid.UUID:
        return self.usuarios[rol]["id"]

    def token(self, rol: str) -> str:
        datos = self.usuarios[rol]
        return create_access_token(str(datos["id"]), datos["rol"].value)

    def cabeceras(self, rol: str) -> dict:
        """Cabecera Authorization lista para usar con el TestClient."""
        return {"Authorization": f"Bearer {self.token(rol)}"}


@pytest.fixture(scope="session", autouse=True)
def _esquema():
    Base.metadata.create_all(motor_pruebas)
    sesion = SesionPruebas()
    datos_a = _sembrar_inmobiliaria(sesion, "andina", "Inmobiliaria Andina")
    datos_b = _sembrar_inmobiliaria(sesion, "paisa", "Vivienda Paisa")
    sesion.commit()
    tenants = (_Tenant(datos_a), _Tenant(datos_b))
    sesion.close()
    yield tenants
    Base.metadata.drop_all(motor_pruebas)


@pytest.fixture
def inmobiliaria_a(_esquema) -> _Tenant:
    return _esquema[0]


@pytest.fixture
def inmobiliaria_b(_esquema) -> _Tenant:
    return _esquema[1]


@pytest.fixture
def sesion():
    """Sesión directa contra la base de pruebas (para lo que no pasa por HTTP)."""
    db = SesionPruebas()
    try:
        yield db
        db.rollback()
    finally:
        db.close()


@pytest.fixture
def cliente():
    with TestClient(app_fastapi) as test_client:
        yield test_client


@pytest.fixture
def cliente_sin_relanzar():
    """Cliente que devuelve el 500 en vez de re-lanzar la excepción del servidor.

    Es lo que permite comprobar qué ve realmente el cliente ante un fallo no
    controlado.
    """
    with TestClient(app_fastapi, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def _limitador_limpio():
    """El limitador vive en memoria del proceso: sin limpiarlo, un test que agota
    los intentos bloquearía a los siguientes y el orden cambiaría el resultado."""
    limitador_login.reiniciar()
    yield
    limitador_login.reiniciar()


@pytest.fixture
def cabeceras(inmobiliaria_a):
    """Atajo: `cabeceras("analista")` para la inmobiliaria A."""
    return inmobiliaria_a.cabeceras


# ---------------------------------------------------------------------------
# Utilidades compartidas
# ---------------------------------------------------------------------------
def fecha_hace(anios: int = 0, dias: int = 0) -> date:
    return date.today() - timedelta(days=anios * 365 + dias)


__all__ = [
    "ErrorDominio",
    "FastAPI",
    "MENSAJE_SECRETO",
    "PASSWORD",
    "SesionPruebas",
    "fecha_hace",
    "motor_pruebas",
]
