"use client";

import { useState } from "react";

export function EditorRiesgo({
  titulo,
  definicion,
  componentesActuales,
  scoreActual,
  nivelActual,
  onGuardar,
}: {
  titulo: string;
  definicion: { clave: string; etiqueta: string; peso: number }[];
  componentesActuales: Record<string, number> | null;
  scoreActual: number | null;
  nivelActual: string | null;
  onGuardar: (componentes: Record<string, number>) => Promise<void>;
}) {
  const [componentes, setComponentes] = useState<Record<string, number>>(
    componentesActuales ?? Object.fromEntries(definicion.map((d) => [d.clave, 50]))
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setError(null);
    setGuardando(true);
    try {
      await onGuardar(componentes);
    } catch {
      setError("No pudimos guardar el score de riesgo.");
    } finally {
      setGuardando(false);
    }
  }

  const colorNivel: Record<string, string> = {
    "Bajo riesgo": "text-emerald-600", "Riesgo moderado": "text-sky-600",
    "Riesgo alto": "text-amber-600", "Riesgo crítico": "text-rose-600",
  };

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-ink-900">{titulo}</h2>
        {scoreActual != null && (
          <span className={`text-sm font-semibold ${colorNivel[nivelActual ?? ""] ?? "text-ink-500"}`}>
            {scoreActual} / 1000 · {nivelActual}
          </span>
        )}
      </div>
      <p className="mb-4 text-xs text-ink-500">
        Cada componente se evalúa manualmente de 0 a 100 (verificación documental del analista).
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {definicion.map((d) => (
          <div key={d.clave}>
            <label className="text-xs text-ink-500">
              {d.etiqueta} <span className="text-ink-300">({d.peso}%)</span>
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={componentes[d.clave] ?? 0}
              onChange={(e) => setComponentes({ ...componentes, [d.clave]: Number(e.target.value) })}
              className="input-field"
            />
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      <button type="button" onClick={guardar} disabled={guardando} className="btn-secondary mt-4">
        {guardando ? "Guardando..." : "Guardar score de riesgo"}
      </button>
    </div>
  );
}
