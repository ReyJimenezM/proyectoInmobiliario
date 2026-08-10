"""Catálogos oficiales: DIVIPOLA (DANE) y CIIU Rev. 4 A.C.

`app/catalogos/datos.py`, `app/api/catalogos.py` y las funciones de consulta de
`app/validacion/colombia.py`.

Dos cosas se cuidan aquí: que el catálogo sea el oficial y esté completo, y que
lo que la API publica sea exactamente lo que el validador acepta. Si divergen, el
usuario elige de una lista y el backend le dice que su elección no vale.
"""
from __future__ import annotations

import pytest

from app.catalogos import CIIU_CLASES, CIIU_DIVISIONES, CIIU_SECCIONES, DEPARTAMENTOS, DIVIPOLA
from app.validacion.colombia import (
    MUNICIPIOS_POR_COD,
    buscar_municipios,
    sin_tildes,
    validar_ciiu,
    validar_departamento,
    validar_municipio,
)

TOTAL_DEPARTAMENTOS = 33  # 32 departamentos + Bogotá, D.C.
TOTAL_MUNICIPIOS = 1_122

RUTA_MUNICIPIOS = "/api/catalogos/divipola/municipios"
RUTA_CIIU = "/api/catalogos/ciiu"


# ---------------------------------------------------------------------------
# DIVIPOLA: integridad del catálogo
# ---------------------------------------------------------------------------
def test_estan_los_33_departamentos_y_los_1122_municipios():
    assert len(DIVIPOLA) == TOTAL_DEPARTAMENTOS
    assert len(DEPARTAMENTOS) == TOTAL_DEPARTAMENTOS
    assert sum(len(d[2]) for d in DIVIPOLA) == TOTAL_MUNICIPIOS
    assert len(MUNICIPIOS_POR_COD) == TOTAL_MUNICIPIOS


def test_todo_codigo_de_municipio_tiene_cinco_digitos_y_empieza_por_el_de_su_departamento():
    for cod_depto, _nombre, municipios in DIVIPOLA:
        assert len(cod_depto) == 2 and cod_depto.isdigit()
        for cod_municipio, nombre_municipio in municipios:
            assert len(cod_municipio) == 5, cod_municipio
            assert cod_municipio.isdigit(), cod_municipio
            assert cod_municipio.startswith(cod_depto), (cod_municipio, cod_depto)
            assert nombre_municipio.strip()


def test_no_hay_codigos_de_municipio_ni_de_departamento_duplicados():
    codigos_municipio = [m[0] for d in DIVIPOLA for m in d[2]]
    codigos_departamento = [d[0] for d in DIVIPOLA]

    assert len(set(codigos_municipio)) == len(codigos_municipio)
    assert len(set(codigos_departamento)) == len(codigos_departamento)


# ---------------------------------------------------------------------------
# DIVIPOLA: búsqueda
# ---------------------------------------------------------------------------
def test_la_busqueda_de_municipios_ignora_las_tildes(cliente):
    respuesta = cliente.get(RUTA_MUNICIPIOS, params={"q": "bogota"})

    nombres = [m["nombre"] for m in respuesta.json()["municipios"]]
    assert "Bogotá, D.C." in nombres


@pytest.mark.parametrize("termino", ["medellin", "MEDELLÍN", "Medellin"])
def test_la_busqueda_es_indiferente_a_mayusculas_y_tildes(cliente, termino):
    respuesta = cliente.get(RUTA_MUNICIPIOS, params={"q": termino})

    assert any(m["cod"] == "05001" for m in respuesta.json()["municipios"])


def test_se_puede_buscar_por_codigo_divipola(cliente):
    respuesta = cliente.get(RUTA_MUNICIPIOS, params={"q": "11001"})

    municipios = respuesta.json()["municipios"]
    assert [m["cod"] for m in municipios] == ["11001"]
    assert municipios[0]["cod_departamento"] == "11"


def test_se_puede_filtrar_por_departamento(cliente):
    respuesta = cliente.get(RUTA_MUNICIPIOS, params={"departamento": "05", "limite": 500})

    cuerpo = respuesta.json()
    assert cuerpo["total"] == len(DIVIPOLA[[d[0] for d in DIVIPOLA].index("05")][2])
    assert all(m["cod_departamento"] == "05" for m in cuerpo["municipios"])


def test_cada_municipio_devuelto_trae_el_nombre_de_su_departamento(cliente):
    respuesta = cliente.get(RUTA_MUNICIPIOS, params={"q": "bogota"})

    municipio = respuesta.json()["municipios"][0]
    assert municipio["departamento"]


# ---------------------------------------------------------------------------
# DIVIPOLA: paginación
# ---------------------------------------------------------------------------
def test_los_municipios_vienen_paginados_y_no_de_golpe(cliente):
    respuesta = cliente.get(RUTA_MUNICIPIOS)

    cuerpo = respuesta.json()
    assert cuerpo["total"] == TOTAL_MUNICIPIOS
    assert len(cuerpo["municipios"]) == 100  # límite por defecto
    assert cuerpo["limite"] == 100 and cuerpo["desplazamiento"] == 0


def test_el_limite_tiene_techo(cliente):
    """1.122 municipios en un `select` es justo lo que se quiere evitar."""
    assert cliente.get(RUTA_MUNICIPIOS, params={"limite": 500}).status_code == 200
    assert cliente.get(RUTA_MUNICIPIOS, params={"limite": 501}).status_code == 422
    assert cliente.get(RUTA_MUNICIPIOS, params={"limite": 5000}).status_code == 422


@pytest.mark.parametrize("params", [{"limite": -1}, {"limite": 0}, {"desplazamiento": -1}])
def test_no_se_aceptan_limites_ni_desplazamientos_negativos(cliente, params):
    respuesta = cliente.get(RUTA_MUNICIPIOS, params=params)

    assert respuesta.status_code == 422
    assert respuesta.json()["code"] == "VALIDATION_ERROR"


def test_el_desplazamiento_realmente_pagina(cliente):
    primera = cliente.get(RUTA_MUNICIPIOS, params={"limite": 50, "desplazamiento": 0}).json()
    segunda = cliente.get(RUTA_MUNICIPIOS, params={"limite": 50, "desplazamiento": 50}).json()

    codigos_primera = {m["cod"] for m in primera["municipios"]}
    codigos_segunda = {m["cod"] for m in segunda["municipios"]}
    assert len(codigos_primera) == len(codigos_segunda) == 50
    assert codigos_primera & codigos_segunda == set()
    assert primera["total"] == segunda["total"] == TOTAL_MUNICIPIOS


def test_recorriendo_todas_las_paginas_se_obtiene_el_catalogo_completo(cliente):
    vistos: set[str] = set()
    for desplazamiento in range(0, TOTAL_MUNICIPIOS, 500):
        pagina = cliente.get(
            RUTA_MUNICIPIOS, params={"limite": 500, "desplazamiento": desplazamiento}
        ).json()
        vistos.update(m["cod"] for m in pagina["municipios"])

    assert vistos == set(MUNICIPIOS_POR_COD)


def test_un_desplazamiento_mas_alla_del_total_devuelve_una_pagina_vacia(cliente):
    cuerpo = cliente.get(RUTA_MUNICIPIOS, params={"desplazamiento": 5_000}).json()

    assert cuerpo["municipios"] == []
    assert cuerpo["total"] == TOTAL_MUNICIPIOS


def test_los_resultados_vienen_ordenados_por_nombre():
    pagina, _total = buscar_municipios(limite=200)

    nombres = [sin_tildes(m["nombre"]) for m in pagina]
    assert nombres == sorted(nombres)


# ---------------------------------------------------------------------------
# CIIU
# ---------------------------------------------------------------------------
def test_se_busca_ciiu_por_descripcion(cliente):
    resultados = cliente.get(RUTA_CIIU, params={"q": "programacion informatica"}).json()

    assert resultados
    assert any(r["codigo"] == "6201" for r in resultados)
    assert all({"codigo", "descripcion", "seccion", "division"} <= set(r) for r in resultados)


def test_se_busca_ciiu_por_codigo(cliente):
    resultados = cliente.get(RUTA_CIIU, params={"q": "6201"}).json()

    assert resultados[0]["codigo"] == "6201"


def test_un_ciiu_inexistente_no_devuelve_resultados(cliente):
    """La API de CIIU es un buscador, no un endpoint de detalle: un código que no
    existe devuelve la lista vacía (200), no un 404."""
    respuesta = cliente.get(RUTA_CIIU, params={"q": "9999"})

    assert respuesta.status_code == 200
    assert respuesta.json() == []
    assert validar_ciiu("9999") is None


def test_un_catalogo_operativo_inexistente_si_da_404(cliente, inmobiliaria_a):
    respuesta = cliente.put(
        "/api/admin/catalogos/operativos/no-existe",
        json={"valores": ["algo"]},
        headers=inmobiliaria_a.cabeceras("admin"),
    )

    assert respuesta.status_code == 404
    assert respuesta.json()["code"] == "NOT_FOUND"


def test_una_busqueda_demasiado_corta_no_devuelve_el_catalogo_entero(cliente):
    assert cliente.get(RUTA_CIIU, params={"q": "a"}).json() == []
    assert cliente.get(RUTA_CIIU).json() == []


def test_la_estructura_ciiu_declara_su_cobertura(cliente):
    cuerpo = cliente.get("/api/catalogos/ciiu/estructura").json()

    assert len(cuerpo["secciones"]) == len(CIIU_SECCIONES) == 21
    assert len(cuerpo["divisiones"]) == len(CIIU_DIVISIONES)
    assert cuerpo["total_clases"] == len(CIIU_CLASES)
    # La cobertura parcial se declara en vez de disimularse.
    assert cuerpo["total_oficial"] > cuerpo["total_clases"]


def test_no_hay_codigos_ciiu_duplicados():
    codigos = [c[0] for c in CIIU_CLASES]

    assert len(set(codigos)) == len(codigos)


def test_toda_clase_ciiu_pertenece_a_una_division_declarada():
    divisiones = {d[0] for d in CIIU_DIVISIONES}
    secciones = {s[0] for s in CIIU_SECCIONES}

    for codigo, _descripcion in CIIU_CLASES:
        assert len(codigo) == 4 and codigo.isdigit(), codigo
        assert codigo[:2] in divisiones, codigo
    assert {d[1] for d in CIIU_DIVISIONES} <= secciones


# ---------------------------------------------------------------------------
# Coherencia entre lo que publica la API y lo que acepta la validación
# ---------------------------------------------------------------------------
def test_todo_departamento_publicado_lo_acepta_la_validacion(cliente):
    departamentos = cliente.get("/api/catalogos/divipola").json()["departamentos"]

    assert len(departamentos) == TOTAL_DEPARTAMENTOS
    for departamento in departamentos:
        assert validar_departamento(departamento["cod"]) is not None, departamento


def test_todo_municipio_publicado_lo_acepta_la_validacion(cliente):
    """Si divergieran, el usuario elegiría de la lista y el backend le diría que su
    elección no es válida."""
    for desplazamiento in range(0, TOTAL_MUNICIPIOS, 500):
        pagina = cliente.get(
            RUTA_MUNICIPIOS, params={"limite": 500, "desplazamiento": desplazamiento}
        ).json()["municipios"]
        for municipio in pagina:
            info = validar_municipio(municipio["cod"])
            assert info is not None, municipio
            assert info["nombre"] == municipio["nombre"]
            assert info["cod_departamento"] == municipio["cod_departamento"]


def test_todo_ciiu_publicado_lo_acepta_la_validacion():
    for codigo, descripcion in CIIU_CLASES:
        info = validar_ciiu(codigo)
        assert info is not None, codigo
        assert info["descripcion"] == descripcion
        assert info["division"] == codigo[:2]


def test_lo_que_devuelve_el_buscador_ciiu_tambien_lo_acepta_la_validacion(cliente):
    for termino in ("programacion", "restaurante", "construccion", "transporte", "educacion"):
        for resultado in cliente.get(RUTA_CIIU, params={"q": termino}).json():
            assert validar_ciiu(resultado["codigo"]) is not None, resultado
