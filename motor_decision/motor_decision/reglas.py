"""Motor de reglas generico: evalua bandas definidas en la politica (datos versionados
en `politicas_credito.variables`, no hardcoded aqui, ver No Negociable #2) contra "hechos"
calculados a partir del payload de la solicitud.

Cada banda trae un diccionario `condicion` con claves de la forma `<hecho>_<operador>`:
  - `<hecho>_min`    -> hechos[hecho] >= valor
  - `<hecho>_max`    -> hechos[hecho] <= valor
  - `<hecho>_in`     -> hechos[hecho] in valor (lista)
  - `<hecho>_equals` -> hechos[hecho] == valor

Una condicion vacia `{}` siempre coincide (banda catch-all / por defecto, debe ir de
ultima en la lista de bandas de la politica).
"""
from __future__ import annotations

from motor_decision.schemas import (
    BandaVariable,
    Capacidad,
    Capital,
    Caracter,
    Condiciones,
    Garantia,
)


class BandaNoEncontradaError(Exception):
    pass


def _condicion_cumple(hechos: dict, condicion: dict) -> bool:
    if not condicion:
        return True
    for clave, valor_esperado in condicion.items():
        if clave.endswith("_min"):
            hecho = clave[: -len("_min")]
            if hechos.get(hecho) is None or hechos[hecho] < valor_esperado:
                return False
        elif clave.endswith("_max"):
            hecho = clave[: -len("_max")]
            if hechos.get(hecho) is None or hechos[hecho] > valor_esperado:
                return False
        elif clave.endswith("_in"):
            hecho = clave[: -len("_in")]
            if hechos.get(hecho) not in valor_esperado:
                return False
        elif clave.endswith("_equals"):
            hecho = clave[: -len("_equals")]
            if hechos.get(hecho) != valor_esperado:
                return False
        else:
            raise ValueError(f"Operador de condicion no soportado en clave: {clave}")
    return True


def evaluar_banda(hechos: dict, bandas: list[BandaVariable]) -> BandaVariable:
    for banda in bandas:
        if _condicion_cumple(hechos, banda.condicion):
            return banda
    raise BandaNoEncontradaError(
        f"Ninguna banda de la politica coincidio con los hechos {hechos}. "
        "La politica debe incluir una banda catch-all con condicion {}."
    )


def hechos_capacidad(capacidad: Capacidad) -> dict:
    if capacidad.ingresos_mensuales <= 0:
        ratio = float("inf")
    else:
        ratio = capacidad.cuota_o_canon / capacidad.ingresos_mensuales
    return {"ratio": round(ratio, 4)}


def hechos_condiciones(condiciones: Condiciones) -> dict:
    return {
        "tipo_ocupacion": condiciones.tipo_ocupacion,
        "antiguedad_meses": condiciones.antiguedad_meses,
    }


def hechos_caracter(caracter: Caracter) -> dict:
    referencias_verificadas = sum(
        1
        for verificada in (caracter.referencia_laboral_verificada, caracter.referencia_personal_verificada)
        if verificada is True
    )
    return {"referencias_verificadas": referencias_verificadas}


def hechos_garantia(garantia: Garantia) -> dict:
    return {
        "tiene_codeudor": garantia.tiene_codeudor,
        "tiene_poliza": garantia.tiene_poliza,
        "codeudor_ingresos": garantia.codeudor_ingresos or 0,
    }


def hechos_capital(capital: Capital) -> dict:
    return {"monto_ahorros": capital.monto_ahorros or 0 if capital.tiene_ahorros else 0}


EXTRACTORES_HECHOS = {
    "capacidad": hechos_capacidad,
    "condiciones": hechos_condiciones,
    "caracter": hechos_caracter,
    "garantia": hechos_garantia,
    "capital": hechos_capital,
}
