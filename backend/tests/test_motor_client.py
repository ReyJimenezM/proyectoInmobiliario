import types
import uuid

from app.models.enums import Vertical
from app.services import motor_client


class _DbFalso:
    def __init__(self):
        self.agregados = []

    def add(self, obj):
        self.agregados.append(obj)


def _politica_credito_falsa():
    return types.SimpleNamespace(
        id=uuid.uuid4(),
        vertical=Vertical.compra,
        variables=[
            {
                "nombre": "capacidad", "peso": 0.40,
                "bandas": [
                    {"etiqueta": "alta", "puntaje": 100, "condicion": {"ratio_max": 0.30}},
                    {"etiqueta": "cero", "puntaje": 0, "condicion": {}},
                ],
            },
            {
                "nombre": "condiciones", "peso": 0.20,
                "bandas": [
                    {"etiqueta": "alta", "puntaje": 100, "condicion": {"tipo_ocupacion_in": ["indefinido"], "antiguedad_meses_min": 12}},
                    {"etiqueta": "baja", "puntaje": 20, "condicion": {}},
                ],
            },
            {
                "nombre": "caracter", "peso": 0.25,
                "bandas": [
                    {"etiqueta": "alta", "puntaje": 100, "condicion": {"referencias_verificadas_min": 2}},
                    {"etiqueta": "baja", "puntaje": 10, "condicion": {}},
                ],
            },
            {
                "nombre": "garantia", "peso": 0.10,
                "bandas": [
                    {"etiqueta": "alta", "puntaje": 100, "condicion": {"codeudor_ingresos_min": 1000000}},
                    {"etiqueta": "baja", "puntaje": 0, "condicion": {}},
                ],
            },
            {
                "nombre": "capital", "peso": 0.05,
                "bandas": [
                    {"etiqueta": "alta", "puntaje": 100, "condicion": {"monto_ahorros_min": 5000000}},
                    {"etiqueta": "baja", "puntaje": 0, "condicion": {}},
                ],
            },
        ],
        bandas_decision={"aprobado_min": 70, "revision_min": 45, "revision_max": 69},
    )


def _solicitud_falsa(**overrides):
    base = dict(
        id=uuid.uuid4(),
        vertical=Vertical.compra,
        datos_personales={"estado_civil": "Casado(a)", "genero": "no deberia importar"},
        datos_laborales={"tipo_ocupacion": "indefinido", "antiguedad_cargo_meses": 24},
        datos_financieros={
            "ingresos_mensuales_fijos": 6_000_000, "ingresos_variables": 0,
            "cuota_o_canon_estimado": 1_500_000, "tiene_ahorros": True, "monto_ahorros": 6_000_000,
        },
        garantias_referencias={
            "tiene_codeudor": True, "tiene_poliza": False,
            "codeudor": {"ingresos_declarados": 3_000_000},
            "referencia_laboral": {"verificada": True}, "referencia_personal": {"verificada": True},
        },
    )
    base.update(overrides)
    return types.SimpleNamespace(**base)


def test_solicitud_a_entrada_evaluacion_tolera_decimales_serializados_como_string():
    # Pydantic model_dump(mode="json") serializa Decimal como string (no como float),
    # asi que el JSONB real guarda "3000000", no 3000000. Sin float() en motor_client
    # esto rompe con TypeError al comparar str < int dentro del motor.
    solicitud = _solicitud_falsa(
        datos_financieros={
            "ingresos_mensuales_fijos": "6000000", "ingresos_variables": "0",
            "cuota_o_canon_estimado": "1500000", "tiene_ahorros": True, "monto_ahorros": "6000000",
        },
        garantias_referencias={
            "tiene_codeudor": True, "tiene_poliza": False,
            "codeudor": {"ingresos_declarados": "3000000"},
            "referencia_laboral": {"verificada": True}, "referencia_personal": {"verificada": True},
        },
    )

    entrada = motor_client._solicitud_a_entrada_evaluacion(solicitud)

    assert entrada.garantia.codeudor_ingresos == 3_000_000.0
    assert isinstance(entrada.garantia.codeudor_ingresos, float)
    assert entrada.capital.monto_ahorros == 6_000_000.0


def test_evaluar_solicitud_no_truena_con_decimales_serializados_como_string():
    db = _DbFalso()
    solicitud = _solicitud_falsa(
        datos_financieros={
            "ingresos_mensuales_fijos": "6000000", "ingresos_variables": "0",
            "cuota_o_canon_estimado": "1500000", "tiene_ahorros": True, "monto_ahorros": "6000000",
        },
        garantias_referencias={
            "tiene_codeudor": True, "tiene_poliza": False,
            "codeudor": {"ingresos_declarados": "3000000"},
            "referencia_laboral": {"verificada": True}, "referencia_personal": {"verificada": True},
        },
    )
    politica = _politica_credito_falsa()

    evaluacion = motor_client.evaluar_solicitud(db, solicitud, politica)

    assert evaluacion.decision.value == "aprobada"


def test_politica_credito_a_dataclass_mapea_variables_y_bandas():
    politica_dc = motor_client._politica_credito_a_dataclass(_politica_credito_falsa())

    assert politica_dc.vertical == "compra"
    assert len(politica_dc.variables) == 5
    assert politica_dc.bandas_decision.aprobado_min == 70


def test_solicitud_a_entrada_evaluacion_nunca_lee_datos_personales():
    entrada = motor_client._solicitud_a_entrada_evaluacion(_solicitud_falsa())

    # estado_civil y genero viven en datos_personales pero no tienen slot en EntradaEvaluacion
    assert not hasattr(entrada, "estado_civil")
    assert not hasattr(entrada, "genero")
    assert entrada.capacidad.ingresos_mensuales == 6_000_000
    assert entrada.condiciones.tipo_ocupacion == "indefinido"
    assert entrada.garantia.codeudor_ingresos == 3_000_000


def test_solicitud_sin_codeudor_no_falla_aunque_el_campo_venga_como_null():
    # Cuando tiene_codeudor=False, el frontend no envia el campo "codeudor" y Pydantic lo
    # guarda como null explicito en el JSONB (no lo omite) -- gr.get("codeudor", {}) NO
    # cae al default en ese caso porque la clave SI existe, solo que vale None.
    solicitud = _solicitud_falsa(
        garantias_referencias={
            "tiene_codeudor": False, "tiene_poliza": False, "codeudor": None,
            "referencia_laboral": {"verificada": True}, "referencia_personal": {"verificada": True},
        }
    )

    entrada = motor_client._solicitud_a_entrada_evaluacion(solicitud)

    assert entrada.garantia.tiene_codeudor is False
    assert entrada.garantia.codeudor_ingresos is None


def test_evaluar_solicitud_persiste_evaluacion_con_score_alto_para_perfil_optimo():
    db = _DbFalso()
    solicitud = _solicitud_falsa()
    politica = _politica_credito_falsa()

    evaluacion = motor_client.evaluar_solicitud(db, solicitud, politica)

    assert evaluacion in db.agregados
    assert float(evaluacion.score) == 100.0
    assert evaluacion.decision.value == "aprobada"
