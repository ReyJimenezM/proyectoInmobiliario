"use client";

import { useState } from "react";
import { consultarEstado } from "@/lib/api";

interface EventoEstado {
  estado: string;
  fecha: string;
  descripcion?: string;
}

interface EstadoConsultado {
  codigo: string;
  estado: string;
  creado_en: string;
  historial: EventoEstado[];
  documentos_pendientes?: string[];
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  en_evaluacion: "En evaluación",
  revision_manual: "En revisión manual",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  con_ruta_alterna: "Ruta alterna disponible",
};

const COLORES_ESTADO: Record<string, string> = {
  borrador: "bg-ink-100 text-ink-700 ring-ink-200",
  enviada: "bg-sky-50 text-sky-700 ring-sky-200",
  en_evaluacion: "bg-amber-50 text-amber-700 ring-amber-200",
  revision_manual: "bg-amber-50 text-amber-700 ring-amber-200",
  aprobada: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rechazada: "bg-rose-50 text-rose-700 ring-rose-200",
  con_ruta_alterna: "bg-clay-50 text-clay-700 ring-clay-200",
};

function formatearFecha(fecha: string): string {
  try {
    return new Date(fecha).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return fecha;
  }
}

export default function EstadoSolicitudPage() {
  const [codigo, setCodigo] = useState("");
  const [documento, setDocumento] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<EstadoConsultado | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultado(null);
    setCargando(true);
    try {
      const datos = await consultarEstado(codigo.trim(), documento.trim());
      setResultado(datos);
    } catch {
      setError("No encontramos una solicitud con esos datos. Revisa el código y el documento e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-900">¿Cómo va mi estudio?</h1>
      <p className="mt-2 text-sm text-ink-500">
        Ingresa el código de seguimiento que te enviamos y tu número de documento para ver el estado de tu
        solicitud.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5">
        <div>
          <label htmlFor="codigo" className="block text-sm font-semibold text-ink-700">
            Código de seguimiento
          </label>
          <input
            id="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
            placeholder="Ej. SOL-2026-00123"
            className="mt-1.5 w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-clay-400 focus:ring-2 focus:ring-clay-100"
          />
        </div>

        <div>
          <label htmlFor="documento" className="block text-sm font-semibold text-ink-700">
            Número de documento
          </label>
          <input
            id="documento"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            required
            placeholder="Ej. 1020304050"
            className="mt-1.5 w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-clay-400 focus:ring-2 focus:ring-clay-100"
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-full bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cargando ? "Consultando..." : "Consultar estado"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>
      )}

      {resultado && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5">
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                COLORES_ESTADO[resultado.estado] ?? "bg-ink-100 text-ink-700 ring-ink-200"
              }`}
            >
              {ETIQUETAS_ESTADO[resultado.estado] ?? resultado.estado}
            </span>
            <span className="text-xs text-ink-400">Creada el {formatearFecha(resultado.creado_en)}</span>
          </div>

          {resultado.documentos_pendientes && resultado.documentos_pendientes.length > 0 && (
            <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
              Tienes {resultado.documentos_pendientes.length} documento(s) pendiente(s) por cargar:{" "}
              {resultado.documentos_pendientes.join(", ")}.
            </div>
          )}

          {resultado.historial && resultado.historial.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ink-700">Historial</h2>
              <ol className="mt-4 space-y-6 border-l border-ink-200 pl-5">
                {resultado.historial.map((evento, index) => (
                  <li key={index} className="relative">
                    <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white bg-clay-500 ring-1 ring-clay-200" />
                    <p className="text-sm font-semibold text-ink-900">
                      {ETIQUETAS_ESTADO[evento.estado] ?? evento.estado}
                    </p>
                    <p className="text-xs text-ink-400">{formatearFecha(evento.fecha)}</p>
                    {evento.descripcion && <p className="mt-1 text-sm text-ink-600">{evento.descripcion}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
