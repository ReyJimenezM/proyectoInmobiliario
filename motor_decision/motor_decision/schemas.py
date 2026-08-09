"""Estructuras de entrada/salida del motor de decision.

El dataclass EntradaEvaluacion define exhaustivamente los campos que el motor puede
leer. No existe forma de pasarle genero, estado_civil, orientacion sexual, religion,
afiliacion politica, estado de salud, etnia/nacionalidad, ni barrio/estrato: esos campos
sencillamente no tienen slot en esta estructura (No Negociable #3 aplicado a nivel de tipos,
no solo de convencion).
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Capacidad:
    cuota_o_canon: float
    ingresos_mensuales: float


@dataclass(frozen=True)
class Condiciones:
    tipo_ocupacion: str  # "indefinido" | "termino_fijo" | "independiente" | "pensionado" | "otro"
    antiguedad_meses: int


@dataclass(frozen=True)
class Caracter:
    referencia_laboral_verificada: bool | None
    referencia_personal_verificada: bool | None


@dataclass(frozen=True)
class Garantia:
    tiene_codeudor: bool
    tiene_poliza: bool
    codeudor_ingresos: float | None = None


@dataclass(frozen=True)
class Capital:
    tiene_ahorros: bool
    monto_ahorros: float | None = None


@dataclass(frozen=True)
class EntradaEvaluacion:
    solicitud_id: str
    vertical: str  # "compra" | "arriendo"
    capacidad: Capacidad
    condiciones: Condiciones
    caracter: Caracter
    garantia: Garantia
    capital: Capital


@dataclass(frozen=True)
class BandaVariable:
    etiqueta: str
    puntaje: float
    condicion: dict = field(default_factory=dict)


@dataclass(frozen=True)
class VariablePolitica:
    nombre: str
    peso: float
    bandas: list[BandaVariable]


@dataclass(frozen=True)
class BandasDecision:
    aprobado_min: float
    revision_min: float
    revision_max: float


@dataclass(frozen=True)
class Politica:
    politica_version_id: str
    vertical: str
    variables: list[VariablePolitica]
    bandas_decision: BandasDecision


@dataclass(frozen=True)
class VariableEvaluada:
    nombre: str
    peso: float
    valor_calculado: float | str | None
    banda: str
    puntaje_obtenido: float
    puntaje_ponderado: float


@dataclass(frozen=True)
class RutaAlterna:
    disponible: bool
    sugerencias: list[str]


@dataclass(frozen=True)
class ResultadoEvaluacion:
    score: float
    decision: str  # "aprobada" | "revision_manual" | "rechazada"
    variables_evaluadas: list[VariableEvaluada]
    explicacion_generada: str
    ruta_alterna: RutaAlterna | None
    politica_version_id: str
