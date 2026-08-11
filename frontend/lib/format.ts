export function formatoMoneda(valor: string | number): string {
  const numero = typeof valor === "string" ? Number(valor) : valor;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(numero);
}

export function formatoPorcentaje(valor: string | number): string {
  const numero = typeof valor === "string" ? Number(valor) : valor;
  return new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 }).format(numero);
}

export function formatoArea(valor: string | number): string {
  const numero = typeof valor === "string" ? Number(valor) : valor;
  return `${new Intl.NumberFormat("es-CO").format(numero)} m²`;
}

/**
 * Formatea una fecha sin hora ("2026-09-01"). `new Date("2026-09-01")` la interpreta como
 * medianoche UTC, así que en Colombia (UTC-5) se mostraría el día anterior; aquí se construye
 * la fecha en horario local para evitar ese corrimiento.
 */
export function formatoFecha(
  valor: string,
  opciones: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }
): string {
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  const fecha = soloFecha
    ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
    : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleDateString("es-CO", opciones);
}

export const ETIQUETAS_TIPO_PROPIEDAD: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  apartaestudio: "Apartaestudio",
  oficina: "Oficina",
  local: "Local comercial",
  lote: "Lote",
  bodega: "Bodega",
};

export const ETIQUETAS_OPERACION: Record<string, string> = {
  venta: "Venta",
  arriendo: "Arriendo",
};
