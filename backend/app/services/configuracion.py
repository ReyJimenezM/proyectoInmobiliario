"""Acceso a la parametría operativa almacenada en configuraciones_operativas.

Los defaults viven en código; la base de datos solo guarda lo que el tenant cambió.
La lectura siempre parte del default y le aplica el override guardado (si existe).
"""
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.configuracion_operativa import ConfiguracionOperativa

# Tenant por defecto (creado en la migración 0003); se usa cuando no hay tenant explícito.
DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

CLAVE_PARAMETRIZACION = "parametrizacion"
CLAVE_REQUISITOS = "requisitos"
PREFIJO_CATALOGO = "catalogo:"

# --- Defaults de parametrización operativa (SLA en horas por prioridad) ---
PARAMETRIZACION_DEFAULTS: dict[str, Any] = {
    "sla": {"critica": 24, "alta": 48, "media": 72, "baja": 120},
    "auto_asignacion": True,
    "notificaciones": True,
    "revision_manual_obligatoria": False,
    "motivos_rechazo": [
        "Capacidad de pago insuficiente",
        "Endeudamiento alto",
        "Ingresos no verificables",
        "Inconsistencia documental",
        "Historial desfavorable",
        "Alerta antifraude",
        "Documentación incompleta o vencida",
    ],
}

# --- Defaults de requisitos documentales (portados del prototipo habitat-risk) ---
_PERFILES_REQUISITOS: dict[str, list[dict]] = {
    "Empleado": [
        {
            "id": "cert_lab", "nombre": "Certificación laboral", "obligatorio": True,
            "para": "Confirmar tu vinculación, cargo, salario y tiempo en la empresa.",
            "contiene": "Expedida por Recursos Humanos con fecha de los últimos 30 días, cargo, tipo de contrato, salario y fecha de ingreso.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "Carta en papel membreteado con firma y datos de contacto de quien la expide.",
            "sin_validar": "Si no logramos verificarla con la empresa, te pediremos un soporte adicional como los desprendibles de pago.",
        },
        {
            "id": "despr", "nombre": "Desprendibles de pago (últimos 3)", "obligatorio": True,
            "para": "Ver cuánto recibes realmente cada mes y con qué frecuencia.",
            "contiene": "Los tres últimos comprobantes de nómina completos, con descuentos y valor neto.",
            "formato": "PDF, JPG o PNG · hasta 10 MB",
            "ejemplo": "Si te pagan quincenal, adjunta los seis últimos comprobantes.",
            "sin_validar": "Si los valores no coinciden con lo que registraste, un analista te contactará antes de decidir.",
        },
        {
            "id": "extractos", "nombre": "Extractos bancarios (últimos 3 meses)", "obligatorio": True,
            "para": "Confirmar que los ingresos llegan a tu cuenta de forma constante.",
            "contiene": "Extractos completos de la cuenta donde recibes tu salario, con tu nombre visible.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "Puedes descargarlos desde la app de tu banco.",
            "sin_validar": "Si la cuenta está a nombre de otra persona no podremos usarla como soporte.",
        },
    ],
    "Independiente": [
        {
            "id": "rut", "nombre": "RUT actualizado", "obligatorio": True,
            "para": "Verificar tu actividad económica registrada ante la DIAN.",
            "contiene": "RUT con fecha de generación reciente y la actividad económica visible.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "Se descarga gratis desde el portal de la DIAN.",
            "sin_validar": "Si la actividad registrada no coincide con la declarada, te pediremos una aclaración.",
        },
        {
            "id": "extractos", "nombre": "Extractos bancarios (últimos 6 meses)", "obligatorio": True,
            "para": "Entender el promedio real de tus ingresos, que suelen variar mes a mes.",
            "contiene": "Seis meses de movimientos de la cuenta donde recibes los pagos de tus clientes.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "Si usas varias cuentas, adjunta la principal y menciónalo en observaciones.",
            "sin_validar": "Sin extractos solo podemos reconocer una parte de tus ingresos.",
        },
        {
            "id": "ccio", "nombre": "Cámara de Comercio", "obligatorio": False,
            "para": "Confirmar la existencia y antigüedad de tu negocio, si estás registrado.",
            "contiene": "Certificado con menos de 90 días de expedición.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "Aplica solo si tienes establecimiento o sociedad registrada.",
            "sin_validar": "No es obligatorio: si no aplica a tu caso puedes continuar.",
        },
        {
            "id": "renta", "nombre": "Declaración de renta", "obligatorio": False,
            "para": "Respaldar tus ingresos anuales cuando son variables.",
            "contiene": "Última declaración presentada, con sello o acuse de la DIAN.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "Si no estás obligado a declarar, puedes omitirla.",
            "sin_validar": "No es obligatoria; suma puntos a favor cuando la aportas.",
        },
    ],
    "Empresario": [
        {
            "id": "ccio", "nombre": "Cámara de Comercio", "obligatorio": True,
            "para": "Confirmar la existencia, antigüedad y representación legal de tu empresa.",
            "contiene": "Certificado de existencia y representación con menos de 90 días.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "Se solicita en la Cámara de Comercio de tu ciudad.",
            "sin_validar": "Sin este documento no podemos verificar la empresa.",
        },
        {
            "id": "estados", "nombre": "Estados financieros", "obligatorio": True,
            "para": "Ver la utilidad real del negocio, no solo las ventas.",
            "contiene": "Balance y estado de resultados del último año, firmados por contador con su tarjeta profesional.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "Deben incluir nombre, firma y número de tarjeta del contador.",
            "sin_validar": "Si no están firmados, un analista los revisará manualmente.",
        },
        {
            "id": "extractos", "nombre": "Extractos bancarios (últimos 6 meses)", "obligatorio": True,
            "para": "Confirmar el movimiento real del negocio.",
            "contiene": "Extractos de la cuenta empresarial o personal donde recibes los ingresos.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "Deben corresponder a la persona o empresa que solicita.",
            "sin_validar": "Si la cuenta es de un tercero, no podremos tomarla como soporte.",
        },
    ],
    "Pensionado": [
        {
            "id": "cert_pen", "nombre": "Certificado o resolución de pensión", "obligatorio": True,
            "para": "Confirmar el valor de tu mesada y la entidad que la paga.",
            "contiene": "Resolución de reconocimiento o certificado reciente de la entidad pagadora.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "Colpensiones y los fondos privados lo generan en línea.",
            "sin_validar": "Si no está legible te pediremos volver a cargarlo.",
        },
        {
            "id": "despr_pen", "nombre": "Desprendibles de pensión (últimos 3)", "obligatorio": True,
            "para": "Ver el valor que efectivamente recibes después de descuentos.",
            "contiene": "Los tres últimos comprobantes de pago de mesada.",
            "formato": "PDF, JPG o PNG · hasta 10 MB",
            "ejemplo": "Descárgalos desde el portal de tu fondo o entidad.",
            "sin_validar": "Sin ellos usaremos solo el valor certificado.",
        },
        {
            "id": "extractos", "nombre": "Extractos bancarios (últimos 3 meses)", "obligatorio": False,
            "para": "Confirmar que la mesada llega a tu cuenta.",
            "contiene": "Extractos de la cuenta donde recibes la pensión.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "",
            "sin_validar": "No es obligatorio.",
        },
    ],
    "Contratista": [
        {
            "id": "contrato", "nombre": "Contrato de prestación de servicios", "obligatorio": True,
            "para": "Conocer la duración, el valor y con quién tienes el contrato.",
            "contiene": "Contrato vigente firmado, con valor mensual y fecha de terminación.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "Si tienes varios contratos, adjunta el principal.",
            "sin_validar": "Si está vencido te pediremos el vigente o su prórroga.",
        },
        {
            "id": "rut", "nombre": "RUT actualizado", "obligatorio": True,
            "para": "Verificar tu actividad económica ante la DIAN.",
            "contiene": "RUT reciente con la actividad visible.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "",
            "sin_validar": "Te pediremos aclaración si la actividad no coincide.",
        },
        {
            "id": "extractos", "nombre": "Extractos bancarios (últimos 6 meses)", "obligatorio": True,
            "para": "Confirmar la constancia de los pagos que recibes.",
            "contiene": "Seis meses de movimientos de tu cuenta principal.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "",
            "sin_validar": "Sin extractos reconocemos una parte menor de tus ingresos.",
        },
    ],
    "Estudiante": [
        {
            "id": "cert_est", "nombre": "Certificado de estudios", "obligatorio": True,
            "para": "Confirmar que estás matriculado y en qué programa.",
            "contiene": "Certificado del semestre en curso expedido por la institución.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "",
            "sin_validar": "Te pediremos uno actualizado.",
        },
        {
            "id": "sop_cod", "nombre": "Documento y soportes del codeudor", "obligatorio": True,
            "para": "Tu codeudor respalda el pago del arriendo, por eso necesitamos verificar sus ingresos.",
            "contiene": "Cédula del codeudor y sus soportes de ingresos (certificación laboral o extractos).",
            "formato": "PDF, JPG o PNG · hasta 10 MB",
            "ejemplo": "",
            "sin_validar": "Sin el codeudor no podemos continuar con este perfil.",
        },
    ],
}

REQUISITOS_DEFAULTS: dict[str, Any] = {
    "base": [
        {
            "id": "doc_id", "nombre": "Documento de identidad (ambas caras)", "obligatorio": True,
            "para": "Confirmar que eres tú quien está solicitando el inmueble y evitar suplantaciones.",
            "contiene": "Cédula de ciudadanía, cédula de extranjería o PPT, por ambas caras, legible y sin recortes.",
            "formato": "PDF, JPG o PNG · hasta 10 MB",
            "ejemplo": "Ambas caras en un solo archivo o dos archivos separados.",
            "sin_validar": "Si la imagen no es legible te pediremos volver a cargarla; tu solicitud queda en espera mientras tanto.",
        },
        {
            "id": "ctl", "nombre": "Certificado de tradición y libertad (si aplica)", "obligatorio": False,
            "para": "Confirmar quién es el propietario registrado y si el inmueble tiene limitaciones.",
            "contiene": "Certificado con menos de 30 días de expedición, del folio de matrícula del inmueble.",
            "formato": "PDF · hasta 10 MB",
            "ejemplo": "Se descarga en la Superintendencia de Notariado y Registro.",
            "sin_validar": "Aplica para operaciones de compra; sin él no podemos verificar la titularidad.",
        },
    ],
    "perfiles": _PERFILES_REQUISITOS,
    "reglas": [
        {
            "id": f"RQ-{i + 1:02d}",
            "condicion": "situacion_laboral",
            "valor": perfil,
            "docs": [d["id"] for d in docs],
            "activa": True,
            "autor": "Sistema",
            "fecha": "2026-06-01",
        }
        for i, (perfil, docs) in enumerate(_PERFILES_REQUISITOS.items())
    ],
}


def _default_para(clave: str) -> Any:
    from app.catalogos import CATALOGOS_OPERATIVOS_DEFAULTS

    if clave == CLAVE_PARAMETRIZACION:
        return PARAMETRIZACION_DEFAULTS
    if clave == CLAVE_REQUISITOS:
        return REQUISITOS_DEFAULTS
    if clave.startswith(PREFIJO_CATALOGO):
        return CATALOGOS_OPERATIVOS_DEFAULTS.get(clave[len(PREFIJO_CATALOGO):])
    return None


def _copia(valor: Any) -> Any:
    import copy

    return copy.deepcopy(valor)


def leer_override(db: Session, tenant_id: uuid.UUID | None, clave: str) -> ConfiguracionOperativa | None:
    query = select(ConfiguracionOperativa).where(ConfiguracionOperativa.clave == clave)
    if tenant_id is None:
        query = query.where(ConfiguracionOperativa.inmobiliaria_id.is_(None))
    else:
        query = query.where(ConfiguracionOperativa.inmobiliaria_id == tenant_id)
    return db.execute(query).scalar_one_or_none()


def leer_config(db: Session, tenant_id: uuid.UUID | None, clave: str) -> Any:
    """Default en código + override del tenant (si existe). Para dicts hace merge de
    primer nivel; para listas el override reemplaza por completo."""
    base = _copia(_default_para(clave))
    fila = leer_override(db, tenant_id, clave)
    if fila is None:
        return base
    # Overrides de catálogo se guardan envueltos como {"valores": [...]} (la columna es JSONB dict).
    if isinstance(fila.valor, dict) and set(fila.valor.keys()) == {"valores"}:
        return _copia(fila.valor["valores"])
    if isinstance(base, dict) and isinstance(fila.valor, dict):
        base.update(_copia(fila.valor))
        return base
    return _copia(fila.valor)


def guardar_config(
    db: Session,
    tenant_id: uuid.UUID | None,
    clave: str,
    valor: Any,
    actor_id: uuid.UUID | None,
) -> ConfiguracionOperativa:
    fila = leer_override(db, tenant_id, clave)
    if fila is None:
        fila = ConfiguracionOperativa(id=uuid.uuid4(), inmobiliaria_id=tenant_id, clave=clave, valor=valor)
        db.add(fila)
    else:
        fila.valor = valor
    fila.actualizado_por = actor_id
    return fila
