"""Validación declarativa de datos.

- `motor`: recorre las especificaciones y devuelve un resultado por campo.
- `especificaciones`: el registro de campos del wizard (fuente de verdad).
- `colombia`: reglas locales (NIT, teléfonos, moneda, documentos, DIVIPOLA, CIIU).
- `consistencia`: comprobaciones entre datos, registradas con `@comprobacion`.
"""
from app.validacion.consistencia import (
    COMPROBACIONES,
    META_HALLAZGO,
    EntradaConsistencia,
    Hallazgo,
    comprobacion,
    ejecutar,
)
from app.validacion.especificaciones import (
    ESPECIFICACIONES,
    motor,
    validar,
    validar_campo,
)
from app.validacion.motor import (
    ADVERTENCIA,
    CONTRADICTORIO,
    ESTADOS,
    FALTANTE,
    INVALIDO,
    SIN_VERIFICAR,
    VALIDO,
    EspecificacionCampo,
    InformeValidacion,
    MotorValidacion,
    ResultadoCampo,
)

__all__ = [
    "ADVERTENCIA",
    "COMPROBACIONES",
    "CONTRADICTORIO",
    "ESPECIFICACIONES",
    "ESTADOS",
    "EntradaConsistencia",
    "EspecificacionCampo",
    "FALTANTE",
    "Hallazgo",
    "INVALIDO",
    "InformeValidacion",
    "META_HALLAZGO",
    "MotorValidacion",
    "ResultadoCampo",
    "SIN_VERIFICAR",
    "VALIDO",
    "comprobacion",
    "ejecutar",
    "motor",
    "validar",
    "validar_campo",
]
