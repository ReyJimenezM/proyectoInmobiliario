import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { eventoLeadSchema, erroresDesdeZod, leadSchema, type LeadInput } from "@/lib/leads";

/**
 * Recepción de leads de la landing.
 *
 * Escribe a tres destinos y le basta con que uno funcione para dar el lead por recibido:
 *  - El backend (`POST /api/leads`), que es el que alimenta el módulo `/admin/leads`.
 *  - `LEADS_WEBHOOK_URL` (opcional): CRM externo, Zapier/Make, n8n...
 *  - Archivo JSONL (`LEADS_FILE`, por defecto `storage/leads/leads.jsonl`): red de seguridad
 *    local. Cada registro guarda `backend_ok`, así que los leads que no llegaron a la base
 *    de datos se pueden identificar y reenviar.
 *
 * El route handler existe, y no se llama al backend directo desde el navegador, justamente
 * para eso: si el backend está caído la landing sigue capturando en vez de perder el lead.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARCHIVO_LEADS = process.env.LEADS_FILE ?? join(process.cwd(), "storage", "leads", "leads.jsonl");
const WEBHOOK = process.env.LEADS_WEBHOOK_URL;
// Este código corre en el servidor de Next, así que usa la URL interna cuando existe
// (en Docker el navegador y el servidor no resuelven "backend" igual).
const BACKEND = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TIEMPO_LIMITE_MS = 8_000;

// Límite simple por IP en memoria. No sobrevive a un reinicio ni se comparte entre
// instancias; es un freno contra el bot casual, no un WAF. El backend tiene el suyo.
const VENTANA_MS = 60_000;
const MAX_POR_VENTANA = 5;
const golpes = new Map<string, number[]>();

function excedeLimite(ip: string): boolean {
  const ahora = Date.now();
  const previos = (golpes.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  previos.push(ahora);
  golpes.set(ip, previos);
  if (golpes.size > 5_000) golpes.clear(); // techo de memoria
  return previos.length > MAX_POR_VENTANA;
}

function ipDe(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "desconocida";
}

async function guardarEnArchivo(registro: Record<string, unknown>): Promise<boolean> {
  try {
    await mkdir(dirname(ARCHIVO_LEADS), { recursive: true });
    await appendFile(ARCHIVO_LEADS, `${JSON.stringify(registro)}\n`, "utf8");
    return true;
  } catch (error) {
    console.error("[leads] no se pudo escribir el archivo", error);
    return false;
  }
}

async function enviarAWebhook(registro: Record<string, unknown>): Promise<boolean> {
  if (!WEBHOOK) return false;
  try {
    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registro),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
    if (!res.ok) console.error("[leads] webhook respondió", res.status);
    return res.ok;
  } catch (error) {
    console.error("[leads] webhook falló", error);
    return false;
  }
}

type LeadEnBackend = { id: string; codigo: string };

/** Crea el lead en el backend, que es de donde lo lee el CRM. */
async function enviarAlBackend(
  lead: Omit<LeadInput, "sitio_web" | "acepta_datos">,
  ip: string,
  userAgent: string
): Promise<LeadEnBackend | null> {
  try {
    const res = await fetch(`${BACKEND}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // El backend registra la IP de origen del lead; sin esto vería la del servidor de Next.
        "X-Forwarded-For": ip,
        "User-Agent": userAgent,
      },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
    if (!res.ok) {
      console.error("[leads] el backend rechazó el lead", res.status, await res.text());
      return null;
    }
    return (await res.json()) as LeadEnBackend;
  } catch (error) {
    console.error("[leads] no se pudo contactar al backend", error);
    return null;
  }
}

async function marcarAgendadoEnBackend(leadId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND}/api/leads/${encodeURIComponent(leadId)}/agendado`, {
      method: "POST",
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
    return res.ok;
  } catch (error) {
    console.error("[leads] no se pudo marcar el agendamiento", error);
    return false;
  }
}

export async function POST(request: Request) {
  const ip = ipDe(request);
  if (excedeLimite(ip)) {
    return Response.json({ ok: false, error: "Demasiados envíos seguidos. Intenta en un minuto." }, { status: 429 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") ?? "";

  // Evento de agendamiento: llega después del lead, cuando Calendly confirma la reunión.
  if (cuerpo && typeof cuerpo === "object" && "evento" in cuerpo) {
    const evento = eventoLeadSchema.safeParse(cuerpo);
    if (!evento.success) {
      return Response.json({ ok: false, error: "Evento inválido" }, { status: 400 });
    }
    const enBackend = await marcarAgendadoEnBackend(evento.data.lead_id);
    await Promise.all([
      guardarEnArchivo({
        tipo: "evento",
        ...evento.data,
        backend_ok: enBackend,
        creado_en: new Date().toISOString(),
      }),
      enviarAWebhook({ tipo: "evento", ...evento.data, creado_en: new Date().toISOString() }),
    ]);
    return Response.json({ ok: true });
  }

  const parseado = leadSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return Response.json({ ok: false, errores: erroresDesdeZod(parseado.error) }, { status: 422 });
  }

  const { sitio_web, acepta_datos, ...lead } = parseado.data;
  // Honeypot lleno: es un bot. Se responde 200 para no darle señal de que fue detectado.
  if (sitio_web) return Response.json({ ok: true, id: `LD-${randomUUID().slice(0, 8).toUpperCase()}` });

  const enBackend = await enviarAlBackend(lead, ip, userAgent);
  // Sin backend el lead no se pierde: se queda en el archivo con su propio radicado y
  // `backend_ok: false`, listo para reenviarse cuando el servicio vuelva.
  const codigo = enBackend?.codigo ?? `LD-${randomUUID().slice(0, 8).toUpperCase()}`;

  const registro = {
    tipo: "lead",
    id: enBackend?.id ?? null,
    codigo,
    backend_ok: enBackend !== null,
    ...lead,
    acepta_datos,
    estado: "nuevo",
    ip,
    user_agent: userAgent,
    creado_en: new Date().toISOString(),
  };

  const [enArchivo, enWebhook] = await Promise.all([guardarEnArchivo(registro), enviarAWebhook(registro)]);
  if (!enBackend && !enArchivo && !enWebhook) {
    return Response.json(
      { ok: false, error: "No pudimos registrar tus datos. Escríbenos por WhatsApp y lo resolvemos." },
      { status: 500 }
    );
  }

  // `id` es el radicado que se le muestra a la persona; `uuid` solo lo usa el evento de
  // agendamiento y es null si el backend no respondió.
  return Response.json({ ok: true, id: codigo, uuid: enBackend?.id ?? null });
}
