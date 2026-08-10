"""Reglas de dato locales de Colombia.

Aisladas del motor para poder añadir otro país sin tocar la validación:
dinero, NIT (dígito de verificación DIAN), teléfonos, documentos de identidad y
consulta de los catálogos oficiales (DIVIPOLA del DANE y CIIU Rev. 4 A.C.).
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date

from app.catalogos import CIIU_CLASES, DIVIPOLA

# ---------------------------------------------------------------------------
# Dinero: la presentación es "$1.500.000"; el almacenamiento es 1500000.
# Nunca se guarda texto formateado.
# ---------------------------------------------------------------------------
NO_NUMERICO = object()  # centinela: la entrada existe pero no es un número


def parsear_moneda(valor) -> int | float | None | object:
    """Devuelve número, None si viene vacío, o NO_NUMERICO si no es interpretable."""
    if valor is None:
        return None
    if isinstance(valor, bool):
        return NO_NUMERICO
    if isinstance(valor, (int, float)):
        return valor
    texto = str(valor).strip()
    if not texto:
        return None
    if re.search(r"[a-zA-Z]", texto.replace("$", "")):
        return NO_NUMERICO  # "1.500.000abc", "un millón quinientos"
    # Separador de miles con punto (uso colombiano) y decimal con coma.
    limpio = re.sub(r"[^\d,\-]", "", texto).replace(",", ".")
    if limpio in ("", "-", "."):
        return NO_NUMERICO
    try:
        numero = float(limpio)
    except ValueError:
        return NO_NUMERICO
    return int(numero) if numero.is_integer() else numero


def formato_cop(monto) -> str:
    """1500000 -> "$1.500.000". Solo para mensajes; jamás para almacenar."""
    if monto is None:
        return "—"
    return "$" + f"{int(monto):,}".replace(",", ".")


# ---------------------------------------------------------------------------
# NIT: dígito de verificación (algoritmo DIAN)
# ---------------------------------------------------------------------------
PESOS_NIT = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]


def dv_nit(base: str) -> int | None:
    """Dígito de verificación del NIT según el algoritmo de la DIAN."""
    digitos = re.sub(r"\D", "", str(base))
    if not digitos or len(digitos) > 15:
        return None
    suma = sum(int(d) * PESOS_NIT[i] for i, d in enumerate(reversed(digitos)))
    resto = suma % 11
    return resto if resto < 2 else 11 - resto


def parsear_nit(valor) -> tuple[str, int | None, int] | None:
    """("900123456", 8 | None, dv_esperado). None si el formato no es NIT."""
    texto = re.sub(r"[.\s]", "", str(valor or ""))
    coincidencia = re.fullmatch(r"(\d{5,15})(?:-?(\d))?", texto)
    if not coincidencia:
        return None
    base, dv = coincidencia.group(1), coincidencia.group(2)
    esperado = dv_nit(base)
    if esperado is None:
        return None
    return base, (int(dv) if dv is not None else None), esperado


# ---------------------------------------------------------------------------
# Teléfonos: celular de 10 dígitos que empieza por 3; fijo con indicativo 60X.
# ---------------------------------------------------------------------------
def normalizar_telefono(valor) -> tuple[str | None, str, str]:
    """Devuelve (normalizado, codigo, mensaje). `normalizado` es None si no sirve."""
    crudo = str(valor or "")
    digitos = re.sub(r"\D", "", crudo)
    if re.search(r"[a-zA-Z]", crudo):
        return None, "TELEFONO_NO_NUMERICO", "El teléfono solo debe tener números."
    if not digitos:
        return None, "TELEFONO_VACIO", "Escribe un número de teléfono."
    # El indicativo país se guarda aparte: "+57 311 458 9922" y "3114589922" son el mismo número.
    if len(digitos) == 12 and digitos.startswith("57"):
        digitos = digitos[2:]
    if len(digitos) == 10 and digitos.startswith("3"):
        return digitos, "OK", ""
    if len(digitos) == 10 and digitos.startswith("60"):
        return digitos, "OK", ""
    if len(digitos) == 7:
        return None, "TELEFONO_SIN_INDICATIVO", (
            "A los teléfonos fijos les falta el indicativo: hoy se escriben con 10 dígitos "
            "empezando por 60 (por ejemplo 601 para Bogotá)."
        )
    if len(digitos) != 10:
        return None, "TELEFONO_LONGITUD", "El número debe tener 10 dígitos."
    return None, "TELEFONO_PREFIJO", (
        "En Colombia los celulares empiezan por 3 y los fijos por 60. Revisa el número."
    )


# ---------------------------------------------------------------------------
# Documentos de identidad: cada tipo tiene su propia regla
# ---------------------------------------------------------------------------
REGLAS_DOCUMENTO: dict[str, dict] = {
    "CC": {"patron": r"\d{6,10}",
           "mensaje": "La cédula de ciudadanía debe tener entre 6 y 10 números, sin puntos."},
    "CE": {"patron": r"\d{6,7}",
           "mensaje": "La cédula de extranjería debe tener entre 6 y 7 números."},
    "PPT": {"patron": r"\d{7,11}",
            "mensaje": "El PPT debe tener entre 7 y 11 números."},
    "PEP": {"patron": r"\d{15}",
            "mensaje": "El PEP tiene 15 números."},
    "PA": {"patron": r"[A-Za-z0-9]{5,15}",
           "mensaje": "El pasaporte tiene entre 5 y 15 caracteres, entre letras y números."},
    "NIT": {"patron": r"\d{5,15}-?\d?",
            "mensaje": "El NIT debe tener entre 5 y 15 números y su dígito de verificación."},
}

# El formulario del portal captura la etiqueta larga; el motor trabaja con la sigla.
ALIAS_TIPO_DOCUMENTO: dict[str, str] = {
    "cc": "CC", "cedula de ciudadania": "CC", "cédula de ciudadanía": "CC",
    "ce": "CE", "cedula de extranjeria": "CE", "cédula de extranjería": "CE",
    "pa": "PA", "pasaporte": "PA",
    "ppt": "PPT", "permiso por proteccion temporal": "PPT",
    "permiso por protección temporal": "PPT",
    "pep": "PEP", "permiso especial de permanencia": "PEP",
    "nit": "NIT",
}


def sigla_tipo_documento(valor) -> str | None:
    texto = str(valor or "").strip()
    if not texto:
        return None
    return ALIAS_TIPO_DOCUMENTO.get(texto.lower()) or (
        texto.upper() if texto.upper() in REGLAS_DOCUMENTO else None
    )


def reglas_documento(tipo_documento) -> dict:
    return REGLAS_DOCUMENTO.get(sigla_tipo_documento(tipo_documento) or "", REGLAS_DOCUMENTO["CC"])


# ---------------------------------------------------------------------------
# Fechas y edades
# ---------------------------------------------------------------------------
EDAD_MINIMA = 18
EDAD_MAXIMA = 100
EDAD_MINIMA_LABORAL = 14


def a_fecha(valor) -> date | None:
    if isinstance(valor, date):
        return valor
    if not valor:
        return None
    try:
        return date.fromisoformat(str(valor)[:10])
    except ValueError:
        return None


def edad(nacimiento: date, hoy: date | None = None) -> int:
    hoy = hoy or date.today()
    return hoy.year - nacimiento.year - ((hoy.month, hoy.day) < (nacimiento.month, nacimiento.day))


def antiguedad_meses(fecha_ingreso, hasta: date | None = None) -> int | None:
    """Antigüedad SIEMPRE calculada: la declarada por el solicitante no se acepta."""
    inicio = a_fecha(fecha_ingreso)
    if inicio is None:
        return None
    hasta = hasta or date.today()
    meses = (hasta.year - inicio.year) * 12 + (hasta.month - inicio.month)
    if hasta.day < inicio.day:
        meses -= 1
    return max(meses, 0)


# ---------------------------------------------------------------------------
# Topes de razonabilidad (COP mensuales). Superarlos es ADVERTENCIA, no rechazo.
# ---------------------------------------------------------------------------
MAX_RAZONABLE_INGRESO = 120_000_000
MAX_RAZONABLE_GASTO = 60_000_000
MAX_RAZONABLE_ARRIENDO = 60_000_000
MAX_RAZONABLE_SALDO = 5_000_000_000
MAX_RAZONABLE_ACTIVO = 20_000_000_000


# ---------------------------------------------------------------------------
# Catálogos oficiales: el backend es la única fuente de verdad.
# ---------------------------------------------------------------------------
def sin_tildes(texto: str) -> str:
    """Búsqueda tolerante: "bogota" debe encontrar "Bogotá, D.C."."""
    plano = unicodedata.normalize("NFD", str(texto or ""))
    return "".join(c for c in plano if unicodedata.category(c) != "Mn").casefold().strip()


DEPARTAMENTOS_POR_COD: dict[str, str] = {d[0]: d[1] for d in DIVIPOLA}
MUNICIPIOS_POR_COD: dict[str, tuple[str, str]] = {
    m[0]: (m[1], d[0]) for d in DIVIPOLA for m in d[2]
}
CIIU_POR_COD: dict[str, str] = dict(CIIU_CLASES)


def validar_departamento(codigo) -> dict | None:
    codigo = str(codigo or "").strip()
    if codigo in DEPARTAMENTOS_POR_COD:
        return {"cod": codigo, "nombre": DEPARTAMENTOS_POR_COD[codigo]}
    return None


def validar_municipio(codigo) -> dict | None:
    codigo = str(codigo or "").strip()
    entrada = MUNICIPIOS_POR_COD.get(codigo)
    if not entrada:
        return None
    nombre, cod_depto = entrada
    return {
        "cod": codigo,
        "nombre": nombre,
        "cod_departamento": cod_depto,
        "departamento": DEPARTAMENTOS_POR_COD.get(cod_depto, ""),
    }


def validar_ciiu(codigo) -> dict | None:
    codigo = str(codigo or "").strip()
    if codigo in CIIU_POR_COD:
        return {
            "codigo": codigo,
            "descripcion": CIIU_POR_COD[codigo],
            "division": codigo[:2],
            "grupo": codigo[:3],
        }
    return None


def buscar_municipios(
    cod_departamento: str | None = None,
    q: str | None = None,
    limite: int = 100,
    desplazamiento: int = 0,
) -> tuple[list[dict], int]:
    """Municipios filtrables por departamento y por texto (ignora tildes y acepta código).

    Colombia tiene 1.122 municipios: siempre se pagina. Devuelve (pagina, total).
    """
    termino = sin_tildes(q) if q else None
    resultados: list[dict] = []
    for codigo, (nombre, cod_depto) in MUNICIPIOS_POR_COD.items():
        if cod_departamento and cod_depto != str(cod_departamento):
            continue
        if termino and termino not in sin_tildes(nombre) and not codigo.startswith(termino):
            continue
        resultados.append({
            "cod": codigo,
            "nombre": nombre,
            "cod_departamento": cod_depto,
            "departamento": DEPARTAMENTOS_POR_COD.get(cod_depto, ""),
        })
    resultados.sort(key=lambda m: sin_tildes(m["nombre"]))
    total = len(resultados)
    desplazamiento = max(int(desplazamiento or 0), 0)
    return resultados[desplazamiento:desplazamiento + max(int(limite), 0)], total


DOMINIOS_DESECHABLES = {
    "mailinator.com", "yopmail.com", "guerrillamail.com", "10minutemail.com", "temp-mail.org",
    "tempmail.com", "trashmail.com", "getnada.com", "sharklasers.com", "dispostable.com",
    "maildrop.cc", "mintemail.com", "throwawaymail.com", "fakeinbox.com", "mohmal.com",
}
