"""Integraciones con proveedores externos.

El dominio importa desde aquí (o desde ``base``) las **interfaces**; las
implementaciones concretas se resuelven en ``obtener_proveedor`` a partir de la
configuración. Ningún módulo de negocio debe importar una clase concreta.
"""
from app.integraciones.base import (
    CODIGO_ERROR,
    CODIGO_NO_CONFIGURADO,
    CODIGO_OK,
    CODIGO_SIN_CONSENTIMIENTO,
    Proveedor,
    ProveedorCentralRiesgo,
    ProveedorDatosFinancieros,
    ProveedorFirmaElectronica,
    ProveedorIdentidad,
    ProveedorOcr,
    ProveedorRegistral,
    RespuestaProveedor,
)
from app.integraciones.nulos import estado_proveedores, obtener_proveedor, tipos_proveedor

__all__ = [
    "RespuestaProveedor",
    "Proveedor",
    "ProveedorCentralRiesgo",
    "ProveedorIdentidad",
    "ProveedorDatosFinancieros",
    "ProveedorFirmaElectronica",
    "ProveedorRegistral",
    "ProveedorOcr",
    "CODIGO_OK",
    "CODIGO_NO_CONFIGURADO",
    "CODIGO_ERROR",
    "CODIGO_SIN_CONSENTIMIENTO",
    "obtener_proveedor",
    "estado_proveedores",
    "tipos_proveedor",
]
