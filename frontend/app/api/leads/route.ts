import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { eventoLeadSchema, erroresDesdeZod, leadSchema } from "@/lib/leads";

/**
 * Recepción de leads de la landing.
 *
 * Escribe a dos destinos y le basta con que uno funcione para dar el lead por recibido:
 *  - `LEADS_WEBHOOK_URL` (opcional): CRM, Zapier/Make, n8n, un Google Sheet... lo que use
 *    la inmobiliaria. Si no está configurado, se omite sin ruido.
 *  - Archivo JSONL (`LEADS_FILE`, por defecto `storage/leads/leads.jsonl`): red de seguridad
 *    local para no perder nada mientras el CRM definitivo no esté conectado.
 *
 * No usa la base de datos del backend a propósito: la landing debe poder recibir leads
 * aunque el backend esté caído o todavía no exista la tabla.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARCHIVO_LEADS = process.env.LEADS_FILE ?? join(process.cwd(), "storage", "leads", "leads.jsonl");
const WEBHOOK = process.env.LEADS_WEBHOOK_URL;

// Límite simple por IP en memoria. No sobrevive a un reinicio ni se comparte entre
// instancias; es un freno contra el bot casual, no un WAF.
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
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) console.error("[leads] webhook respondió", res.status);
    return res.ok;
  } catch (error) {
    console.error("[leads] webhook falló", error);
    return false;
  }
}

async function persistir(registro: Record<string, unknown>): Promise<boolean> {
  const [archivo, webhook] = await Promise.all([guardarEnArchivo(registro), enviarAWebhook(registro)]);
  return archivo || webhook;
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

  // Evento de agendamiento: llega después del lead, cuando Calendly confirma la reunión.
  if (cuerpo && typeof cuerpo === "object" && "evento" in cuerpo) {
    const evento = eventoLeadSchema.safeParse(cuerpo);
    if (!evento.success) {
      return Response.json({ ok: false, error: "Evento inválido" }, { status: 400 });
    }
    await persistir({ tipo: "evento", ...evento.data, creado_en: new Date().toISOString() });
    return Response.json({ ok: true });
  }

  const parseado = leadSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return Response.json({ ok: false, errores: erroresDesdeZod(parseado.error) }, { status: 422 });
  }

  const { sitio_web, ...lead } = parseado.data;
  // Honeypot lleno: es un bot. Se responde 200 para no darle señal de que fue detectado.
  if (sitio_web) return Response.json({ ok: true, id: randomUUID() });

  const id = `LD-${randomUUID().slice(0, 8).toUpperCase()}`;
  const registro = {
    tipo: "lead",
    id,
    ...lead,
    estado: "nuevo",
    ip,
    user_agent: request.headers.get("user-agent") ?? "",
    creado_en: new Date().toISOString(),
  };

  const guardado = await persistir(registro);
  if (!guardado) {
    return Response.json(
      { ok: false, error: "No pudimos registrar tus datos. Escríbenos por WhatsApp y lo resolvemos." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, id });
}
