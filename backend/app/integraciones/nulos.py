"""Implementaciones nulas de los proveedores externos.

Una implementación nula declara con honestidad que no hay integración: responde
``esta_configurado() -> False`` y devuelve una respuesta fallida explícita.

**Nunca simula datos.** Un proveedor sin contratar que devolviera un score inventado
o un "identidad verificada" de mentira sería el peor error posible en un motor de
crédito: la decisión se vería igual de sólida, apoyada en nada. Que falle a la vista
es la característica, no la limitación.
"""
from __future__ import annotations

import os
from typing import Any

from app.integraciones.base import (
    Proveedor,
    ProveedorCentralRiesgo,
    ProveedorDatosFinancieros,
    ProveedorFirmaElectronica,
    ProveedorIdentidad,
    ProveedorOcr,
    ProveedorRegistral,
    RespuestaProveedor,
)


class CentralRiesgoNula(ProveedorCentralRiesgo):
    def esta_configurado(self) -> bool:
        return False

    def consultar_reporte(self, **kwargs: Any) -> RespuestaProveedor:
        return self._no_configurado("consultar_reporte")


class IdentidadNula(ProveedorIdentidad):
    def esta_configurado(self) -> bool:
        return False

    def verificar(self, **kwargs: Any) -> RespuestaProveedor:
        return self._no_configurado("verificar")


class DatosFinancierosNulo(ProveedorDatosFinancieros):
    def esta_configurado(self) -> bool:
        return False

    def consultar_ingresos(self, **kwargs: Any) -> RespuestaProveedor:
        return self._no_configurado("consultar_ingresos")


class FirmaElectronicaNula(ProveedorFirmaElectronica):
    def esta_configurado(self) -> bool:
        return False

    def solicitar_firma(self, **kwargs: Any) -> RespuestaProveedor:
        return self._no_configurado("solicitar_firma")


class RegistralNulo(ProveedorRegistral):
    def esta_configurado(self) -> bool:
        return False

    def consultar_tradicion(self, **kwargs: Any) -> RespuestaProveedor:
        return self._no_configurado("consultar_tradicion")


class OcrNulo(ProveedorOcr):
    def esta_configurado(self) -> bool:
        return False

    def extraer(self, **kwargs: Any) -> RespuestaProveedor:
        return self._no_configurado("extraer")


#: Implementación nula por tipo. Es el fallback permanente: si mañana se contrata un
#: proveedor real, se registra su clase aquí y el dominio no cambia una sola línea.
_NULOS: dict[str, Proveedor] = {
    "central_riesgo": CentralRiesgoNula(),
    "identidad": IdentidadNula(),
    "datos_financieros": DatosFinancierosNulo(),
    "firma_electronica": FirmaElectronicaNula(),
    "registral": RegistralNulo(),
    "ocr": OcrNulo(),
}

#: Variable de entorno que seleccionaría la implementación de cada tipo, p. ej.
#: ``PROVEEDOR_CENTRAL_RIESGO=datacredito``. Hoy cualquier valor distinto de "nulo"
#: no tiene implementación registrada y se cae al nulo, que falla visiblemente.
_VARIABLE_ENTORNO = {tipo: f"PROVEEDOR_{tipo.upper()}" for tipo in _NULOS}

#: Implementaciones reales disponibles, por tipo y nombre de implementación. Vacío a
#: propósito: ninguna integración está contratada todavía.
_IMPLEMENTACIONES: dict[str, dict[str, Proveedor]] = {tipo: {} for tipo in _NULOS}


def tipos_proveedor() -> list[str]:
    return list(_NULOS)


def obtener_proveedor(tipo: str) -> Proveedor:
    """Devuelve la implementación configurada para ``tipo``.

    Lee de configuración pensando en el futuro; hoy siempre termina en la nula,
    porque no hay ninguna integración contratada.
    """
    if tipo not in _NULOS:
        raise KeyError(f"Proveedor desconocido: {tipo}")
    seleccion = os.getenv(_VARIABLE_ENTORNO[tipo], "nulo").strip().lower()
    return _IMPLEMENTACIONES[tipo].get(seleccion) or _NULOS[tipo]


def estado_proveedores() -> list[dict]:
    """Estado de configuración de cada proveedor, para el tablero de administración."""
    estado = []
    for tipo in _NULOS:
        proveedor = obtener_proveedor(tipo)
        estado.append(
            {
                "tipo": tipo,
                "nombre": proveedor.nombre,
                "descripcion": proveedor.descripcion,
                "configurado": proveedor.esta_configurado(),
                "requiere_consentimiento": proveedor.requiere_consentimiento,
            }
        )
    return estado
