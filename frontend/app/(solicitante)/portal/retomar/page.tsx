"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerSolicitud } from "@/lib/api";
import { estaAutenticado } from "@/lib/auth";

export default function RetomarSolicitudPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const codigoLimpio = codigo.trim();
    if (!codigoLimpio) return;

    if (!estaAutenticado()) {
      router.push(`/login?destino=${encodeURIComponent("/portal/retomar")}`);
      return;
    }

    setCargando(true);
    try {
      // TODO: reemplazar por un endpoint dedicado de búsqueda por código de seguimiento
      // (p. ej. GET /api/solicitudes/por-codigo/{codigo}) cuando el backend lo exponga.
      // Por ahora asumimos que el código de solicitud es el id de la solicitud.
      const solicitud = await obtenerSolicitud(codigoLimpio);

      if (solicitud.estado !== "borrador") {
        setError("Esta solicitud ya fue enviada. Consulta su estado en 'Ver cómo va mi estudio'.");
        return;
      }

      router.push(`/solicitud/${solicitud.id}/paso/1`);
    } catch {
      setError("No encontramos una solicitud en borrador con ese código. Verifica e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Retomar mi solicitud</h1>
      <p className="mt-2 text-sm text-ink-500">
        Ingresa el código de tu solicitud en borrador y te llevamos directo a donde la dejaste.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5">
        <div>
          <label htmlFor="codigo-solicitud" className="block text-sm font-semibold text-ink-700">
            Código de solicitud
          </label>
          <input
            id="codigo-solicitud"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
            placeholder="Ej. SOL-2026-00123"
            className="mt-1.5 w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-clay-400 focus:ring-2 focus:ring-clay-100"
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-full bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cargando ? "Buscando..." : "Retomar"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>
      )}
    </div>
  );
}
