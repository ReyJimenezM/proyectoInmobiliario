"""Checklist dinamico de documentos requeridos segun el tipo de ocupacion (Parte D.1, Paso 5)."""
from app.models.enums import Vertical


def documentos_requeridos(datos_laborales: dict, garantias_referencias: dict, vertical: str) -> list[str]:
    requeridos = ["cedula_ciudadania"]

    tipo_ocupacion = datos_laborales.get("tipo_ocupacion")
    if tipo_ocupacion in ("indefinido", "termino_fijo"):
        requeridos.append("desprendibles_pago_o_certificacion_laboral")
    elif tipo_ocupacion == "independiente":
        requeridos += ["extractos_bancarios_3_meses", "rut", "declaracion_renta"]
    elif tipo_ocupacion == "pensionado":
        requeridos.append("certificado_pension_vigente")

    if garantias_referencias.get("tiene_codeudor"):
        requeridos += ["cedula_codeudor", "soporte_ingresos_codeudor"]

    if vertical == Vertical.compra.value:
        requeridos.append("certificado_tradicion_libertad")

    return requeridos
