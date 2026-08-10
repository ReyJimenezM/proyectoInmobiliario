"""Motor de validación declarativo — capa 1.

Un único lugar donde se define **qué es un dato válido**: cada campo se declara
en `especificaciones.py` y el motor lo recorre. Añadir un campo no obliga a
tocar ningún router ni ningún servicio.

Contrato de salida (`ResultadoCampo`):
    campo · etiqueta · estado · codigo · mensaje · valor

Estados posibles:
    VALIDO          el dato está capturado y cumple su especificación
    ADVERTENCIA     es usable pero conviene confirmarlo (valor inusual, DV autocompletado)
    INVALIDO        está capturado pero mal escrito
    CONTRADICTORIO  choca con otro dato del mismo expediente
    FALTANTE        no se ha capturado todavía
    SIN_VERIFICAR   se aceptó como declarado porque no hay con qué contrastarlo

FALTANTE ≠ INVALIDO: confundirlos manda todos los expedientes a revisión humana.
Un dato que aún no se pidió no es un dato mal escrito.

Los mensajes van en español claro, listos para mostrarse al solicitante; el
`codigo` técnico es lo que consume el backoffice.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field as campo_dc
from datetime import date
from typing import Any, Callable

from app.validacion.colombia import (
    EDAD_MINIMA_LABORAL,
    NO_NUMERICO,
    a_fecha,
    antiguedad_meses,
    edad,
    formato_cop,
    normalizar_telefono,
    parsear_moneda,
    parsear_nit,
    reglas_documento,
    validar_ciiu,
    validar_departamento,
    validar_municipio,
)

VALIDO = "VALIDO"
ADVERTENCIA = "ADVERTENCIA"
INVALIDO = "INVALIDO"
CONTRADICTORIO = "CONTRADICTORIO"
FALTANTE = "FALTANTE"
SIN_VERIFICAR = "SIN_VERIFICAR"

ESTADOS = (VALIDO, ADVERTENCIA, INVALIDO, CONTRADICTORIO, FALTANTE, SIN_VERIFICAR)

VERSION_MOTOR = "validacion-2.0.0"


@dataclass
class ResultadoCampo:
    campo: str
    estado: str
    codigo: str
    mensaje: str = ""
    valor: Any = None
    etiqueta: str = ""

    @property
    def ok(self) -> bool:
        return self.estado in (VALIDO, ADVERTENCIA, SIN_VERIFICAR)

    def como_dict(self) -> dict:
        return {
            "campo": self.campo,
            "etiqueta": self.etiqueta,
            "estado": self.estado,
            "codigo": self.codigo,
            "mensaje": self.mensaje,
            "valor": self.valor,
        }


@dataclass
class EspecificacionCampo:
    """Definición declarativa de un campo. Es la fuente de verdad."""

    nombre: str
    etiqueta: str
    tipo: str
    obligatorio: bool = False
    min_valor: float | None = None
    max_valor: float | None = None
    max_razonable: int | None = None
    min_long: int | None = None
    max_long: int | None = None
    patron: str | None = None
    opciones: list | None = None
    depende_de: str | None = None
    sin_futuro: bool = False
    sin_pasado: bool = False
    edad_minima: int | None = None
    edad_maxima: int | None = None
    posterior_a: str | None = None
    edad_minima_en_fecha: int | None = None
    fuente: str = "FORMULARIO"
    confiabilidad: str = "media"
    calculado: bool = False
    derivado_de: str | None = None
    # Campos que solo existen dentro de una colección (filas de obligaciones,
    # referencias, codeudor). No se exigen en el payload principal.
    solo_en_coleccion: bool = False


# ---------------------------------------------------------------------------
# Validadores por tipo. Firma: (valor, esp, ctx) -> (estado, codigo, mensaje, normalizado)
# ---------------------------------------------------------------------------
def _v_texto(v, esp, ctx):
    t = " ".join(str(v).split())
    if esp.min_long and len(t) < esp.min_long:
        return INVALIDO, "LONGITUD_MINIMA", f"Debe tener al menos {esp.min_long} caracteres.", t
    if esp.max_long and len(t) > esp.max_long:
        return INVALIDO, "LONGITUD_MAXIMA", f"No puede superar {esp.max_long} caracteres.", t
    if esp.patron and not re.fullmatch(esp.patron, t):
        return INVALIDO, "PATRON", "Contiene caracteres que no esperamos en este campo.", t
    return VALIDO, "OK", "", t


def _v_entero(v, esp, ctx):
    n = parsear_moneda(v)
    if n is None:
        return VALIDO, "OK", "", None
    if n is NO_NUMERICO:
        return INVALIDO, "NO_NUMERICO", "Escribe solo números.", None
    if float(n) != int(n):
        return INVALIDO, "NO_ENTERO", "Debe ser un número entero, sin decimales.", n
    n = int(n)
    if esp.min_valor is not None and n < esp.min_valor:
        return INVALIDO, "MINIMO", f"No puede ser menor que {int(esp.min_valor)}.", n
    if esp.max_valor is not None and n > esp.max_valor:
        return INVALIDO, "MAXIMO", f"No puede ser mayor que {int(esp.max_valor)}.", n
    return VALIDO, "OK", "", n


def _v_decimal(v, esp, ctx):
    n = parsear_moneda(v)
    if n is None:
        return VALIDO, "OK", "", None
    if n is NO_NUMERICO:
        return INVALIDO, "NO_NUMERICO", "Escribe solo números.", None
    n = float(n)
    if esp.min_valor is not None and n < esp.min_valor:
        return INVALIDO, "MINIMO", f"No puede ser menor que {esp.min_valor:g}.", n
    if esp.max_valor is not None and n > esp.max_valor:
        return INVALIDO, "MAXIMO", f"No puede ser mayor que {esp.max_valor:g}.", n
    return VALIDO, "OK", "", n


def _v_moneda(v, esp, ctx):
    n = parsear_moneda(v)
    if n is None:
        return VALIDO, "OK", "", None
    if n is NO_NUMERICO:
        return INVALIDO, "NO_NUMERICO", (
            "Escribe el valor solo en números, sin letras. Ejemplo: 1500000."
        ), None
    n = int(round(float(n)))  # en pesos no se almacenan decimales
    minimo = 0 if esp.min_valor is None else int(esp.min_valor)
    if n < minimo:
        mensaje = (
            "El valor no puede ser negativo."
            if minimo == 0
            else f"El valor mínimo es {formato_cop(minimo)}."
        )
        return INVALIDO, "MONTO_MENOR_AL_MINIMO", mensaje, n
    if esp.max_valor is not None and n > esp.max_valor:
        return INVALIDO, "MAXIMO", f"No puede superar {formato_cop(esp.max_valor)}.", n
    if esp.max_razonable and n > esp.max_razonable:
        # Un ingreso absurdo se confirma, no se rechaza.
        return ADVERTENCIA, "MONTO_INUSUAL", (
            f"{formato_cop(n)} es un valor inusualmente alto. Revísalo: si es correcto, "
            "lo confirmamos con tus soportes."
        ), n
    return VALIDO, "OK", "", n


def _v_porcentaje(v, esp, ctx):
    n = parsear_moneda(v)
    if n is None:
        return VALIDO, "OK", "", None
    if n is NO_NUMERICO:
        return INVALIDO, "NO_NUMERICO", "Escribe solo números.", None
    if not (0 <= float(n) <= 100):
        return INVALIDO, "RANGO", "Debe estar entre 0 % y 100 %.", float(n)
    return VALIDO, "OK", "", float(n)


def _v_fecha(v, esp, ctx):
    f = a_fecha(v)
    if f is None:
        return INVALIDO, "FECHA_FORMATO", "Escribe una fecha válida (año-mes-día).", None
    hoy = date.today()
    if esp.sin_futuro and f > hoy:
        return INVALIDO, "FECHA_FUTURA", "La fecha no puede ser posterior a hoy.", f.isoformat()
    if esp.sin_pasado and f < hoy:
        return INVALIDO, "FECHA_PASADA", "Elige una fecha de hoy en adelante.", f.isoformat()
    if esp.edad_minima is not None and edad(f) < esp.edad_minima:
        return INVALIDO, "EDAD_MENOR_AL_MINIMO", (
            f"Para firmar el contrato debes ser mayor de {esp.edad_minima} años."
        ), f.isoformat()
    if esp.edad_maxima is not None and edad(f) > esp.edad_maxima:
        return INVALIDO, "EDAD_MAYOR_AL_MAXIMO", (
            "Revisa la fecha: la edad que resulta no es posible."
        ), f.isoformat()
    if esp.posterior_a:
        base = a_fecha(ctx.get(esp.posterior_a))
        if base:
            if f <= base:
                return CONTRADICTORIO, "ORDEN_DE_FECHAS", (
                    "Esta fecha debe ser posterior a la fecha de nacimiento."
                ), f.isoformat()
            if esp.edad_minima_en_fecha:
                anios = (f - base).days / 365.25
                if anios < esp.edad_minima_en_fecha:
                    return CONTRADICTORIO, "ANTIGUEDAD_IMPOSIBLE", (
                        f"La fecha implica haber empezado a trabajar a los {int(anios)} años. "
                        "Revísala."
                    ), f.isoformat()
    return VALIDO, "OK", "", f.isoformat()


def _v_email(v, esp, ctx):
    t = str(v).strip().lower()
    if " " in t:
        return INVALIDO, "EMAIL_ESPACIOS", "El correo no puede tener espacios.", t
    if not re.fullmatch(r"[^\s@]+@[^\s@]+", t):
        return INVALIDO, "EMAIL_FORMATO", (
            "Escribe un correo electrónico válido. Ejemplo: nombre@correo.com"
        ), t
    dominio = t.split("@")[1]
    if not re.fullmatch(r"[a-z0-9.-]+\.[a-z]{2,}", dominio):
        return INVALIDO, "EMAIL_DOMINIO", (
            "Revisa el dominio del correo: le falta algo como .com o .co."
        ), t
    if re.search(r"[^\w.@+-]", t):
        return INVALIDO, "EMAIL_CARACTERES", "El correo tiene caracteres que no podemos aceptar.", t
    return VALIDO, "OK", "", t


def _v_telefono(v, esp, ctx):
    normalizado, codigo, mensaje = normalizar_telefono(v)
    if normalizado is None:
        return INVALIDO, codigo, mensaje, re.sub(r"\D", "", str(v))
    return VALIDO, "OK", "", normalizado


def _v_numero_documento(v, esp, ctx):
    t = re.sub(r"[.\s]", "", str(v))
    tipo = ctx.get(esp.depende_de or "tipo_documento") or "CC"
    regla = reglas_documento(tipo)
    if not re.fullmatch(regla["patron"], t):
        return INVALIDO, "DOCUMENTO_FORMATO", regla["mensaje"], t
    return VALIDO, "OK", "", t


def _v_nit(v, esp, ctx):
    if re.search(r"[a-zA-Z]", str(v)):
        return INVALIDO, "NIT_NO_NUMERICO", (
            "El NIT solo lleva números y el dígito de verificación."
        ), None
    analizado = parsear_nit(v)
    if not analizado:
        return INVALIDO, "NIT_FORMATO", (
            "El formato del NIT no es válido. Debe verse así: 900123456-8."
        ), None
    base, dv, esperado = analizado
    if dv is None:
        # Falta el DV: se autocompleta y se avisa. No es un error del solicitante.
        return ADVERTENCIA, "NIT_DV_FALTANTE", (
            f"Falta el dígito de verificación. Para el NIT {base} el DV es {esperado}."
        ), {"base": base, "dv": esperado, "autocompletado": True}
    if dv != esperado:
        return INVALIDO, "NIT_DV_INVALIDO", (
            f"El dígito de verificación no corresponde: para {base} debería ser {esperado}, no {dv}."
        ), {"base": base, "dv": dv, "esperado": esperado}
    return VALIDO, "OK", "", {"base": base, "dv": dv}


def _v_ciiu(v, esp, ctx):
    info = validar_ciiu(v)
    if not info:
        return INVALIDO, "CIIU_DESCONOCIDO", (
            "Elige la actividad económica de la lista para guardar su código oficial."
        ), None
    return VALIDO, "OK", "", info


def _v_divipola(v, esp, ctx):
    if "departamento" in esp.nombre:
        info = validar_departamento(v)
        if not info:
            return INVALIDO, "DEPARTAMENTO_DESCONOCIDO", "Elige un departamento de la lista.", None
        return VALIDO, "OK", "", info
    info = validar_municipio(v)
    if not info:
        return INVALIDO, "MUNICIPIO_DESCONOCIDO", (
            "Elige la ciudad o el municipio de la lista."
        ), None
    if esp.depende_de:
        cod_depto = str(ctx.get(esp.depende_de) or "")
        if cod_depto and info["cod_departamento"] != cod_depto:
            return CONTRADICTORIO, "MUNICIPIO_FUERA_DEL_DEPARTAMENTO", (
                f"{info['nombre']} pertenece a {info['departamento']}, no al departamento "
                "seleccionado."
            ), info
    return VALIDO, "OK", "", info


def _v_seleccion(v, esp, ctx):
    t = str(v).strip()
    if esp.opciones and t not in esp.opciones:
        return INVALIDO, "OPCION_INVALIDA", "Elige una de las opciones de la lista.", t
    return VALIDO, "OK", "", t


def _v_booleano(v, esp, ctx):
    if isinstance(v, str):
        texto = v.strip().lower()
        if texto in ("true", "si", "sí", "1"):
            return VALIDO, "OK", "", True
        if texto in ("false", "no", "0"):
            return VALIDO, "OK", "", False
        return INVALIDO, "BOOLEANO_INVALIDO", "Responde sí o no.", v
    return VALIDO, "OK", "", bool(v)


VALIDADORES: dict[str, Callable] = {
    "texto": _v_texto,
    "entero": _v_entero,
    "decimal": _v_decimal,
    "moneda": _v_moneda,
    "porcentaje": _v_porcentaje,
    "fecha": _v_fecha,
    "email": _v_email,
    "telefono": _v_telefono,
    "numero_documento": _v_numero_documento,
    "nit": _v_nit,
    "ciiu": _v_ciiu,
    "divipola": _v_divipola,
    "booleano": _v_booleano,
    "seleccion": _v_seleccion,
}


class MotorValidacion:
    """Registro de especificaciones + ejecución. Extensible sin tocar el resto."""

    def __init__(self, especificaciones: dict[str, EspecificacionCampo]):
        self.especificaciones = especificaciones
        self.version = VERSION_MOTOR

    # -- un campo ----------------------------------------------------------
    def validar_campo(self, nombre: str, valor: Any, ctx: dict | None = None) -> ResultadoCampo:
        clave = nombre.rsplit(".", 1)[-1]
        esp = self.especificaciones.get(clave)
        ctx = ctx or {}
        if esp is None:
            return ResultadoCampo(nombre, VALIDO, "SIN_ESPECIFICACION", "", valor, clave)

        vacio = valor is None or (isinstance(valor, str) and not valor.strip())
        if vacio:
            if esp.obligatorio:
                # FALTANTE, no INVALIDO: el dato no está mal, todavía no se capturó.
                return ResultadoCampo(
                    nombre, FALTANTE, "OBLIGATORIO",
                    f"Falta {esp.etiqueta.lower()}.", None, esp.etiqueta,
                )
            return ResultadoCampo(nombre, VALIDO, "OK", "", None, esp.etiqueta)

        if esp.calculado:
            return self._validar_calculado(nombre, valor, esp, ctx)

        validador = VALIDADORES.get(esp.tipo, _v_texto)
        estado, codigo, mensaje, normalizado = validador(valor, esp, ctx)
        return ResultadoCampo(nombre, estado, codigo, mensaje, normalizado, esp.etiqueta)

    def _validar_calculado(
        self, nombre: str, valor: Any, esp: EspecificacionCampo, ctx: dict
    ) -> ResultadoCampo:
        """Campos que el motor recalcula: la antigüedad declarada nunca se acepta tal cual."""
        origen = ctx.get(esp.derivado_de) if esp.derivado_de else None
        meses = antiguedad_meses(origen)
        if meses is None:
            return ResultadoCampo(
                nombre, SIN_VERIFICAR, "SIN_FUENTE_PARA_CALCULAR",
                f"{esp.etiqueta} se toma como declarada: falta la fecha de ingreso para calcularla.",
                parsear_moneda(valor) if not isinstance(valor, (int, float)) else valor,
                esp.etiqueta,
            )
        declarado = parsear_moneda(valor)
        calculado = meses if esp.nombre.endswith("_meses") else round(meses / 12)
        if declarado is NO_NUMERICO or declarado is None:
            return ResultadoCampo(nombre, VALIDO, "CALCULADO", "", calculado, esp.etiqueta)
        tolerancia = 2 if esp.nombre.endswith("_meses") else 1
        if abs(float(declarado) - calculado) > tolerancia:
            unidad = "meses" if esp.nombre.endswith("_meses") else "años"
            return ResultadoCampo(
                nombre, CONTRADICTORIO, "ANTIGUEDAD_DECLARADA_NO_COINCIDE",
                f"La antigüedad declarada ({int(float(declarado))} {unidad}) no coincide con la "
                f"calculada desde la fecha de ingreso ({calculado} {unidad}). Se usa la calculada.",
                calculado, esp.etiqueta,
            )
        return ResultadoCampo(nombre, VALIDO, "CALCULADO", "", calculado, esp.etiqueta)

    # -- payload completo --------------------------------------------------
    def validar(
        self,
        payload: dict,
        ctx: dict | None = None,
        colecciones: dict[str, list[dict]] | None = None,
        exigir_ausentes: bool = True,
    ) -> "InformeValidacion":
        """Valida campos sueltos y colecciones repetidas (obligaciones, referencias).

        Un campo `obligatorio` que ni siquiera aparece en el payload también es
        FALTANTE: omitir la clave no puede hacer desaparecer la validación. Quien
        valida un expediente a medio diligenciar puede desactivarlo con
        `exigir_ausentes=False` y sembrar él mismo las claves que ya tocaba pedir.
        """
        ctx = {**(ctx or {}), **payload}
        resultados = [self.validar_campo(n, v, ctx) for n, v in payload.items()]

        for nombre, esp in (self.especificaciones if exigir_ausentes else {}).items():
            if (
                esp.obligatorio
                and not esp.calculado
                and not esp.solo_en_coleccion
                and nombre not in payload
            ):
                resultados.append(ResultadoCampo(
                    nombre, FALTANTE, "OBLIGATORIO",
                    f"Falta {esp.etiqueta.lower()}.", None, esp.etiqueta,
                ))

        for coleccion, filas in (colecciones or {}).items():
            for indice, fila in enumerate(filas or []):
                if not isinstance(fila, dict):
                    continue
                ctx_fila = {**ctx, **fila}
                for nombre, valor in fila.items():
                    resultado = self.validar_campo(nombre, valor, ctx_fila)
                    # El índice permite señalar la fila exacta en la interfaz:
                    # "otros_creditos[2].cuota_mensual" y no un genérico "revisa las deudas".
                    resultado.campo = f"{coleccion}[{indice}].{nombre}"
                    resultados.append(resultado)

        return InformeValidacion(resultados=resultados, version_motor=self.version)


@dataclass
class InformeValidacion:
    resultados: list[ResultadoCampo] = campo_dc(default_factory=list)
    version_motor: str = VERSION_MOTOR

    def _por_estado(self, *estados: str) -> list[ResultadoCampo]:
        return [r for r in self.resultados if r.estado in estados]

    @property
    def invalidos(self) -> list[ResultadoCampo]:
        return self._por_estado(INVALIDO)

    @property
    def contradictorios(self) -> list[ResultadoCampo]:
        return self._por_estado(CONTRADICTORIO)

    @property
    def advertencias(self) -> list[ResultadoCampo]:
        return self._por_estado(ADVERTENCIA)

    @property
    def faltantes(self) -> list[ResultadoCampo]:
        return self._por_estado(FALTANTE)

    @property
    def sin_verificar(self) -> list[ResultadoCampo]:
        return self._por_estado(SIN_VERIFICAR)

    @property
    def valido(self) -> bool:
        return not self.invalidos and not self.contradictorios

    def normalizados(self) -> dict:
        return {r.campo: r.valor for r in self.resultados if r.estado in (VALIDO, ADVERTENCIA)}

    def como_dict(self) -> dict:
        return {
            "version_motor": self.version_motor,
            "valido": self.valido,
            "invalidos": [r.como_dict() for r in self.invalidos],
            "contradictorios": [r.como_dict() for r in self.contradictorios],
            "advertencias": [r.como_dict() for r in self.advertencias],
            "faltantes": [r.como_dict() for r in self.faltantes],
            "sin_verificar": [r.como_dict() for r in self.sin_verificar],
        }


__all__ = [
    "ADVERTENCIA",
    "CONTRADICTORIO",
    "ESTADOS",
    "EspecificacionCampo",
    "FALTANTE",
    "INVALIDO",
    "InformeValidacion",
    "MotorValidacion",
    "ResultadoCampo",
    "SIN_VERIFICAR",
    "VALIDO",
    "VALIDADORES",
    "VERSION_MOTOR",
    "EDAD_MINIMA_LABORAL",
]
