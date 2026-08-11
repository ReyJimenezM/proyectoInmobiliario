import { z } from "zod";

/**
 * Contrato del lead de la landing. Vive en `lib/` porque lo usan las dos puntas:
 * el formulario del navegador (para validar antes de enviar) y el route handler
 * `app/api/leads/route.ts` (para no confiar en lo que llega del navegador).
 */

export const PERFILES_LEAD = ["inmobiliaria", "persona"] as const;
export type PerfilLead = (typeof PERFILES_LEAD)[number];

export const RANGOS_INMUEBLES = [
  "1 - 20",
  "21 - 100",
  "101 - 500",
  "501 - 2.000",
  "Más de 2.000",
] as const;

export const INTERESES_PERSONA = [
  "Tomar un inmueble en arriendo",
  "Comprar vivienda con crédito",
  "Poner mi inmueble en arriendo",
  "Solo quiero saber si califico",
] as const;

const telefonoColombiano = /^[0-9+\s()-]{7,20}$/;

export const leadSchema = z.object({
  perfil: z.enum(PERFILES_LEAD),
  nombre: z.string().trim().min(3, "Escribe tu nombre completo").max(120),
  correo: z.string().trim().toLowerCase().email("Revisa el correo").max(160),
  telefono: z
    .string()
    .trim()
    .regex(telefonoColombiano, "Escribe un teléfono válido (solo números, + y espacios)"),
  empresa: z.string().trim().max(140).optional().or(z.literal("")),
  ciudad: z.string().trim().max(80).optional().or(z.literal("")),
  inmuebles: z.enum(RANGOS_INMUEBLES).optional(),
  interes: z.string().trim().max(160).optional().or(z.literal("")),
  mensaje: z.string().trim().max(1000).optional().or(z.literal("")),
  acepta_datos: z.literal(true, {
    errorMap: () => ({ message: "Necesitamos tu autorización para contactarte" }),
  }),
  origen: z.string().trim().max(60).default("landing"),
  utm_source: z.string().trim().max(80).optional(),
  utm_medium: z.string().trim().max(80).optional(),
  utm_campaign: z.string().trim().max(120).optional(),
  pagina: z.string().trim().max(300).optional(),
  // Honeypot: los bots llenan todo lo que ven; una persona nunca ve este campo.
  sitio_web: z.string().max(0).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;

/** Evento posterior al lead (por ahora, "agendó en Calendly"). */
export const eventoLeadSchema = z.object({
  lead_id: z.string().trim().min(1).max(60),
  evento: z.enum(["agendado"]),
  detalle: z.string().trim().max(500).optional(),
});

export type EventoLeadInput = z.infer<typeof eventoLeadSchema>;

/** Errores por campo, con la forma que consume el formulario. */
export type ErroresLead = Partial<Record<keyof LeadInput, string>>;

export function erroresDesdeZod(error: z.ZodError): ErroresLead {
  const salida: ErroresLead = {};
  for (const issue of error.issues) {
    const campo = issue.path[0] as keyof LeadInput | undefined;
    if (campo && !salida[campo]) salida[campo] = issue.message;
  }
  return salida;
}
