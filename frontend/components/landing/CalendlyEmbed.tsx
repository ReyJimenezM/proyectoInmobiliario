"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Widget embebido de Calendly.
 *
 * El script pesa y solo hace falta cuando la persona ya llenó el formulario, así que se
 * carga bajo demanda (al montar este componente) en vez de en el `<head>` de la landing.
 * Eso mantiene el primer render de la página sin JavaScript de terceros.
 */

const SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js";
const CSS_HREF = "https://assets.calendly.com/assets/external/widget.css";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (opciones: {
        url: string;
        parentElement: HTMLElement;
        prefill?: Record<string, unknown>;
        utm?: Record<string, string>;
      }) => void;
    };
  }
}

export const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? "";

/**
 * El prefill se arma en la URL y no solo con la opción `prefill` del script: la versión
 * actual de widget.js no traslada esos valores al iframe, y Calendly sí soporta
 * `?name=&email=&a1=` de forma nativa. Así la persona no vuelve a escribir sus datos.
 */
function construirUrl({ nombre, correo, telefono }: { nombre?: string; correo?: string; telefono?: string }): string {
  if (!CALENDLY_URL) return "";
  const [base, consulta = ""] = CALENDLY_URL.split("?");
  const params = new URLSearchParams(consulta);
  params.set("hide_gdpr_banner", "1");
  params.set("hide_landing_page_details", "1");
  params.set("primary_color", "d5762f");
  if (nombre) params.set("name", nombre);
  if (correo) params.set("email", correo);
  if (telefono) params.set("a1", telefono);
  return `${base}?${params.toString()}`;
}

let promesaScript: Promise<void> | null = null;

function cargarCalendly(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Calendly) return Promise.resolve();
  if (promesaScript) return promesaScript;

  promesaScript = new Promise<void>((resolver, rechazar) => {
    if (!document.querySelector(`link[href="${CSS_HREF}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CSS_HREF;
      document.head.appendChild(link);
    }

    const existente = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existente) {
      existente.addEventListener("load", () => resolver());
      existente.addEventListener("error", () => rechazar(new Error("No se pudo cargar Calendly")));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolver();
    script.onerror = () => {
      promesaScript = null;
      rechazar(new Error("No se pudo cargar Calendly"));
    };
    document.head.appendChild(script);
  });

  return promesaScript;
}

function esEventoCalendly(evento: MessageEvent): boolean {
  return (
    typeof evento.origin === "string" &&
    evento.origin.includes("calendly.com") &&
    typeof evento.data === "object" &&
    evento.data !== null &&
    typeof (evento.data as { event?: unknown }).event === "string" &&
    (evento.data as { event: string }).event.startsWith("calendly.")
  );
}

type Props = {
  nombre?: string;
  correo?: string;
  telefono?: string;
  /** Se dispara cuando Calendly confirma que la reunión quedó agendada. */
  onAgendado?: () => void;
};

export function CalendlyEmbed({ nombre, correo, telefono, onAgendado }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const alAgendar = useRef(onAgendado);
  alAgendar.current = onAgendado;

  useEffect(() => {
    let cancelado = false;

    cargarCalendly()
      .then(() => {
        if (cancelado || !contenedor.current || !window.Calendly) return;
        // El widget se pinta dentro del contenedor; se limpia primero por si React
        // remonta el efecto (StrictMode en desarrollo lo hace dos veces).
        contenedor.current.innerHTML = "";
        window.Calendly.initInlineWidget({
          url: construirUrl({ nombre, correo, telefono }),
          parentElement: contenedor.current,
          prefill: {
            name: nombre ?? "",
            email: correo ?? "",
            customAnswers: telefono ? { a1: telefono } : undefined,
          },
        });
        setEstado("listo");
      })
      .catch(() => {
        if (!cancelado) setEstado("error");
      });

    return () => {
      cancelado = true;
    };
  }, [nombre, correo, telefono]);

  useEffect(() => {
    function manejar(evento: MessageEvent) {
      if (!esEventoCalendly(evento)) return;
      if ((evento.data as { event: string }).event === "calendly.event_scheduled") {
        alAgendar.current?.();
      }
    }
    window.addEventListener("message", manejar);
    return () => window.removeEventListener("message", manejar);
  }, []);

  if (estado === "error") {
    return (
      <div className="rounded-xl2 border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold">No pudimos cargar el calendario.</p>
        <p className="mt-1">
          Tus datos ya quedaron registrados y te contactamos igual. Si prefieres agendar tú,{" "}
          <a href={CALENDLY_URL} target="_blank" rel="noreferrer" className="font-semibold underline">
            abre el calendario en una pestaña nueva
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {estado === "cargando" && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl2 bg-sand-100">
          <p className="text-sm text-ink-500">Cargando el calendario…</p>
        </div>
      )}
      <div
        ref={contenedor}
        className="min-h-[680px] overflow-hidden rounded-xl2"
        aria-label="Calendario de agendamiento"
      />
    </div>
  );
}
