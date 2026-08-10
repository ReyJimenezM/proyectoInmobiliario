"""Motor de validación declarativo — capa 1 (app/validacion/).

La distinción que sostiene todo el módulo: FALTANTE ≠ INVALIDO. Un dato que
todavía no se pidió no es un dato mal escrito; confundirlos manda a revisión
humana todos los expedientes a medio diligenciar.
"""
from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.validacion import (
    ADVERTENCIA,
    CONTRADICTORIO,
    FALTANTE,
    INVALIDO,
    SIN_VERIFICAR,
    VALIDO,
    validar,
    validar_campo,
)
from app.validacion.colombia import MAX_RAZONABLE_INGRESO, antiguedad_meses

HOY = date.today()


def _estado(nombre: str, valor, ctx: dict | None = None) -> str:
    return validar_campo(nombre, valor, ctx).estado


# ---------------------------------------------------------------------------
# Falta ≠ está mal
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("vacio", [None, "", "   "])
def test_un_obligatorio_vacio_sale_faltante_no_invalido(vacio):
    resultado = validar_campo("nombres_apellidos", vacio)

    assert resultado.estado == FALTANTE
    assert resultado.estado != INVALIDO
    assert resultado.codigo == "OBLIGATORIO"
    assert resultado.mensaje == "Falta nombres y apellidos."


def test_un_obligatorio_ausente_del_payload_tambien_sale_faltante():
    informe = validar({"nombres_apellidos": "Laura Gómez Restrepo"})

    faltantes = {r.campo for r in informe.faltantes}
    assert "email" in faltantes and "telefono" in faltantes
    assert all(r.codigo == "OBLIGATORIO" for r in informe.faltantes)
    assert not informe.invalidos


def test_un_opcional_vacio_no_es_ni_faltante_ni_invalido():
    resultado = validar_campo("empresa", "")

    assert resultado.estado == VALIDO
    assert resultado.valor is None


def test_un_expediente_incompleto_no_se_marca_invalido_solo_por_estar_incompleto():
    informe = validar({}, exigir_ausentes=True)

    assert informe.faltantes
    assert informe.invalidos == []
    assert informe.contradictorios == []
    # `valido` mira solo lo mal escrito, no lo que aún no se ha capturado.
    assert informe.valido is True


def test_se_puede_desactivar_la_exigencia_de_campos_ausentes():
    informe = validar({"telefono": "3114589922"}, exigir_ausentes=False)

    assert informe.faltantes == []


# ---------------------------------------------------------------------------
# NIT: dígito de verificación DIAN
# ---------------------------------------------------------------------------
def test_el_nit_de_bancolombia_con_su_dv_es_valido():
    resultado = validar_campo("nit_empleador", "890903938-8")

    assert resultado.estado == VALIDO
    assert resultado.valor == {"base": "890903938", "dv": 8}


def test_un_dv_equivocado_dice_cual_deberia_ser():
    resultado = validar_campo("nit_empleador", "890903938-1")

    assert resultado.estado == INVALIDO
    assert resultado.codigo == "NIT_DV_INVALIDO"
    assert "debería ser 8, no 1" in resultado.mensaje
    assert resultado.valor["esperado"] == 8


def test_el_nit_sin_dv_se_autocompleta_como_advertencia():
    """No es un error del solicitante: el DV es derivable, se calcula y se avisa."""
    resultado = validar_campo("nit_empleador", "890903938")

    assert resultado.estado == ADVERTENCIA
    assert resultado.estado != INVALIDO
    assert resultado.codigo == "NIT_DV_FALTANTE"
    assert resultado.valor == {"base": "890903938", "dv": 8, "autocompletado": True}


def test_el_nit_con_puntos_se_normaliza():
    assert validar_campo("nit_empleador", "890.903.938-8").estado == VALIDO


@pytest.mark.parametrize("basura", ["NIT890903938", "89090ABC38-8", "abc"])
def test_un_nit_con_letras_es_invalido(basura):
    resultado = validar_campo("nit_empleador", basura)

    assert resultado.estado == INVALIDO
    assert resultado.codigo == "NIT_NO_NUMERICO"


# ---------------------------------------------------------------------------
# Dinero: se presenta formateado, se almacena entero
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("entrada", ["$1.500.000", "1.500.000", "1500000", 1500000])
def test_el_dinero_se_almacena_como_entero(entrada):
    resultado = validar_campo("ingresos_mensuales_fijos", entrada)

    assert resultado.estado == VALIDO
    assert resultado.valor == 1_500_000
    assert isinstance(resultado.valor, int)


@pytest.mark.parametrize("basura", ["un millón quinientos", "1.500.000 pesos", "mil"])
def test_el_dinero_con_letras_es_invalido(basura):
    resultado = validar_campo("ingresos_mensuales_fijos", basura)

    assert resultado.estado == INVALIDO
    assert resultado.codigo == "NO_NUMERICO"
    assert "solo en números" in resultado.mensaje


def test_un_ingreso_absurdo_es_advertencia_no_rechazo():
    """Puede ser cierto. Se confirma con soportes, no se le cierra la puerta."""
    resultado = validar_campo("ingresos_mensuales_fijos", MAX_RAZONABLE_INGRESO + 1)

    assert resultado.estado == ADVERTENCIA
    assert resultado.estado not in (INVALIDO, FALTANTE)
    assert resultado.codigo == "MONTO_INUSUAL"
    assert resultado.valor == MAX_RAZONABLE_INGRESO + 1  # el valor se conserva


def test_un_ingreso_negativo_es_invalido():
    resultado = validar_campo("ingresos_variables", -5_000)

    assert resultado.estado == INVALIDO
    assert resultado.codigo == "MONTO_MENOR_AL_MINIMO"
    assert resultado.mensaje == "El valor no puede ser negativo."


def test_un_ingreso_fijo_en_cero_no_alcanza_el_minimo():
    resultado = validar_campo("ingresos_mensuales_fijos", 0)

    assert resultado.estado == INVALIDO
    assert "$1" in resultado.mensaje


# ---------------------------------------------------------------------------
# Teléfonos
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "entrada", ["3114589922", "311 458 9922", "+57 311 458 9922", "(311) 458-9922"]
)
def test_el_celular_de_diez_digitos_se_normaliza(entrada):
    resultado = validar_campo("telefono", entrada)

    assert resultado.estado == VALIDO
    assert resultado.valor == "3114589922"


def test_el_fijo_con_indicativo_moderno_es_valido():
    assert validar_campo("telefono", "601 745 3300").valor == "6017453300"


@pytest.mark.parametrize(
    "entrada,codigo",
    [
        ("7453300", "TELEFONO_SIN_INDICATIVO"),
        ("31145899", "TELEFONO_LONGITUD"),
        ("2114589922", "TELEFONO_PREFIJO"),
        ("311-CASA-99", "TELEFONO_NO_NUMERICO"),
    ],
)
def test_los_telefonos_invalidos_se_rechazan_con_su_motivo(entrada, codigo):
    resultado = validar_campo("telefono", entrada)

    assert resultado.estado == INVALIDO
    assert resultado.codigo == codigo


# ---------------------------------------------------------------------------
# Fechas y edades
# ---------------------------------------------------------------------------
def test_una_fecha_de_nacimiento_futura_se_rechaza():
    resultado = validar_campo("fecha_nacimiento", (HOY + timedelta(days=1)).isoformat())

    assert resultado.estado == INVALIDO
    assert resultado.codigo == "FECHA_FUTURA"


def test_un_menor_de_dieciocho_se_rechaza():
    resultado = validar_campo("fecha_nacimiento", (HOY - timedelta(days=365 * 17)).isoformat())

    assert resultado.estado == INVALIDO
    assert resultado.codigo == "EDAD_MENOR_AL_MINIMO"
    assert "mayor de 18 años" in resultado.mensaje


def test_un_mayor_de_edad_pasa():
    assert _estado("fecha_nacimiento", (HOY - timedelta(days=365 * 34)).isoformat()) == VALIDO


def test_una_edad_imposible_se_rechaza():
    resultado = validar_campo("fecha_nacimiento", "1890-01-01")

    assert resultado.estado == INVALIDO
    assert resultado.codigo == "EDAD_MAYOR_AL_MAXIMO"


def test_una_fecha_mal_escrita_se_rechaza():
    assert validar_campo("fecha_nacimiento", "31/02/1990").codigo == "FECHA_FORMATO"


def test_empezar_a_trabajar_a_los_cinco_anios_es_imposible():
    nacimiento = date(1990, 5, 20)
    ctx = {"fecha_nacimiento": nacimiento.isoformat()}

    resultado = validar_campo("fecha_ingreso_laboral", "1995-06-01", ctx)

    assert resultado.estado == CONTRADICTORIO
    assert resultado.codigo == "ANTIGUEDAD_IMPOSIBLE"
    assert "a los 5 años" in resultado.mensaje


def test_una_fecha_laboral_anterior_al_nacimiento_es_contradictoria():
    ctx = {"fecha_nacimiento": "1990-05-20"}

    resultado = validar_campo("fecha_ingreso_laboral", "1985-06-01", ctx)

    assert resultado.estado == CONTRADICTORIO
    assert resultado.codigo == "ORDEN_DE_FECHAS"


def test_una_fecha_laboral_coherente_pasa():
    ctx = {"fecha_nacimiento": "1990-05-20"}

    assert _estado("fecha_ingreso_laboral", "2018-03-01", ctx) == VALIDO


# ---------------------------------------------------------------------------
# La antigüedad siempre se calcula, nunca se acepta la declarada
# ---------------------------------------------------------------------------
def test_la_antiguedad_se_recalcula_desde_la_fecha_de_ingreso():
    ingreso = HOY - timedelta(days=365 * 6)
    ctx = {"fecha_ingreso_laboral": ingreso.isoformat()}
    esperado = antiguedad_meses(ingreso)

    resultado = validar_campo("antiguedad_cargo_meses", 999, ctx)

    assert resultado.valor == esperado
    assert resultado.valor != 999


def test_la_antiguedad_declarada_que_no_cuadra_queda_contradictoria():
    ctx = {"fecha_ingreso_laboral": (HOY - timedelta(days=365 * 6)).isoformat()}

    resultado = validar_campo("antiguedad_cargo_meses", 6, ctx)

    assert resultado.estado == CONTRADICTORIO
    assert resultado.codigo == "ANTIGUEDAD_DECLARADA_NO_COINCIDE"
    assert "Se usa la calculada." in resultado.mensaje


def test_la_antiguedad_declarada_dentro_de_la_tolerancia_se_acepta():
    ingreso = HOY - timedelta(days=365 * 6)
    ctx = {"fecha_ingreso_laboral": ingreso.isoformat()}
    calculado = antiguedad_meses(ingreso)

    resultado = validar_campo("antiguedad_cargo_meses", calculado + 1, ctx)

    assert resultado.estado == VALIDO
    assert resultado.valor == calculado  # aun así se guarda la calculada


def test_sin_fecha_de_ingreso_la_antiguedad_queda_sin_verificar():
    """Se acepta como declarada, pero marcada: no se disfraza de dato verificado."""
    resultado = validar_campo("antiguedad_cargo_meses", 48, {})

    assert resultado.estado == SIN_VERIFICAR
    assert resultado.codigo == "SIN_FUENTE_PARA_CALCULAR"
    assert resultado.valor == 48


def test_los_anios_de_antiguedad_se_calculan_en_anios_no_en_meses():
    ingreso = HOY - timedelta(days=365 * 6)
    ctx = {"fecha_ingreso_laboral": ingreso.isoformat()}

    resultado = validar_campo("antiguedad_laboral_anios", 6, ctx)

    assert resultado.estado == VALIDO
    assert resultado.valor == round(antiguedad_meses(ingreso) / 12)


# ---------------------------------------------------------------------------
# Colecciones: el error señala la fila exacta
# ---------------------------------------------------------------------------
def test_las_colecciones_se_validan_fila_por_fila_con_su_indice():
    informe = validar(
        {},
        exigir_ausentes=False,
        colecciones={
            "otros_creditos": [
                {"entidad": "Banco de Bogotá", "cuota_mensual": "420000"},
                {"entidad": "Falabella", "cuota_mensual": "300000"},
                {"entidad": "Nequi", "cuota_mensual": "trescientos mil"},
            ]
        },
    )

    invalidos = informe.invalidos
    assert len(invalidos) == 1
    # "revisa las deudas" no sirve: hay que poder señalar la fila en la interfaz.
    assert invalidos[0].campo == "otros_creditos[2].cuota_mensual"


def test_una_fila_incompleta_marca_su_propio_indice():
    informe = validar(
        {},
        exigir_ausentes=False,
        colecciones={"referencias": [{"nombre": "Ana Peña"}, {"nombre": ""}]},
    )

    assert [r.campo for r in informe.faltantes] == ["referencias[1].nombre"]


def test_la_fila_ve_el_contexto_del_expediente_y_el_suyo_propio():
    """`documento` depende de `tipo_documento`: la fila puede traer el suyo."""
    informe = validar(
        {},
        exigir_ausentes=False,
        colecciones={
            "codeudores": [
                {"tipo_documento": "Cédula de extranjería", "documento": "123456"},
                {"tipo_documento": "Cédula de extranjería", "documento": "1234567890"},
            ]
        },
    )

    invalidos = {r.campo for r in informe.invalidos}
    assert invalidos == {"codeudores[1].documento"}


def test_los_campos_solo_de_coleccion_no_se_exigen_en_el_payload_principal():
    informe = validar({}, exigir_ausentes=True)

    faltantes = {r.campo for r in informe.faltantes}
    assert "entidad" not in faltantes
    assert "nombre" not in faltantes


# ---------------------------------------------------------------------------
# Informe agregado
# ---------------------------------------------------------------------------
def test_el_informe_separa_cada_estado_y_publica_su_version():
    informe = validar(
        {
            "nombres_apellidos": "Laura Gómez Restrepo",
            "telefono": "no-tengo",
            "ingresos_mensuales_fijos": MAX_RAZONABLE_INGRESO + 1,
            "email": "",
        },
        exigir_ausentes=False,
    )

    assert [r.campo for r in informe.invalidos] == ["telefono"]
    assert [r.campo for r in informe.advertencias] == ["ingresos_mensuales_fijos"]
    assert [r.campo for r in informe.faltantes] == ["email"]
    assert informe.valido is False
    assert informe.version_motor.startswith("validacion-")


def test_los_normalizados_solo_traen_lo_utilizable():
    informe = validar(
        {"telefono": "+57 311 458 9922", "email": "sin-arroba", "personas_a_cargo": "2"},
        exigir_ausentes=False,
    )

    normalizados = informe.normalizados()
    assert normalizados["telefono"] == "3114589922"
    assert normalizados["personas_a_cargo"] == 2
    assert "email" not in normalizados


def test_un_campo_sin_especificacion_no_bloquea_el_expediente():
    resultado = validar_campo("campo_que_no_existe_todavia", "cualquier cosa")

    assert resultado.estado == VALIDO
    assert resultado.codigo == "SIN_ESPECIFICACION"
