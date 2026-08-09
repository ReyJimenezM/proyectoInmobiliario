"""Estructuras del motor de decision robusto (Fase 2). Portado fielmente del motor
declarativo de Habitat Risk: reglas versionadas grupo/variable/operador/valor/puntos,
tipo escala (la primera que cumple fija el puntaje base del grupo, por prioridad) o
ajuste (suma/resta sobre esa base). El score global es la media ponderada de los
grupos, escalada a 0-1000. Funcion pura: sin DB, sin reloj, sin red."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ReglaMotor:
    id: str
    grupo: str
    tipo: str  # "escala" | "ajuste"
    prioridad: int
    variable: str
    operador: str  # ">=", "<=", ">", "<", "=", "!="
    valor: float
    puntos: float
    nombre: str
    descripcion: str
    activa: bool = True


@dataclass(frozen=True)
class ParametrosMotor:
    factor_variable: float = 0.60
    factor_otros: float = 0.50
    cobertura_minima: float = 2.0
    umbral_preaprobado: float = 780
    umbral_requisitos: float = 680
    umbral_estudio: float = 560
    fraude_rechazo: float = 25
    fraude_revision: float = 62
    verificabilidad_minima: float = 60


@dataclass(frozen=True)
class VersionMotor:
    version: str
    fecha: str
    autor: str
    notas: str
    estado: str  # "Vigente" | "Archivada"
    num_reglas: int


@dataclass(frozen=True)
class MotorDecision:
    version: str
    vigente_desde: str
    autor: str
    pesos: dict[str, float]  # grupo -> peso (capacidad, estabilidad, endeudamiento, verificabilidad, historial, fraude)
    parametros: ParametrosMotor
    reglas: list[ReglaMotor]
    historial_versiones: list[VersionMotor] = field(default_factory=list)


# --- Entrada (datos crudos de la solicitud de arriendo) ---


@dataclass(frozen=True)
class Ingresos:
    fijo: float = 0
    variable: float = 0
    otros: float = 0
    deducciones: float = 0
    no_verificable: float = 0


@dataclass(frozen=True)
class CostoInmueble:
    canon: float = 0
    administracion: float = 0
    servicios: float = 0
    otros: float = 0


@dataclass(frozen=True)
class Obligacion:
    cuota: float = 0
    saldo: float = 0
    en_mora: bool = False


@dataclass(frozen=True)
class Codeudor:
    ingreso_fijo: float = 0
    ingreso_variable: float = 0
    obligaciones: float = 0


@dataclass(frozen=True)
class Patrimonio:
    activos: list[float] = field(default_factory=list)
    pasivos: list[float] = field(default_factory=list)


@dataclass(frozen=True)
class Documento:
    requerido: bool
    estado: str = "pendiente"  # "pendiente" | "cargado" | "aprobado" | "rechazado"


@dataclass(frozen=True)
class Laboral:
    antiguedad_meses: int = 0
    contrato_indefinido: bool = False
    contrato_corto: bool = False  # prestacion de servicios / contratista
    ingreso_pensional: bool = False


@dataclass(frozen=True)
class Historial:
    # 3 = arrendo antes sin mora, 2 = sin historial previo (neutral), 1 = mora leve,
    # 0 = mora relevante o proceso de restitucion
    codigo: int = 2


@dataclass(frozen=True)
class EntradaRiesgoArrendatario:
    ingresos: Ingresos
    inmueble: CostoInmueble
    laboral: Laboral
    obligaciones: list[Obligacion] = field(default_factory=list)
    gastos: dict[str, float] = field(default_factory=dict)
    historial: Historial = field(default_factory=Historial)
    documentos: list[Documento] = field(default_factory=list)
    alertas: list[str] = field(default_factory=list)  # "identidad" | "ingresos" | otras
    codeudor: Codeudor | None = None
    patrimonio: Patrimonio = field(default_factory=Patrimonio)


# --- Resultado ---


@dataclass(frozen=True)
class ReglaActivada:
    regla: ReglaMotor
    valor_actual: float


@dataclass(frozen=True)
class SubscoreGrupo:
    grupo: str
    puntaje: int
    nivel: str


@dataclass(frozen=True)
class ResultadoMotor:
    score: int
    subscores: dict[str, int]
    niveles: dict[str, str]
    reglas_activadas: list[ReglaActivada]
    decision: str  # PREAPROBADA | REQUISITOS | ESTUDIO | RECHAZADA
    motivo: str
    requiere_codeudor: bool
    positivos: list[ReglaActivada]
    negativos: list[ReglaActivada]
    faltantes: list[str]
    variables_derivadas: dict[str, float]
    version: str
