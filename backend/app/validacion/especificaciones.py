"""Registro central de campos: tipo, formato, rango, dependencias, fuente y confiabilidad.

Esta es la respuesta a «campo obligatorio ≠ dato válido». Cada campo del wizard
(datos personales, laborales, financieros, garantías y referencias) declara aquí
cómo se valida; añadir uno nuevo no exige tocar ningún router.

Los nombres coinciden con los de `app/schemas/solicitud.py`, que es lo que el
portal envía y lo que queda guardado en la solicitud.
"""
from __future__ import annotations

from app.validacion.colombia import (
    EDAD_MAXIMA,
    EDAD_MINIMA,
    EDAD_MINIMA_LABORAL,
    MAX_RAZONABLE_ACTIVO,
    MAX_RAZONABLE_ARRIENDO,
    MAX_RAZONABLE_GASTO,
    MAX_RAZONABLE_INGRESO,
    MAX_RAZONABLE_SALDO,
)
from app.validacion.motor import EspecificacionCampo as Esp
from app.validacion.motor import MotorValidacion

PATRON_NOMBRE = r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]+"

TIPOS_DOCUMENTO = [
    "Cédula de ciudadanía", "Cédula de extranjería", "Pasaporte",
    "Permiso por Protección Temporal", "PEP", "NIT",
]
TIPOS_OCUPACION = ["indefinido", "termino_fijo", "independiente", "pensionado", "otro"]
NIVELES_MORA = ["ninguna", "leve", "grave"]

ESPECIFICACIONES: dict[str, EspecificacionCampo] = {
    # -----------------------------------------------------------------
    # Paso 1 · Datos personales
    # -----------------------------------------------------------------
    "nombres_apellidos": Esp(
        "nombres_apellidos", "Nombres y apellidos", "texto", obligatorio=True,
        min_long=5, max_long=120, patron=PATRON_NOMBRE, confiabilidad="alta",
    ),
    "tipo_documento": Esp(
        "tipo_documento", "Tipo de documento", "seleccion", obligatorio=True,
        opciones=TIPOS_DOCUMENTO,
    ),
    "numero_documento": Esp(
        "numero_documento", "Número de documento", "numero_documento", obligatorio=True,
        depende_de="tipo_documento", confiabilidad="alta",
    ),
    "fecha_nacimiento": Esp(
        "fecha_nacimiento", "Fecha de nacimiento", "fecha", obligatorio=True,
        sin_futuro=True, edad_minima=EDAD_MINIMA, edad_maxima=EDAD_MAXIMA, confiabilidad="alta",
    ),
    "estado_civil": Esp(
        # Se captura por completitud de identidad legal; el motor de decisión NUNCA la lee.
        "estado_civil", "Estado civil", "texto", obligatorio=True, min_long=3, max_long=40,
    ),
    "personas_a_cargo": Esp(
        "personas_a_cargo", "Personas a cargo", "entero", min_valor=0, max_valor=20,
    ),
    "telefono": Esp("telefono", "Teléfono de contacto", "telefono", obligatorio=True),
    "email": Esp("email", "Correo electrónico", "email", obligatorio=True, max_long=160),
    "direccion_residencia": Esp(
        "direccion_residencia", "Dirección de residencia", "texto", obligatorio=True,
        min_long=5, max_long=200,
    ),
    "ciudad_residencia": Esp(
        "ciudad_residencia", "Ciudad de residencia", "texto", obligatorio=True,
        min_long=3, max_long=80,
    ),
    "cod_departamento_residencia": Esp(
        "cod_departamento_residencia", "Departamento de residencia", "divipola",
        fuente="CATALOGO", confiabilidad="alta",
    ),
    "cod_municipio_residencia": Esp(
        "cod_municipio_residencia", "Municipio de residencia", "divipola",
        depende_de="cod_departamento_residencia", fuente="CATALOGO", confiabilidad="alta",
    ),
    "tiempo_residencia": Esp(
        "tiempo_residencia", "Tiempo en la residencia actual", "texto", max_long=60,
    ),
    "es_propietario": Esp("es_propietario", "¿Es propietario de vivienda?", "booleano"),

    # -----------------------------------------------------------------
    # Paso 2 · Información laboral
    # -----------------------------------------------------------------
    "tipo_ocupacion": Esp(
        "tipo_ocupacion", "Tipo de ocupación", "seleccion", obligatorio=True,
        opciones=TIPOS_OCUPACION,
    ),
    "empresa": Esp("empresa", "Empresa donde trabaja", "texto", min_long=2, max_long=160),
    "nit_empleador": Esp("nit_empleador", "NIT del empleador", "nit", confiabilidad="alta"),
    "cargo": Esp("cargo", "Cargo", "texto", min_long=2, max_long=80),
    "fecha_ingreso_laboral": Esp(
        "fecha_ingreso_laboral", "Fecha de ingreso al trabajo actual", "fecha",
        sin_futuro=True, posterior_a="fecha_nacimiento",
        edad_minima_en_fecha=EDAD_MINIMA_LABORAL, confiabilidad="alta",
    ),
    "antiguedad_cargo_meses": Esp(
        "antiguedad_cargo_meses", "Antigüedad en el cargo (meses)", "entero",
        min_valor=0, max_valor=720, calculado=True, derivado_de="fecha_ingreso_laboral",
        fuente="MOTOR",
    ),
    "antiguedad_laboral_anios": Esp(
        "antiguedad_laboral_anios", "Antigüedad laboral (años)", "entero",
        min_valor=0, max_valor=60, calculado=True, derivado_de="fecha_ingreso_laboral",
        fuente="MOTOR",
    ),
    "telefono_verificacion": Esp(
        "telefono_verificacion", "Teléfono de verificación laboral", "telefono",
    ),
    "actividad_economica": Esp(
        "actividad_economica", "Actividad económica", "texto", min_long=3, max_long=160,
    ),
    "codigo_ciiu": Esp(
        "codigo_ciiu", "Actividad económica (código CIIU)", "ciiu",
        fuente="CATALOGO", confiabilidad="alta",
    ),
    "sector": Esp("sector", "Sector económico", "texto", max_long=80),
    "antiguedad_negocio_meses": Esp(
        "antiguedad_negocio_meses", "Antigüedad del negocio (meses)", "entero",
        min_valor=0, max_valor=720,
    ),

    # -----------------------------------------------------------------
    # Paso 3 · Información financiera
    # -----------------------------------------------------------------
    "ingresos_mensuales_fijos": Esp(
        "ingresos_mensuales_fijos", "Ingresos mensuales fijos", "moneda", obligatorio=True,
        min_valor=1, max_razonable=MAX_RAZONABLE_INGRESO,
    ),
    "ingresos_variables": Esp(
        "ingresos_variables", "Ingresos variables", "moneda",
        min_valor=0, max_razonable=MAX_RAZONABLE_INGRESO,
    ),
    "ingresos_otros": Esp(
        "ingresos_otros", "Otros ingresos", "moneda",
        min_valor=0, max_razonable=MAX_RAZONABLE_INGRESO,
    ),
    "descripcion_ingresos_variables": Esp(
        "descripcion_ingresos_variables", "Descripción de los ingresos variables", "texto",
        max_long=300,
    ),
    "deducciones_nomina": Esp(
        "deducciones_nomina", "Deducciones de nómina", "moneda",
        min_valor=0, max_razonable=MAX_RAZONABLE_GASTO,
    ),
    "ingreso_no_verificable": Esp(
        "ingreso_no_verificable", "Ingreso sin soporte documental", "moneda",
        min_valor=0, max_razonable=MAX_RAZONABLE_INGRESO, confiabilidad="baja",
    ),
    "gastos_mensuales_fijos": Esp(
        "gastos_mensuales_fijos", "Gastos mensuales fijos", "moneda",
        min_valor=0, max_razonable=MAX_RAZONABLE_GASTO,
    ),
    "tiene_otros_creditos": Esp(
        "tiene_otros_creditos", "¿Tiene otras obligaciones financieras?", "booleano",
    ),
    "tiene_ahorros": Esp("tiene_ahorros", "¿Tiene ahorros?", "booleano"),
    "monto_ahorros": Esp(
        "monto_ahorros", "Monto de ahorros", "moneda",
        min_valor=0, max_razonable=MAX_RAZONABLE_SALDO,
    ),
    "autorizacion_centrales_riesgo": Esp(
        "autorizacion_centrales_riesgo", "Autorización de consulta en centrales de riesgo",
        "booleano", obligatorio=True,
    ),

    # Filas de `otros_creditos` (colección) --------------------------------
    "entidad": Esp("entidad", "Entidad de la obligación", "texto", obligatorio=True,
                   min_long=2, max_long=120, solo_en_coleccion=True),
    "saldo_aproximado": Esp(
        "saldo_aproximado", "Saldo aproximado de la obligación", "moneda",
        min_valor=0, max_razonable=MAX_RAZONABLE_SALDO,
    ),
    "cuota_mensual": Esp(
        "cuota_mensual", "Cuota mensual de la obligación", "moneda",
        min_valor=0, max_razonable=MAX_RAZONABLE_GASTO,
    ),
    "en_mora": Esp("en_mora", "¿La obligación está en mora?", "booleano"),

    # Patrimonio (colecciones de montos sueltos) ---------------------------
    "valor_activo": Esp("valor_activo", "Valor del activo", "moneda",
                        min_valor=0, max_razonable=MAX_RAZONABLE_ACTIVO),
    "valor_pasivo": Esp("valor_pasivo", "Valor del pasivo", "moneda",
                        min_valor=0, max_razonable=MAX_RAZONABLE_ACTIVO),

    # -----------------------------------------------------------------
    # Paso 4 · Garantías y referencias
    # -----------------------------------------------------------------
    "tiene_codeudor": Esp("tiene_codeudor", "¿Tiene codeudor?", "booleano"),
    "tiene_poliza": Esp("tiene_poliza", "¿Cuenta con póliza de arrendamiento?", "booleano"),
    "ha_arrendado_antes": Esp("ha_arrendado_antes", "¿Ha arrendado antes?", "booleano"),
    "mora_en_arriendo_anterior": Esp(
        "mora_en_arriendo_anterior", "Mora en el arriendo anterior", "seleccion",
        opciones=NIVELES_MORA,
    ),
    "proceso_restitucion_previo": Esp(
        "proceso_restitucion_previo", "¿Tuvo un proceso de restitución?", "booleano",
    ),
    # Filas de codeudor y referencias (colecciones) ------------------------
    "nombre": Esp("nombre", "Nombre", "texto", obligatorio=True, min_long=3, max_long=120,
                  patron=PATRON_NOMBRE, solo_en_coleccion=True),
    "documento": Esp("documento", "Documento", "numero_documento", obligatorio=True,
                     depende_de="tipo_documento", solo_en_coleccion=True),
    "relacion": Esp("relacion", "Relación con el solicitante", "texto", max_long=60),
    "tiempo_arriendo": Esp("tiempo_arriendo", "Tiempo del arriendo anterior", "texto", max_long=60),
    "ingresos_declarados": Esp(
        "ingresos_declarados", "Ingresos declarados del codeudor", "moneda",
        min_valor=0, max_razonable=MAX_RAZONABLE_INGRESO,
    ),
    "cuotas_obligaciones": Esp(
        "cuotas_obligaciones", "Cuotas de obligaciones del codeudor", "moneda",
        min_valor=0, max_razonable=MAX_RAZONABLE_GASTO,
    ),

    # -----------------------------------------------------------------
    # Datos del negocio (backoffice)
    # -----------------------------------------------------------------
    "canon_mensual": Esp(
        "canon_mensual", "Canon mensual", "moneda", min_valor=1,
        max_razonable=MAX_RAZONABLE_ARRIENDO, fuente="BACKOFFICE", confiabilidad="alta",
    ),
    "valor_administracion": Esp(
        "valor_administracion", "Valor de administración", "moneda", min_valor=0,
        max_razonable=10_000_000, fuente="BACKOFFICE", confiabilidad="alta",
    ),
    "fecha_inicio_arriendo": Esp(
        "fecha_inicio_arriendo", "Fecha de inicio del arriendo", "fecha", sin_pasado=True,
    ),
    "fecha_documento": Esp("fecha_documento", "Fecha del documento", "fecha", sin_futuro=True),
    "participacion_societaria": Esp(
        "participacion_societaria", "Participación societaria", "porcentaje",
        min_valor=0, max_valor=100,
    ),
}

# Alias de tipo para no reexportar el nombre corto `Esp` fuera del módulo.
EspecificacionCampo = Esp

motor = MotorValidacion(ESPECIFICACIONES)


def validar(
    payload: dict,
    ctx: dict | None = None,
    colecciones: dict | None = None,
    exigir_ausentes: bool = True,
):
    return motor.validar(payload, ctx, colecciones, exigir_ausentes)


def validar_campo(nombre: str, valor, ctx: dict | None = None):
    return motor.validar_campo(nombre, valor, ctx)
