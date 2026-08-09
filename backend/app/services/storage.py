"""Interfaz de almacenamiento de documentos, abstraida para que cambiar de proveedor en
produccion (ej. S3) no toque el resto del codigo -- solo se reemplaza la implementacion
concreta que instancia get_storage_backend()."""
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from app.core.config import settings

EXTENSIONES_PERMITIDAS = {".pdf", ".jpg", ".jpeg", ".png"}
EXTENSIONES_IMAGEN = {".jpg", ".jpeg", ".png", ".webp"}
TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024  # 10 MB


class ArchivoInvalidoError(Exception):
    pass


class StorageBackend(ABC):
    @abstractmethod
    def guardar(
        self, carpeta_id: uuid.UUID, nombre_archivo: str, contenido: bytes,
        extensiones_permitidas: set[str] = EXTENSIONES_PERMITIDAS,
    ) -> str:
        """Guarda el archivo y devuelve la URL/ruta relativa para persistir en la DB."""

    @abstractmethod
    def leer(self, url_archivo: str) -> bytes:
        """Lee el contenido de un archivo previamente guardado."""

    @abstractmethod
    def eliminar(self, url_archivo: str) -> None:
        """Elimina un archivo previamente guardado. No falla si ya no existe."""


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_path: str | None = None) -> None:
        self.base_path = Path(base_path or settings.storage_local_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def guardar(
        self, carpeta_id: uuid.UUID, nombre_archivo: str, contenido: bytes,
        extensiones_permitidas: set[str] = EXTENSIONES_PERMITIDAS,
    ) -> str:
        extension = Path(nombre_archivo).suffix.lower()
        if extension not in extensiones_permitidas:
            raise ArchivoInvalidoError(f"Formato no permitido: {extension}.")
        if len(contenido) > TAMANO_MAXIMO_BYTES:
            raise ArchivoInvalidoError("El archivo supera el tamaño máximo de 10 MB.")

        carpeta = self.base_path / str(carpeta_id)
        carpeta.mkdir(parents=True, exist_ok=True)

        nombre_unico = f"{uuid.uuid4()}{extension}"
        ruta_absoluta = carpeta / nombre_unico
        ruta_absoluta.write_bytes(contenido)

        return f"{carpeta_id}/{nombre_unico}"

    def leer(self, url_archivo: str) -> bytes:
        ruta_absoluta = self.base_path / url_archivo
        if not ruta_absoluta.resolve().is_relative_to(self.base_path.resolve()):
            raise ArchivoInvalidoError("Ruta de archivo inválida.")
        return ruta_absoluta.read_bytes()

    def eliminar(self, url_archivo: str) -> None:
        ruta_absoluta = self.base_path / url_archivo
        if not ruta_absoluta.resolve().is_relative_to(self.base_path.resolve()):
            raise ArchivoInvalidoError("Ruta de archivo inválida.")
        ruta_absoluta.unlink(missing_ok=True)


def get_storage_backend() -> StorageBackend:
    if settings.storage_backend == "local":
        return LocalStorageBackend()
    raise NotImplementedError(
        f"Backend de storage '{settings.storage_backend}' no implementado en el demo. "
        "Implementa una clase que herede de StorageBackend (ej. S3StorageBackend) para producción."
    )


def get_public_storage_backend() -> StorageBackend:
    """Storage para archivos servidos publicamente (fotos de propiedades), separado del
    storage privado de documentos de solicitud (No Negociable #6: URLs de documentos
    financieros nunca publicas)."""
    if settings.storage_backend == "local":
        return LocalStorageBackend(settings.storage_public_path)
    raise NotImplementedError(
        f"Backend de storage '{settings.storage_backend}' no implementado en el demo."
    )
