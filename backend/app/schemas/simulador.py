import uuid
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class SimuladorCompraIn(BaseModel):
    propiedad_id: uuid.UUID | None = None
    precio: Decimal = Field(gt=0)
    cuota_inicial: Decimal = Field(ge=0, description="Valor absoluto de la cuota inicial")
    ingresos_mensuales: Decimal = Field(gt=0)
    ingresos_mensuales_2: Decimal = Field(default=Decimal(0), ge=0, description="Segundo solicitante, ingresos compartidos")
    plazo_anios: Literal[10, 15, 20] = 15
    tasa_ea: Decimal | None = Field(default=None, description="Tasa efectiva anual; si se omite usa la referencial del sistema")


class SimuladorCompraOut(BaseModel):
    simulacion_id: uuid.UUID
    monto_a_financiar: Decimal
    cuota_mensual_estimada: Decimal
    ingresos_totales: Decimal
    relacion_cuota_ingreso: Decimal
    tasa_ea_usada: Decimal
    plazo_anios: int
    semaforo: Literal["verde", "amarillo", "rojo"]
    mensaje: str


class SimuladorArriendoIn(BaseModel):
    propiedad_id: uuid.UUID | None = None
    canon_mensual: Decimal = Field(gt=0)
    ingresos_mensuales: Decimal = Field(gt=0)
    tipo_ingreso: Literal["empleado", "independiente"]
    tiene_codeudor: bool = False


class SimuladorArriendoOut(BaseModel):
    simulacion_id: uuid.UUID
    relacion_canon_ingreso: Decimal
    semaforo: Literal["verde", "amarillo", "rojo"]
    mensaje: str
