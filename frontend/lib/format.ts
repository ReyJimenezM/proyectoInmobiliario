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
