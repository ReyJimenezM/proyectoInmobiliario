import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import EstadoSolicitud, Vertical


class SolicitudCrearIn(BaseModel):
    propiedad_id: uuid.UUID
    vertical: Vertical


class ContactoReferenciaIn(BaseModel):
    nombre: str
    relacion: str | None = None
    telefono: str


# --- Paso 1: datos personales ---
class DatosPersonalesIn(BaseModel):
    nombres_apellidos: str
    tipo_documento: Literal["Cédula de ciudadanía", "Cédula de extranjería", "Pasaporte"]
    numero_documento: str
    fecha_nacimiento: date
    estado_civil: str  # se captura por completitud de identidad legal; el motor NUNCA la lee
    personas_a_cargo: int = Field(ge=0)
    telefono: str
    email: EmailStr
    direccion_residencia: str
    ciudad_residencia: str
    tiempo_residencia: str
    es_propietario: bool

    @field_validator("fecha_nacimiento")
    @classmethod
    def validar_mayoria_edad(cls, valor: date) -> date:
        edad = (date.today() - valor).days // 365
        if edad < 18:
            raise ValueError("El solicitante debe ser mayor de edad")
        return valor


# --- Paso 2: información laboral ---
class DatosLaboralesIn(BaseModel):
    tipo_ocupacion: Literal["indefinido", "termino_fijo", "independiente", "pensionado", "otro"]
    empresa: str | None = None
    cargo: str | None = None
    antiguedad_cargo_meses: int = Field(ge=0, default=0)
    antiguedad_laboral_anios: int = Field(ge=0, default=0)
    telefono_verificacion: str | None = None
    actividad_economica: str | None = None
    sector: str | None = None
    antiguedad_negocio_meses: int | None = None


# --- Paso 3: información financiera ---
class CreditoActivoIn(BaseModel):
    entidad: str
    saldo_aproximado: Decimal
    cuota_mensual: Decimal
    en_mora: bool = False


class DatosFinancierosIn(BaseModel):
    ingresos_mensuales_fijos: Decimal = Field(gt=0)
    ingresos_variables: Decimal = Field(default=Decimal(0), ge=0)
    ingresos_otros: Decimal = Field(default=Decimal(0), ge=0, description="Arriendos, rentas, honorarios ocasionales")
    descripcion_ingresos_variables: str | None = None
    deducciones_nomina: Decimal = Field(default=Decimal(0), ge=0, description="Salud, pensión, retenciones, libranzas")
    ingreso_no_verificable: Decimal = Field(
        default=Decimal(0), ge=0, description="De los ingresos declarados, cuánto no se puede soportar con documentos"
    )
    gastos_mensuales_fijos: Decimal = Field(default=Decimal(0), ge=0)
    tiene_otros_creditos: bool = False
    otros_creditos: list[CreditoActivoIn] = []
    tiene_ahorros: bool = False
    monto_ahorros: Decimal | None = None
    patrimonio_activos: list[Decimal] = Field(default=[], description="Valor de cada activo (opcional)")
    patrimonio_pasivos: list[Decimal] = Field(default=[], description="Valor de cada pasivo (opcional)")
    autorizacion_centrales_riesgo: bool

    @field_validator("autorizacion_centrales_riesgo")
    @classmethod
    def requiere_autorizacion(cls, valor: bool) -> bool:
        if not valor:
            raise ValueError("La autorización de consulta en centrales de riesgo es obligatoria")
        return valor


# --- Paso 4: garantías y referencias ---
class CodeudorIn(BaseModel):
    nombre: str
    documento: str
    telefono: str
    ingresos_declarados: Decimal
    ingresos_variables: Decimal = Field(default=Decimal(0), ge=0)
    cuotas_obligaciones: Decimal = Field(default=Decimal(0), ge=0)


class DatosArrendadorAnteriorIn(BaseModel):
    nombre: str
    telefono: str
    tiempo_arriendo: str


class GarantiasReferenciasIn(BaseModel):
    tiene_codeudor: bool = False
    codeudor: CodeudorIn | None = None
    tiene_poliza: bool = False
    referencia_laboral: ContactoReferenciaIn
    referencia_personal: ContactoReferenciaIn
    referencia_arrendador: DatosArrendadorAnteriorIn | None = None
    # Historial de arrendamiento -- alimenta directamente historialCodigo del motor
    # robusto: 3=positivo sin mora, 2=sin historial previo (neutral), 1=mora leve,
    # 0=mora relevante o proceso de restitucion.
    ha_arrendado_antes: bool = False
    mora_en_arriendo_anterior: Literal["ninguna", "leve", "grave"] = "ninguna"
    proceso_restitucion_previo: bool = False


# --- Paso 6: envío final ---
class EnviarSolicitudIn(BaseModel):
    acepta_politica_datos: bool

    @field_validator("acepta_politica_datos")
    @classmethod
    def requiere_aceptacion(cls, valor: bool) -> bool:
        if not valor:
            raise ValueError("Debes aceptar la política de tratamiento de datos para continuar")
        return valor


class DocumentoOut(BaseModel):
    id: uuid.UUID
    tipo_documento: str
    estado: str
    cargado_en: datetime

    class Config:
        from_attributes = True


class VariableEvaluadaOut(BaseModel):
    nombre: str
    peso: float
    valor_calculado: float | str | None
    banda: str
    puntaje_obtenido: float
    puntaje_ponderado: float


class ResultadoSolicitudOut(BaseModel):
    estado: EstadoSolicitud
    score: float | None = None
    escala_maxima: int = 100  # 1000 para arriendo (motor robusto), 100 para compra (motor 5C)
    decision: str | None = None
    explicacion: str | None = None
    variables_evaluadas: list[VariableEvaluadaOut] = []
    ruta_alterna_disponible: bool = False
    ruta_alterna_sugerencias: list[str] = []


class SolicitudOut(BaseModel):
    id: uuid.UUID
    propiedad_id: uuid.UUID
    vertical: Vertical
    estado: EstadoSolicitud
    datos_personales: dict
    datos_laborales: dict
    datos_financieros: dict
    garantias_referencias: dict
    creado_en: datetime
    actualizado_en: datetime

    class Config:
        from_attributes = True
