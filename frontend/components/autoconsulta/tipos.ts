import type { ErroresPaso, EstadoAutoconsulta } from "@/lib/autoconsulta";

/** Contrato común de todos los pasos del asistente de autoconsulta. */
export interface PropsPaso {
  estado: EstadoAutoconsulta;
  actualizar: (cambios: Partial<EstadoAutoconsulta>) => void;
  errores: ErroresPaso;
}
