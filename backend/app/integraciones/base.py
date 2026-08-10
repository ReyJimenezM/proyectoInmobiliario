"""Interfaces de los proveedores externos.

Regla de arquitectura: el dominio importa **la interfaz**, nunca una implementación
concreta. Cambiar de central de riesgo o de proveedor de firma debe ser cambiar una
línea de configuración, no reescribir el flujo de una solicitud.

Hoy solo existen implementaciones nulas (ver ``app/integraciones/nulos.py``): la
arquitectura queda lista sin fingir integraciones que no están contratadas.

Toda llamada real deberá, en este orden:

1. verificar que existe un ``Consentimiento`` vigente para esa finalidad
   (``requiere_consentimiento`` de cada proveedor);
2. registrar un ``EventoProveedorExterno`` con los metadatos de la llamada
   (proveedor, operación, éxito, código, latencia y consentimiento);
3. devolver un objeto de dominio, nunca el JSON crudo del tercero.

Y nunca deberá persistir la respuesta completa de un proveedor de datos personales:
eso sería crear una segunda base de datos personales sin finalidad ni caducidad.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

#: Códigos de respuesta normalizados. Se guardan en ``eventos_proveedor_externo``.
CODIGO_OK = "OK"
CODIGO_NO_CONFIGURADO = "NO_CONFIGURADO"
CODIGO_ERROR = "ERROR"
CODIGO_SIN_CONSENTIMIENTO = "SIN_CONSENTIMIENTO"


@dataclass
class RespuestaProveedor:
    """Resultado normalizado de una llamada a un tercero.

    ``datos`` lleva solo lo que el dominio necesita, ya interpretado. No es el
    volcado de la respuesta del proveedor.
    """

    exito: bool
    datos: dict[str, Any] = field(default_factory=dict)
    codigo: str = CODIGO_OK
    mensaje: str = ""
    latencia_ms: int | None = None

    @property
    def disponible(self) -> bool:
        """True solo si la información llegó y es utilizable para decidir."""
        return self.exito and self.codigo == CODIGO_OK


class Proveedor(ABC):
    """Base de todo proveedor externo."""

    #: Identificador estable; es lo que se guarda en ``eventos_proveedor_externo.proveedor``.
    nombre: str = "proveedor"
    #: Para qué sirve, en español claro (se expone en GET /api/admin/proveedores).
    descripcion: str = ""
    #: Tipo de consentimiento exigido antes de llamar (None si no maneja datos personales).
    requiere_consentimiento: str | None = None

    @abstractmethod
    def esta_configurado(self) -> bool:
        """¿Hay credenciales y contrato para usar este proveedor en este entorno?"""

    def _no_configurado(self, operacion: str) -> RespuestaProveedor:
        """Respuesta fallida explícita.

        Un proveedor no contratado falla de forma visible: nunca se disfraza de éxito
        ni devuelve datos simulados. Decidir sobre datos inventados es peor que no
        decidir.
        """
        return RespuestaProveedor(
            exito=False,
            codigo=CODIGO_NO_CONFIGURADO,
            mensaje=(
                f"El proveedor '{self.nombre}' no está configurado en este entorno; "
                f"la operación '{operacion}' no se ejecutó."
            ),
        )


class ProveedorCentralRiesgo(Proveedor):
    """Central de riesgo: obligaciones vigentes, hábito de pago y score externo."""

    nombre = "central_riesgo"
    descripcion = "Consulta el reporte crediticio y el hábito de pago del solicitante."
    requiere_consentimiento = "CONSULTA_CENTRALES"

    @abstractmethod
    def consultar_reporte(
        self, *, tipo_documento: str, numero_documento: str, consentimiento_id: str
    ) -> RespuestaProveedor: ...


class ProveedorIdentidad(Proveedor):
    """Validación documental, biometría facial y prueba de vida."""

    nombre = "identidad"
    descripcion = "Verifica que la persona es quien dice ser (documento y biometría)."
    requiere_consentimiento = "VERIFICACION_IDENTIDAD"

    @abstractmethod
    def verificar(
        self, *, referencia_documento: str, referencia_selfie: str, consentimiento_id: str
    ) -> RespuestaProveedor: ...


class ProveedorDatosFinancieros(Proveedor):
    """Open banking: confirma los ingresos efectivamente consignados."""

    nombre = "datos_financieros"
    descripcion = "Confirma ingresos reales en cuenta, en vez de creerle al formulario."
    requiere_consentimiento = "DATOS_BANCARIOS"

    @abstractmethod
    def consultar_ingresos(self, *, consentimiento_id: str, meses: int = 6) -> RespuestaProveedor: ...


class ProveedorFirmaElectronica(Proveedor):
    """Firma electrónica de contratos y anexos, con estampa de tiempo."""

    nombre = "firma_electronica"
    descripcion = "Envía a firma el contrato y sus anexos, con estampa cronológica."
    requiere_consentimiento = None

    @abstractmethod
    def solicitar_firma(
        self, *, referencia_documento: str, firmantes: list[dict]
    ) -> RespuestaProveedor: ...


class ProveedorRegistral(Proveedor):
    """Consulta registral del folio de matrícula: titularidad y gravámenes."""

    nombre = "registral"
    descripcion = "Consulta el certificado de tradición y libertad del inmueble."
    requiere_consentimiento = None

    @abstractmethod
    def consultar_tradicion(self, *, matricula: str) -> RespuestaProveedor: ...


class ProveedorOcr(Proveedor):
    """Extracción de campos de un documento ya cargado en el expediente."""

    nombre = "ocr"
    descripcion = "Extrae los campos de un documento cargado para contrastarlos con lo declarado."
    requiere_consentimiento = "TRATAMIENTO_DATOS"

    @abstractmethod
    def extraer(self, *, ruta_almacenamiento: str, tipo_documento: str) -> RespuestaProveedor: ...
