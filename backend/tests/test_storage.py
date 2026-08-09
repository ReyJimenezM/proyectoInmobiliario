import uuid

import pytest

from app.services.storage import ArchivoInvalidoError, EXTENSIONES_IMAGEN, LocalStorageBackend


@pytest.fixture
def storage(tmp_path):
    return LocalStorageBackend(str(tmp_path))


def test_guardar_y_leer_archivo_valido(storage):
    carpeta_id = uuid.uuid4()
    ruta = storage.guardar(carpeta_id, "foto.jpg", b"contenido-imagen")

    assert ruta.startswith(f"{carpeta_id}/")
    assert storage.leer(ruta) == b"contenido-imagen"


def test_guardar_rechaza_extension_no_permitida(storage):
    with pytest.raises(ArchivoInvalidoError):
        storage.guardar(uuid.uuid4(), "malware.exe", b"x", extensiones_permitidas=EXTENSIONES_IMAGEN)


def test_guardar_respeta_lista_de_extensiones_personalizada(storage):
    # .pdf esta en la lista general de documentos pero no en la de imagenes
    with pytest.raises(ArchivoInvalidoError):
        storage.guardar(uuid.uuid4(), "doc.pdf", b"x", extensiones_permitidas=EXTENSIONES_IMAGEN)

    ruta = storage.guardar(uuid.uuid4(), "foto.webp", b"x", extensiones_permitidas=EXTENSIONES_IMAGEN)
    assert ruta.endswith(".webp")


def test_guardar_rechaza_archivo_demasiado_grande(storage):
    contenido_grande = b"x" * (11 * 1024 * 1024)
    with pytest.raises(ArchivoInvalidoError):
        storage.guardar(uuid.uuid4(), "foto.jpg", contenido_grande)


def test_eliminar_borra_el_archivo(storage):
    carpeta_id = uuid.uuid4()
    ruta = storage.guardar(carpeta_id, "foto.jpg", b"contenido")
    storage.eliminar(ruta)

    with pytest.raises(FileNotFoundError):
        storage.leer(ruta)


def test_eliminar_no_falla_si_el_archivo_ya_no_existe(storage):
    storage.eliminar("no/existe.jpg")  # no debe lanzar excepcion


def test_leer_rechaza_path_traversal(storage):
    with pytest.raises(ArchivoInvalidoError):
        storage.leer("../../etc/passwd")


def test_cada_archivo_guardado_tiene_nombre_unico(storage):
    carpeta_id = uuid.uuid4()
    ruta1 = storage.guardar(carpeta_id, "foto.jpg", b"a")
    ruta2 = storage.guardar(carpeta_id, "foto.jpg", b"b")
    assert ruta1 != ruta2
