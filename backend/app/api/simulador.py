import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.enums import Vertical
from app.models.simulacion import Simulacion
from app.schemas.simulador import (
    SimuladorArriendoIn,
    SimuladorArriendoOut,
    SimuladorCompraIn,
    SimuladorCompraOut,
)
from app.services.calculo_financiero import (
    cuota_mensual_amortizacion_francesa,
    semaforo_arriendo,
    semaforo_compra,
)

router = APIRouter(prefix="/api/simulador", tags=["simulador"])


@router.post("/compra", response_model=SimuladorCompraOut)
def simular_compra(payload: SimuladorCompraIn, db: Session = Depends(get_db)) -> SimuladorCompraOut:
    tasa_ea = payload.tasa_ea if payload.tasa_ea is not None else Decimal(str(settings.tasa_referencial_ea_default))

    monto_a_financiar = payload.precio - payload.cuota_inicial
    cuota_mensual = cuota_mensual_amortizacion_francesa(monto_a_financiar, tasa_ea, payload.plazo_anios)
    ingresos_totales = payload.ingresos_mensuales + payload.ingresos_mensuales_2
    relacion = (cuota_mensual / ingresos_totales) if ingresos_totales > 0 else Decimal("1")
    semaforo, mensaje = semaforo_compra(relacion)

    simulacion = Simulacion(
        id=uuid.uuid4(),
        propiedad_id=payload.propiedad_id,
        vertical=Vertical.compra,
        inputs=_decimal_safe(payload.model_dump()),
        resultado=_decimal_safe({
            "monto_a_financiar": monto_a_financiar,
            "cuota_mensual_estimada": cuota_mensual,
            "relacion_cuota_ingreso": relacion,
            "tasa_ea_usada": tasa_ea,
            "semaforo": semaforo,
        }),
    )
    db.add(simulacion)
    db.commit()

    return SimuladorCompraOut(
        simulacion_id=simulacion.id,
        monto_a_financiar=monto_a_financiar,
        cuota_mensual_estimada=cuota_mensual,
        ingresos_totales=ingresos_totales,
        relacion_cuota_ingreso=relacion.quantize(Decimal("0.0001")),
        tasa_ea_usada=tasa_ea,
        plazo_anios=payload.plazo_anios,
        semaforo=semaforo,
        mensaje=mensaje,
    )


@router.post("/arriendo", response_model=SimuladorArriendoOut)
def simular_arriendo(payload: SimuladorArriendoIn, db: Session = Depends(get_db)) -> SimuladorArriendoOut:
    relacion = payload.canon_mensual / payload.ingresos_mensuales
    semaforo, mensaje = semaforo_arriendo(relacion)

    simulacion = Simulacion(
        id=uuid.uuid4(),
        propiedad_id=payload.propiedad_id,
        vertical=Vertical.arriendo,
        inputs=_decimal_safe(payload.model_dump()),
        resultado=_decimal_safe({"relacion_canon_ingreso": relacion, "semaforo": semaforo}),
    )
    db.add(simulacion)
    db.commit()

    return SimuladorArriendoOut(
        simulacion_id=simulacion.id,
        relacion_canon_ingreso=relacion.quantize(Decimal("0.0001")),
        semaforo=semaforo,
        mensaje=mensaje,
    )


def _decimal_safe(data: dict) -> dict:
    """JSONB no serializa Decimal/UUID directamente; los normaliza a tipos JSON nativos."""
    result = {}
    for key, value in data.items():
        if isinstance(value, Decimal):
            result[key] = float(value)
        elif isinstance(value, uuid.UUID):
            result[key] = str(value)
        else:
            result[key] = value
    return result
