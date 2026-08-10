"""Motor de consistencia — capa 2 (app/validacion/consistencia.py).

Compara los datos entre sí. La regla de oro del módulo: **una inconsistencia no
es una acusación de fraude**. Los datos que no cuadran se aclaran; solo se escala
cuando hay indicios de suplantación o de documento ajeno.
"""
from __future__ import annotations

from datetime import date

import pytest

from app.validacion.consistencia import (
    COMPROBACIONES,
    META_HALLAZGO,
    EntradaConsistencia,
    ejecutar,
)

TIPOS_DE_FRAUDE = {"ALERTA_FRAUDE", "FRAUDE_CONFIRMADO"}


def _por_codigo(hallazgos, codigo):
    return next((h for h in hallazgos if h.codigo_comprobacion == codigo), None)


# ---------------------------------------------------------------------------
# Ingresos declarados vs. certificados
# ---------------------------------------------------------------------------
def test_una_diferencia_superior_al_25_por_ciento_es_inconsistencia():
    entrada = EntradaConsistencia(ingreso_declarado=10_000_000, ingreso_certificado=6_000_000)

    hallazgo = _por_codigo(ejecutar(entrada), "INGRESO_VS_CERTIFICADO")

    assert hallazgo.tipo == "INCONSISTENCIA"
    assert hallazgo.severidad == 3
    assert "40 %" in hallazgo.detalle


def test_una_diferencia_entre_10_y_25_por_ciento_es_valor_inusual():
    entrada = EntradaConsistencia(ingreso_declarado=10_000_000, ingreso_certificado=8_500_000)

    hallazgo = _por_codigo(ejecutar(entrada), "INGRESO_VS_CERTIFICADO")

    assert hallazgo.tipo == "VALOR_INUSUAL"
    assert hallazgo.severidad == 1


def test_una_diferencia_menor_al_10_por_ciento_no_genera_hallazgo():
    entrada = EntradaConsistencia(ingreso_declarado=10_000_000, ingreso_certificado=9_500_000)

    assert _por_codigo(ejecutar(entrada), "INGRESO_VS_CERTIFICADO") is None


def test_un_desajuste_de_ingresos_no_es_una_acusacion_de_fraude():
    """El solicitante que redondea su sueldo no es un defraudador."""
    entrada = EntradaConsistencia(ingreso_declarado=10_000_000, ingreso_certificado=4_000_000)

    hallazgos = ejecutar(entrada)

    assert any(h.codigo_comprobacion == "INGRESO_VS_CERTIFICADO" for h in hallazgos)
    assert not any(h.tipo in TIPOS_DE_FRAUDE for h in hallazgos)


def test_un_ingreso_sin_contraste_documental_queda_sin_verificar():
    entrada = EntradaConsistencia(ingreso_declarado=8_000_000)

    hallazgo = _por_codigo(ejecutar(entrada), "INGRESO_SIN_SOPORTE")

    assert hallazgo.tipo == "SIN_VERIFICAR"
    assert hallazgo.tipo not in TIPOS_DE_FRAUDE


# ---------------------------------------------------------------------------
# Capacidad de pago
# ---------------------------------------------------------------------------
def test_los_gastos_y_deudas_que_superan_el_ingreso_son_inconsistencia():
    entrada = EntradaConsistencia(
        ingreso_declarado=5_000_000,
        ingreso_certificado=5_000_000,
        gastos_totales=3_500_000,
        cuotas_obligaciones=2_500_000,
    )

    hallazgo = _por_codigo(ejecutar(entrada), "GASTOS_SUPERAN_INGRESO")

    assert hallazgo.tipo == "INCONSISTENCIA"
    assert hallazgo.valores["compromisos"] == "$6.000.000"


def test_un_desfase_de_diez_veces_se_lee_como_error_de_digitacion():
    """Casi siempre son ceros de más: pedir aclaración, no cerrar el expediente."""
    entrada = EntradaConsistencia(
        ingreso_declarado=5_000_000,
        ingreso_certificado=5_000_000,
        gastos_totales=60_000_000,
    )

    hallazgo = _por_codigo(ejecutar(entrada), "GASTOS_SUPERAN_INGRESO")

    assert hallazgo.tipo == "ERROR_DIGITACION"
    assert hallazgo.severidad == 1
    assert hallazgo.accion_sugerida == "Confirmar el valor con el solicitante."


def test_un_endeudamiento_sobre_el_60_por_ciento_es_inconsistencia():
    entrada = EntradaConsistencia(
        ingreso_declarado=10_000_000,
        ingreso_certificado=10_000_000,
        cuotas_obligaciones=7_000_000,
    )

    hallazgo = _por_codigo(ejecutar(entrada), "ENDEUDAMIENTO_ALTO")

    assert hallazgo.tipo == "INCONSISTENCIA"
    assert hallazgo.valores["porcentaje"] == 70


def test_un_endeudamiento_justo_por_debajo_del_60_no_dispara():
    entrada = EntradaConsistencia(
        ingreso_declarado=10_000_000,
        ingreso_certificado=10_000_000,
        cuotas_obligaciones=5_900_000,
    )

    assert _por_codigo(ejecutar(entrada), "ENDEUDAMIENTO_ALTO") is None


def test_el_arriendo_que_supera_el_flujo_disponible_es_inconsistencia():
    entrada = EntradaConsistencia(
        ingreso_declarado=4_000_000,
        ingreso_certificado=4_000_000,
        costo_vivienda=3_000_000,
        disponible_despues_vivienda=-800_000,
    )

    hallazgo = _por_codigo(ejecutar(entrada), "VIVIENDA_SUPERA_CAPACIDAD")

    assert hallazgo.tipo == "INCONSISTENCIA"
    assert hallazgo.valores["faltante"] == "$800.000"


def test_un_canon_de_mas_de_la_mitad_del_ingreso_tambien_se_senala():
    entrada = EntradaConsistencia(
        ingreso_declarado=4_000_000,
        ingreso_certificado=4_000_000,
        costo_vivienda=2_600_000,
        disponible_despues_vivienda=100_000,
    )

    hallazgo = _por_codigo(ejecutar(entrada), "VIVIENDA_SUPERA_CAPACIDAD")

    assert hallazgo.tipo == "INCONSISTENCIA"
    assert hallazgo.valores["porcentaje"] == 65


# ---------------------------------------------------------------------------
# Fraude: reservado para indicios de suplantación
# ---------------------------------------------------------------------------
def test_el_mismo_documento_en_dos_personas_es_alerta_de_fraude():
    entrada = EntradaConsistencia(documento_compartido_con="Andrés Villamil")

    hallazgo = _por_codigo(ejecutar(entrada), "DOCUMENTO_DUPLICADO")

    assert hallazgo.tipo == "ALERTA_FRAUDE"
    assert hallazgo.severidad == 4
    assert hallazgo.accion_sugerida == "Escalar a fraude; no comunicar decisión aún."
    assert hallazgo.valores["confirmado"] is False


def test_el_documento_duplicado_ya_confirmado_sube_a_fraude_confirmado():
    entrada = EntradaConsistencia(
        documento_compartido_con="Andrés Villamil", fraude_confirmado=True
    )

    hallazgo = _por_codigo(ejecutar(entrada), "DOCUMENTO_DUPLICADO")

    assert hallazgo.tipo == "FRAUDE_CONFIRMADO"
    assert hallazgo.severidad == 5


def test_un_correo_desechable_es_alerta_de_fraude():
    entrada = EntradaConsistencia(email="laura@mailinator.com")

    hallazgo = _por_codigo(ejecutar(entrada), "CORREO_DESECHABLE")

    assert hallazgo.tipo == "ALERTA_FRAUDE"


def test_un_correo_normal_no_levanta_nada():
    entrada = EntradaConsistencia(email="laura@correo.com")

    assert _por_codigo(ejecutar(entrada), "CORREO_DESECHABLE") is None


# ---------------------------------------------------------------------------
# Empleador
# ---------------------------------------------------------------------------
def test_un_nit_de_empleador_con_dv_equivocado_es_inconsistencia():
    entrada = EntradaConsistencia(nit_empleador="890903938-1")

    hallazgo = _por_codigo(ejecutar(entrada), "NIT_EMPLEADOR")

    assert hallazgo.tipo == "INCONSISTENCIA"
    assert hallazgo.valores == {"base": "890903938", "dv_informado": 1, "dv_esperado": 8}


def test_un_nit_de_empleador_con_formato_roto_es_inconsistencia():
    entrada = EntradaConsistencia(nit_empleador="ACME S.A.")

    hallazgo = _por_codigo(ejecutar(entrada), "NIT_EMPLEADOR")

    assert hallazgo.tipo == "INCONSISTENCIA"
    assert "900123456-8" in hallazgo.detalle


def test_un_nit_de_empleador_valido_no_levanta_nada():
    entrada = EntradaConsistencia(nit_empleador="890903938-8", situacion_laboral="indefinido")

    assert _por_codigo(ejecutar(entrada), "NIT_EMPLEADOR") is None


def test_un_empleado_sin_nit_de_empleador_queda_sin_verificar():
    entrada = EntradaConsistencia(situacion_laboral="indefinido")

    hallazgo = _por_codigo(ejecutar(entrada), "NIT_EMPLEADOR")

    assert hallazgo.tipo == "SIN_VERIFICAR"


def test_la_fecha_laboral_incoherente_con_la_de_nacimiento_es_inconsistencia():
    entrada = EntradaConsistencia(
        fecha_nacimiento=date(1990, 5, 20), fecha_ingreso_laboral=date(1998, 1, 10)
    )

    hallazgo = _por_codigo(ejecutar(entrada), "FECHA_LABORAL_VS_NACIMIENTO")

    assert hallazgo.tipo == "INCONSISTENCIA"
    assert "a los 7 años" in hallazgo.detalle


# ---------------------------------------------------------------------------
# Orden y contrato de salida
# ---------------------------------------------------------------------------
def test_los_hallazgos_salen_ordenados_por_severidad_descendente():
    entrada = EntradaConsistencia(
        ingreso_declarado=10_000_000,
        ingreso_certificado=4_000_000,          # INCONSISTENCIA (3)
        cuotas_obligaciones=8_000_000,          # INCONSISTENCIA (3)
        documentos_rechazados=["Certificación laboral"],  # DOCUMENTO_INSUFICIENTE (2)
        documento_compartido_con="Andrés Villamil",       # ALERTA_FRAUDE (4)
        activos_totales=10_000_000,
        pasivos_totales=50_000_000,             # VALOR_INUSUAL (1)
    )

    hallazgos = ejecutar(entrada)

    severidades = [h.severidad for h in hallazgos]
    assert severidades == sorted(severidades, reverse=True)
    assert hallazgos[0].tipo == "ALERTA_FRAUDE"
    assert hallazgos[-1].severidad == 1


def test_un_expediente_limpio_no_produce_hallazgos():
    entrada = EntradaConsistencia(
        ingreso_declarado=10_000_000,
        ingreso_certificado=10_000_000,
        gastos_totales=1_500_000,
        cuotas_obligaciones=800_000,
        costo_vivienda=3_000_000,
        disponible_despues_vivienda=4_700_000,
        nit_empleador="890903938-8",
        situacion_laboral="indefinido",
        email="laura@correo.com",
    )

    assert ejecutar(entrada) == []


def test_cada_hallazgo_se_serializa_con_su_severidad_y_su_accion():
    entrada = EntradaConsistencia(documento_compartido_con="Andrés Villamil")

    como_dict = ejecutar(entrada)[0].como_dict()

    assert set(como_dict) == {
        "codigo_comprobacion", "tipo", "severidad", "titulo", "detalle",
        "accion_sugerida", "valores",
    }


#: Un escenario mínimo que dispara cada comprobación registrada. Algunas se
#: excluyen entre sí (no se puede a la vez tener y no tener certificado de
#: ingresos), así que no cabe un único expediente "máximo".
ESCENARIOS: dict[str, EntradaConsistencia] = {
    "INGRESO_VS_CERTIFICADO": EntradaConsistencia(
        ingreso_declarado=10_000_000, ingreso_certificado=4_000_000
    ),
    "INGRESO_SIN_SOPORTE": EntradaConsistencia(ingreso_declarado=8_000_000),
    "INGRESO_VARIABLE_DESPROPORCIONADO": EntradaConsistencia(
        ingreso_fijo=1_000_000, ingreso_variable=9_000_000
    ),
    "GASTOS_SUPERAN_INGRESO": EntradaConsistencia(
        ingreso_declarado=5_000_000, gastos_totales=6_000_000
    ),
    "ENDEUDAMIENTO_ALTO": EntradaConsistencia(
        ingreso_declarado=10_000_000, cuotas_obligaciones=7_000_000
    ),
    "VIVIENDA_SUPERA_CAPACIDAD": EntradaConsistencia(
        costo_vivienda=3_000_000, disponible_despues_vivienda=-500_000
    ),
    "NIT_EMPLEADOR": EntradaConsistencia(nit_empleador="890903938-1"),
    "CIIU_VS_SITUACION": EntradaConsistencia(situacion_laboral="independiente"),
    "FECHA_LABORAL_VS_NACIMIENTO": EntradaConsistencia(
        fecha_nacimiento=date(1990, 5, 20), fecha_ingreso_laboral=date(1996, 1, 1)
    ),
    "DOCUMENTOS_RECHAZADOS": EntradaConsistencia(documentos_rechazados=["Cédula"]),
    "DOCUMENTOS_VENCIDOS": EntradaConsistencia(documentos_vencidos=["Certificación laboral"]),
    "DOCUMENTO_DUPLICADO": EntradaConsistencia(documento_compartido_con="Otra persona"),
    "TITULARIDAD_PROPIETARIO": EntradaConsistencia(
        titularidad_propietario="No acredita titularidad."
    ),
    "SITUACION_JURIDICA_INMUEBLE": EntradaConsistencia(
        situacion_juridica_inmueble="Certificado de tradición pendiente."
    ),
    "INGRESO_VS_OCUPACION": EntradaConsistencia(
        ingreso_declarado=400_000, situacion_laboral="indefinido"
    ),
    "PATRIMONIO_NETO_NEGATIVO": EntradaConsistencia(
        activos_totales=1_000_000, pasivos_totales=2_000_000
    ),
    "CORREO_DESECHABLE": EntradaConsistencia(email="laura@yopmail.com"),
}


@pytest.mark.parametrize("codigo,_fn", COMPROBACIONES)
def test_toda_comprobacion_registrada_dispara_y_usa_un_tipo_conocido(codigo, _fn):
    """El registro es extensible: si alguien añade una comprobación con un tipo sin
    metadatos, `severidad` reventaría en tiempo de ejecución. Y si la añade sin
    escenario, esta prueba obliga a documentarlo aquí."""
    assert codigo in ESCENARIOS, f"falta un escenario de prueba para {codigo}"

    hallazgo = _por_codigo(ejecutar(ESCENARIOS[codigo]), codigo)

    assert hallazgo is not None, f"la comprobación {codigo} no disparó"
    assert hallazgo.tipo in META_HALLAZGO
    assert hallazgo.titulo and hallazgo.detalle
