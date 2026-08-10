"""Motor de consistencia — capa 2.

Compara los datos entre sí. Cada comprobación es una función registrada con
`@comprobacion(...)`: añadir una nueva no obliga a tocar nada más.

Clasificación de hallazgos. **Una inconsistencia no es un fraude**: los datos que
no cuadran se aclaran con el solicitante; solo se escala a fraude cuando hay
indicios de suplantación o de documento ajeno.

    ERROR_DIGITACION · VALOR_INUSUAL      severidad 1
    SIN_VERIFICAR · DOCUMENTO_INSUFICIENTE severidad 2
    INCONSISTENCIA                         severidad 3
    ALERTA_FRAUDE                          severidad 4
    FRAUDE_CONFIRMADO                      severidad 5
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Callable

from app.validacion.colombia import DOMINIOS_DESECHABLES, formato_cop, parsear_nit

# tipo -> (severidad, acción sugerida)
META_HALLAZGO: dict[str, tuple[int, str]] = {
    "ERROR_DIGITACION": (1, "Confirmar el valor con el solicitante."),
    "VALOR_INUSUAL": (1, "Confirmar el valor con el solicitante."),
    "SIN_VERIFICAR": (2, "Pedir el soporte que permita verificarla."),
    "DOCUMENTO_INSUFICIENTE": (2, "Solicitar nueva carga del documento."),
    "INCONSISTENCIA": (3, "Solicitar aclaración antes de decidir."),
    "ALERTA_FRAUDE": (4, "Escalar a fraude; no comunicar decisión aún."),
    "FRAUDE_CONFIRMADO": (5, "Rechazo y registro interno."),
}


@dataclass
class Hallazgo:
    codigo_comprobacion: str
    tipo: str
    titulo: str
    detalle: str
    valores: dict = field(default_factory=dict)

    @property
    def severidad(self) -> int:
        return META_HALLAZGO[self.tipo][0]

    @property
    def accion_sugerida(self) -> str:
        return META_HALLAZGO[self.tipo][1]

    def como_dict(self) -> dict:
        return {
            "codigo_comprobacion": self.codigo_comprobacion,
            "tipo": self.tipo,
            "severidad": self.severidad,
            "titulo": self.titulo,
            "detalle": self.detalle,
            "accion_sugerida": self.accion_sugerida,
            "valores": self.valores,
        }


@dataclass
class EntradaConsistencia:
    """Vista plana del expediente. El motor no conoce SQLAlchemy ni la base de datos."""

    ingreso_declarado: int = 0
    ingreso_certificado: int | None = None
    ingreso_bancarizado: int | None = None
    ingreso_fijo: int = 0
    ingreso_variable: int = 0
    gastos_totales: int = 0
    cuotas_obligaciones: int = 0
    costo_vivienda: int = 0
    disponible_despues_vivienda: int = 0
    nit_empleador: str | None = None
    situacion_laboral: str | None = None
    codigo_ciiu: str | None = None
    seccion_ciiu: str | None = None
    fecha_nacimiento: date | None = None
    fecha_ingreso_laboral: date | None = None
    documentos_rechazados: list[str] = field(default_factory=list)
    documentos_vencidos: list[str] = field(default_factory=list)
    documento_compartido_con: str | None = None
    fraude_confirmado: bool = False
    situacion_juridica_inmueble: str | None = None
    titularidad_propietario: str | None = None
    email: str | None = None
    activos_totales: int = 0
    pasivos_totales: int = 0


COMPROBACIONES: list[tuple[str, Callable[[EntradaConsistencia], Hallazgo | None]]] = []


def comprobacion(codigo: str):
    def envoltura(fn):
        COMPROBACIONES.append((codigo, fn))
        return fn

    return envoltura


# ---------------------------------------------------------------------------
# Ingresos
# ---------------------------------------------------------------------------
@comprobacion("INGRESO_VS_CERTIFICADO")
def _ingreso_vs_certificado(d: EntradaConsistencia) -> Hallazgo | None:
    if d.ingreso_certificado is None or d.ingreso_declarado <= 0:
        return None
    diferencia = abs(d.ingreso_declarado - d.ingreso_certificado) / d.ingreso_declarado
    valores = {
        "declarado": formato_cop(d.ingreso_declarado),
        "certificado": formato_cop(d.ingreso_certificado),
        "extractos": (
            formato_cop(d.ingreso_bancarizado) if d.ingreso_bancarizado is not None else "sin dato"
        ),
    }
    if diferencia > 0.25:
        return Hallazgo(
            "INGRESO_VS_CERTIFICADO", "INCONSISTENCIA",
            "El ingreso declarado no coincide con el certificado",
            f"El solicitante declaró {formato_cop(d.ingreso_declarado)} y el certificado laboral "
            f"respalda {formato_cop(d.ingreso_certificado)} "
            f"(diferencia del {round(diferencia * 100)} %).",
            valores,
        )
    if diferencia > 0.10:
        return Hallazgo(
            "INGRESO_VS_CERTIFICADO", "VALOR_INUSUAL",
            "Diferencia menor entre lo declarado y lo certificado",
            f"Diferencia del {round(diferencia * 100)} %, dentro de lo esperable por "
            "bonificaciones o ingresos variables.",
            valores,
        )
    return None


@comprobacion("INGRESO_SIN_SOPORTE")
def _ingreso_sin_soporte(d: EntradaConsistencia) -> Hallazgo | None:
    if d.ingreso_certificado is None and d.ingreso_bancarizado is None and d.ingreso_declarado > 0:
        return Hallazgo(
            "INGRESO_SIN_SOPORTE", "SIN_VERIFICAR",
            "Ingreso sin contraste documental",
            "Todavía no hay certificación laboral ni extractos aprobados que respalden el "
            f"ingreso declarado ({formato_cop(d.ingreso_declarado)}).",
            {"declarado": formato_cop(d.ingreso_declarado)},
        )
    return None


@comprobacion("INGRESO_VARIABLE_DESPROPORCIONADO")
def _variable_desproporcionado(d: EntradaConsistencia) -> Hallazgo | None:
    if d.ingreso_fijo > 0 and d.ingreso_variable > d.ingreso_fijo * 3:
        return Hallazgo(
            "INGRESO_VARIABLE_DESPROPORCIONADO", "VALOR_INUSUAL",
            "Los ingresos variables superan con creces al fijo",
            f"Lo variable ({formato_cop(d.ingreso_variable)}) supera tres veces el ingreso fijo "
            f"({formato_cop(d.ingreso_fijo)}). Conviene verificar la estacionalidad con extractos.",
            {"fijo": formato_cop(d.ingreso_fijo), "variable": formato_cop(d.ingreso_variable)},
        )
    return None


# ---------------------------------------------------------------------------
# Capacidad de pago
# ---------------------------------------------------------------------------
@comprobacion("GASTOS_SUPERAN_INGRESO")
def _gastos_superan_ingreso(d: EntradaConsistencia) -> Hallazgo | None:
    total = d.gastos_totales + d.cuotas_obligaciones
    if d.ingreso_declarado <= 0 or total <= d.ingreso_declarado:
        return None
    valores = {
        "compromisos": formato_cop(total),
        "ingreso": formato_cop(d.ingreso_declarado),
    }
    if total > d.ingreso_declarado * 10:
        # Un desfase de este tamaño casi siempre son ceros de más o de menos.
        return Hallazgo(
            "GASTOS_SUPERAN_INGRESO", "ERROR_DIGITACION",
            "Los gastos multiplican por diez el ingreso",
            f"Compromisos por {formato_cop(total)} frente a un ingreso de "
            f"{formato_cop(d.ingreso_declarado)}. Es muy probable que falten o sobren ceros.",
            valores,
        )
    return Hallazgo(
        "GASTOS_SUPERAN_INGRESO", "INCONSISTENCIA",
        "Los gastos y las deudas superan el ingreso",
        f"Compromisos por {formato_cop(total)} frente a un ingreso declarado de "
        f"{formato_cop(d.ingreso_declarado)}.",
        valores,
    )


@comprobacion("ENDEUDAMIENTO_ALTO")
def _endeudamiento_alto(d: EntradaConsistencia) -> Hallazgo | None:
    if d.ingreso_declarado > 0 and d.cuotas_obligaciones > d.ingreso_declarado * 0.6:
        porcentaje = round(d.cuotas_obligaciones / d.ingreso_declarado * 100)
        return Hallazgo(
            "ENDEUDAMIENTO_ALTO", "INCONSISTENCIA",
            "Nivel de endeudamiento muy alto",
            f"Las cuotas de las obligaciones ({formato_cop(d.cuotas_obligaciones)}) comprometen "
            f"el {porcentaje} % del ingreso declarado.",
            {"cuotas": formato_cop(d.cuotas_obligaciones), "porcentaje": porcentaje},
        )
    return None


@comprobacion("VIVIENDA_SUPERA_CAPACIDAD")
def _vivienda_supera_capacidad(d: EntradaConsistencia) -> Hallazgo | None:
    if d.disponible_despues_vivienda < 0:
        return Hallazgo(
            "VIVIENDA_SUPERA_CAPACIDAD", "INCONSISTENCIA",
            "El arriendo supera el flujo disponible",
            "Después de gastos y obligaciones, el disponible no alcanza para el costo total de "
            f"la vivienda ({formato_cop(d.costo_vivienda)}).",
            {
                "costo_vivienda": formato_cop(d.costo_vivienda),
                "faltante": formato_cop(abs(d.disponible_despues_vivienda)),
            },
        )
    if d.ingreso_declarado > 0 and d.costo_vivienda > d.ingreso_declarado * 0.5:
        porcentaje = round(d.costo_vivienda / d.ingreso_declarado * 100)
        return Hallazgo(
            "VIVIENDA_SUPERA_CAPACIDAD", "INCONSISTENCIA",
            "El canon compromete más de la mitad del ingreso",
            f"El costo de la vivienda ({formato_cop(d.costo_vivienda)}) representa el "
            f"{porcentaje} % del ingreso declarado ({formato_cop(d.ingreso_declarado)}).",
            {"costo_vivienda": formato_cop(d.costo_vivienda), "porcentaje": porcentaje},
        )
    return None


# ---------------------------------------------------------------------------
# Empleador y actividad económica
# ---------------------------------------------------------------------------
@comprobacion("NIT_EMPLEADOR")
def _nit_empleador(d: EntradaConsistencia) -> Hallazgo | None:
    if d.nit_empleador:
        analizado = parsear_nit(d.nit_empleador)
        if not analizado:
            return Hallazgo(
                "NIT_EMPLEADOR", "INCONSISTENCIA",
                "El NIT del empleador tiene un formato inválido",
                f"El NIT registrado ({d.nit_empleador}) no tiene una estructura válida; "
                "debe verse así: 900123456-8.",
                {"nit": str(d.nit_empleador)},
            )
        base, dv, esperado = analizado
        if dv is not None and dv != esperado:
            return Hallazgo(
                "NIT_EMPLEADOR", "INCONSISTENCIA",
                "El NIT del empleador no es válido",
                f"El dígito de verificación no corresponde: para {base} debería ser {esperado}, "
                f"no {dv}.",
                {"base": base, "dv_informado": dv, "dv_esperado": esperado},
            )
    elif d.situacion_laboral in ("indefinido", "termino_fijo"):
        return Hallazgo(
            "NIT_EMPLEADOR", "SIN_VERIFICAR",
            "El empleador no tiene NIT registrado",
            "Sin el NIT no se puede contrastar la empresa con fuentes externas.",
        )
    return None


@comprobacion("CIIU_VS_SITUACION")
def _ciiu_vs_situacion(d: EntradaConsistencia) -> Hallazgo | None:
    if d.situacion_laboral == "independiente" and not d.codigo_ciiu:
        return Hallazgo(
            "CIIU_VS_SITUACION", "SIN_VERIFICAR",
            "Actividad económica sin código CIIU",
            "Para un independiente se necesita el código oficial de la actividad, no solo su "
            "descripción.",
        )
    if d.situacion_laboral == "pensionado" and d.codigo_ciiu and d.seccion_ciiu != "T":
        return Hallazgo(
            "CIIU_VS_SITUACION", "VALOR_INUSUAL",
            "La actividad económica no encaja con la situación declarada",
            f"Declara ser pensionado pero registró la actividad {d.codigo_ciiu}. "
            "Puede tratarse de una actividad complementaria.",
            {"ciiu": d.codigo_ciiu},
        )
    if d.situacion_laboral == "independiente" and d.seccion_ciiu == "T":
        return Hallazgo(
            "CIIU_VS_SITUACION", "INCONSISTENCIA",
            "Actividad económica incompatible con el perfil",
            "La actividad corresponde a hogares como empleadores, incompatible con la situación "
            "laboral declarada.",
            {"ciiu": d.codigo_ciiu or ""},
        )
    return None


@comprobacion("FECHA_LABORAL_VS_NACIMIENTO")
def _fecha_laboral_vs_nacimiento(d: EntradaConsistencia) -> Hallazgo | None:
    if d.fecha_nacimiento and d.fecha_ingreso_laboral:
        anios = (d.fecha_ingreso_laboral - d.fecha_nacimiento).days / 365.25
        if anios < 14:
            return Hallazgo(
                "FECHA_LABORAL_VS_NACIMIENTO", "INCONSISTENCIA",
                "La fecha de ingreso laboral no es coherente con la de nacimiento",
                f"La fecha implica haber empezado a trabajar a los {int(anios)} años.",
                {
                    "nacimiento": d.fecha_nacimiento.isoformat(),
                    "ingreso": d.fecha_ingreso_laboral.isoformat(),
                },
            )
    return None


# ---------------------------------------------------------------------------
# Documentos
# ---------------------------------------------------------------------------
@comprobacion("DOCUMENTOS_RECHAZADOS")
def _documentos_rechazados(d: EntradaConsistencia) -> Hallazgo | None:
    if d.documentos_rechazados:
        return Hallazgo(
            "DOCUMENTOS_RECHAZADOS", "DOCUMENTO_INSUFICIENTE",
            "Hay documentos rechazados en la revisión",
            "Requieren una nueva carga: " + ", ".join(d.documentos_rechazados) + ".",
            {"documentos": list(d.documentos_rechazados)},
        )
    return None


@comprobacion("DOCUMENTOS_VENCIDOS")
def _documentos_vencidos(d: EntradaConsistencia) -> Hallazgo | None:
    if d.documentos_vencidos:
        return Hallazgo(
            "DOCUMENTOS_VENCIDOS", "DOCUMENTO_INSUFICIENTE",
            "Hay documentos vencidos",
            "Superaron su vigencia: " + ", ".join(d.documentos_vencidos) + ".",
            {"documentos": list(d.documentos_vencidos)},
        )
    return None


@comprobacion("DOCUMENTO_DUPLICADO")
def _documento_duplicado(d: EntradaConsistencia) -> Hallazgo | None:
    if d.documento_compartido_con:
        confirmado = bool(d.fraude_confirmado)
        return Hallazgo(
            "DOCUMENTO_DUPLICADO",
            "FRAUDE_CONFIRMADO" if confirmado else "ALERTA_FRAUDE",
            "El mismo documento figura en dos personas distintas",
            f"El número de documento aparece también a nombre de {d.documento_compartido_con}.",
            {"otra_persona": d.documento_compartido_con, "confirmado": confirmado},
        )
    return None


# ---------------------------------------------------------------------------
# Inmueble
# ---------------------------------------------------------------------------
@comprobacion("TITULARIDAD_PROPIETARIO")
def _titularidad_propietario(d: EntradaConsistencia) -> Hallazgo | None:
    if d.titularidad_propietario:
        return Hallazgo(
            "TITULARIDAD_PROPIETARIO", "INCONSISTENCIA",
            "Dudas sobre la titularidad del propietario",
            d.titularidad_propietario,
        )
    return None


@comprobacion("SITUACION_JURIDICA_INMUEBLE")
def _situacion_juridica_inmueble(d: EntradaConsistencia) -> Hallazgo | None:
    if d.situacion_juridica_inmueble:
        return Hallazgo(
            "SITUACION_JURIDICA_INMUEBLE", "DOCUMENTO_INSUFICIENTE",
            "Situación jurídica del inmueble sin resolver",
            d.situacion_juridica_inmueble,
        )
    return None


# ---------------------------------------------------------------------------
# Comprobaciones propias de la plataforma (el registro es extensible: basta con
# decorar una función nueva con @comprobacion)
# ---------------------------------------------------------------------------
@comprobacion("INGRESO_VS_OCUPACION")
def _ingreso_vs_ocupacion(d: EntradaConsistencia) -> Hallazgo | None:
    if d.ingreso_declarado <= 0:
        return None
    if d.situacion_laboral in ("indefinido", "termino_fijo") and d.ingreso_declarado < 650_000:
        return Hallazgo(
            "INGRESO_VS_OCUPACION", "VALOR_INUSUAL",
            "Ingreso inusualmente bajo para un empleado",
            f"El ingreso declarado ({formato_cop(d.ingreso_declarado)}) está muy por debajo de un "
            "salario mínimo. Verificar que no falten ceros o que la periodicidad no sea quincenal.",
            {"ingreso": formato_cop(d.ingreso_declarado)},
        )
    if d.situacion_laboral == "pensionado" and d.ingreso_declarado > 30_000_000:
        return Hallazgo(
            "INGRESO_VS_OCUPACION", "VALOR_INUSUAL",
            "Ingreso inusualmente alto para un pensionado",
            f"Declara mesada e ingresos por {formato_cop(d.ingreso_declarado)}; se confirmará con "
            "la resolución de pensión.",
            {"ingreso": formato_cop(d.ingreso_declarado)},
        )
    return None


@comprobacion("PATRIMONIO_NETO_NEGATIVO")
def _patrimonio_neto_negativo(d: EntradaConsistencia) -> Hallazgo | None:
    if d.activos_totales and d.pasivos_totales > d.activos_totales:
        return Hallazgo(
            "PATRIMONIO_NETO_NEGATIVO", "VALOR_INUSUAL",
            "El patrimonio neto declarado es negativo",
            f"Los pasivos ({formato_cop(d.pasivos_totales)}) superan los activos "
            f"({formato_cop(d.activos_totales)}).",
            {
                "activos": formato_cop(d.activos_totales),
                "pasivos": formato_cop(d.pasivos_totales),
            },
        )
    return None


@comprobacion("CORREO_DESECHABLE")
def _correo_desechable(d: EntradaConsistencia) -> Hallazgo | None:
    if not d.email or "@" not in d.email:
        return None
    dominio = d.email.rsplit("@", 1)[-1]
    if dominio in DOMINIOS_DESECHABLES:
        return Hallazgo(
            "CORREO_DESECHABLE", "ALERTA_FRAUDE",
            "El correo electrónico es de un servicio desechable",
            f"El dominio {dominio} corresponde a un servicio de correos temporales; no permite "
            "contactar al solicitante de forma confiable.",
            {"dominio": dominio},
        )
    return None


def ejecutar(entrada: EntradaConsistencia) -> list[Hallazgo]:
    """Corre todas las comprobaciones; devuelve los hallazgos por severidad descendente."""
    hallazgos: list[Hallazgo] = []
    for _codigo, fn in COMPROBACIONES:
        resultado = fn(entrada)
        if resultado:
            hallazgos.append(resultado)
    return sorted(hallazgos, key=lambda h: h.severidad, reverse=True)
