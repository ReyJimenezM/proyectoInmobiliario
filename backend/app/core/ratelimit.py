"""Control de intentos para operaciones sensibles (login, sobre todo).

Sin freno, el login permite dos abusos distintos y ambos malos:

  * probar contraseñas hasta acertar;
  * agotar la CPU del servidor, porque cada intento cuesta un hash completo
    (lo mismo que protege las contraseñas es lo que hace caro cada intento).

El contador vive en memoria del proceso a propósito: no requiere Redis ni una
tabla nueva, y para uno o dos procesos es suficiente. Queda aislado detrás de
esta interfaz para poder sustituirlo por un almacén compartido el día que haya
varias réplicas; sin ese almacén, cada réplica contaría por su cuenta y el
límite efectivo se multiplicaría por el número de réplicas.

Detalle importante: mientras la clave está bloqueada se rechaza **también** el
intento con la contraseña correcta. Si no, un atacante podría usar la respuesta
del bloqueo para confirmar que dio con la contraseña buena.
"""
from __future__ import annotations

import threading
import time
from collections import deque
from dataclasses import dataclass, field

from app.core.config import settings
from app.core.errores import DemasiadosIntentos


@dataclass
class _Estado:
    """Historial de una clave: intentos recientes y bloqueo vigente."""

    intentos: deque = field(default_factory=deque)
    bloqueado_hasta: float = 0.0


class LimitadorIntentos:
    """Ventana deslizante por clave, con bloqueo temporal al superar el máximo."""

    def __init__(
        self,
        max_intentos: int = 5,
        ventana_segundos: int = 900,
        bloqueo_segundos: int = 900,
    ) -> None:
        self.max_intentos = max_intentos
        self.ventana_segundos = ventana_segundos
        self.bloqueo_segundos = bloqueo_segundos
        self._estados: dict[str, _Estado] = {}
        self._lock = threading.Lock()

    # -- consultas -----------------------------------------------------------
    def verificar(self, clave: str) -> None:
        """Lanza ``DemasiadosIntentos`` si la clave está bloqueada ahora mismo."""
        ahora = time.monotonic()
        with self._lock:
            estado = self._estados.get(clave)
            if estado is None:
                return
            self._exigir_no_bloqueado(estado, ahora)

    # -- registro de resultados ---------------------------------------------
    def registrar_fallo(self, clave: str) -> None:
        """Suma un intento fallido y bloquea la clave si se pasó del máximo."""
        ahora = time.monotonic()
        with self._lock:
            estado = self._estados.setdefault(clave, _Estado())
            self._exigir_no_bloqueado(estado, ahora)
            self._purgar(estado, ahora)
            estado.intentos.append(ahora)
            if len(estado.intentos) >= self.max_intentos:
                estado.bloqueado_hasta = ahora + self.bloqueo_segundos
                estado.intentos.clear()
                self._exigir_no_bloqueado(estado, ahora)

    def registrar_exito(self, clave: str) -> None:
        """Un acierto limpia el historial: no penalizamos a quien sí es el dueño."""
        with self._lock:
            self._estados.pop(clave, None)

    def reiniciar(self) -> None:
        """Solo para pruebas: el estado es global al proceso."""
        with self._lock:
            self._estados.clear()

    # -- internos ------------------------------------------------------------
    def _exigir_no_bloqueado(self, estado: _Estado, ahora: float) -> None:
        if estado.bloqueado_hasta <= ahora:
            return
        restante = max(1, int(estado.bloqueado_hasta - ahora))
        minutos = max(1, round(restante / 60))
        raise DemasiadosIntentos(
            "Demasiados intentos fallidos. Vuelve a intentarlo dentro de "
            f"{minutos} minuto(s).",
            detalles={"reintentar_en_segundos": restante},
        )

    def _purgar(self, estado: _Estado, ahora: float) -> None:
        """Descarta los intentos que ya salieron de la ventana de observación."""
        limite = ahora - self.ventana_segundos
        while estado.intentos and estado.intentos[0] < limite:
            estado.intentos.popleft()


#: Instancia compartida del proceso, parametrizada por variables de entorno.
limitador_login = LimitadorIntentos(
    max_intentos=settings.login_max_intentos,
    ventana_segundos=settings.login_ventana_segundos,
    bloqueo_segundos=settings.login_bloqueo_segundos,
)


def clave_login(email: str, ip: str | None = None) -> str:
    """Clave de conteo del login: email normalizado y, si se conoce, la IP."""
    base = (email or "").strip().lower()
    return f"{base}|{ip}" if ip else base


__all__ = ["LimitadorIntentos", "limitador_login", "clave_login"]
