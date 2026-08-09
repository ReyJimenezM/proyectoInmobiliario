import enum


class RolUsuario(str, enum.Enum):
    solicitante = "solicitante"
    analista = "analista"
    admin = "admin"
    # Roles ampliados (Fase 2 · inspirados en Habitat Risk):
    # super_admin: nivel plataforma, gestiona el catalogo de inmobiliarias (tenants).
    # asesor: rol comercial de una inmobiliaria, ve solicitudes pero no decide.
    # consulta: solo lectura (reportes/auditoria) dentro de una inmobiliaria.
    super_admin = "super_admin"
    asesor = "asesor"
    consulta = "consulta"


ROLES_STAFF = (RolUsuario.super_admin, RolUsuario.admin, RolUsuario.analista, RolUsuario.asesor, RolUsuario.consulta)


class TipoPropiedad(str, enum.Enum):
    apartamento = "apartamento"
    casa = "casa"
    apartaestudio = "apartaestudio"
    oficina = "oficina"
    local = "local"
    lote = "lote"
    bodega = "bodega"


class OperacionPropiedad(str, enum.Enum):
    venta = "venta"
    arriendo = "arriendo"


class EstadoPropiedad(str, enum.Enum):
    activo = "activo"
    pausado = "pausado"
    arrendado = "arrendado"
    vendido = "vendido"


class TipoAnunciante(str, enum.Enum):
    particular = "particular"
    inmobiliaria = "inmobiliaria"
    constructora = "constructora"


class Vertical(str, enum.Enum):
    compra = "compra"
    arriendo = "arriendo"


class EstadoSolicitud(str, enum.Enum):
    borrador = "borrador"
    enviada = "enviada"
    en_evaluacion = "en_evaluacion"
    revision_manual = "revision_manual"
    aprobada = "aprobada"
    rechazada = "rechazada"
    con_ruta_alterna = "con_ruta_alterna"


class EstadoDocumento(str, enum.Enum):
    cargado = "cargado"
    pendiente = "pendiente"
    rechazado = "rechazado"


class DecisionEvaluacion(str, enum.Enum):
    aprobada = "aprobada"
    revision_manual = "revision_manual"
    rechazada = "rechazada"


class DecisionManual(str, enum.Enum):
    aprobada = "aprobada"
    rechazada = "rechazada"
    solicitar_info = "solicitar_info"
