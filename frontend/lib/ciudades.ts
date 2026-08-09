export const CIUDADES_POR_SLUG: Record<string, string> = {
  bogota: "Bogotá",
  medellin: "Medellín",
  cali: "Cali",
  barranquilla: "Barranquilla",
  cartagena: "Cartagena",
};

export function nombreCiudadDesdeSlug(slug: string): string {
  return CIUDADES_POR_SLUG[slug] ?? slug;
}
