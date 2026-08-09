"use client";

import { useEffect, useState } from "react";
import { actualizarRiesgoAnunciante, listarAnunciantesAdmin } from "@/lib/api";
import { OWNER_COMPS, type Anunciante } from "@/lib/types";
import { EditorRiesgo } from "@/components/admin/EditorRiesgo";

const ETIQUETAS_TIPO: Record<string, string> = {
  particular: "Particular", inmobiliaria: "Inmobiliaria", constructora: "Constructora",
};

const COLOR_NIVEL: Record<string, string> = {
  "Bajo riesgo": "bg-emerald-50 text-emerald-700", "Riesgo moderado": "bg-sky-50 text-sky-700",
  "Riesgo alto": "bg-amber-50 text-amber-700", "Riesgo crítico": "bg-rose-50 text-rose-700",
};

export default function AnunciantesPage() {
  const [anunciantes, setAnunciantes] = useState<Anunciante[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    listarAnunciantesAdmin()
      .then(setAnunciantes)
      .catch(() => setError("No pudimos cargar los anunciantes."));
  }

  useEffect(cargar, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Anunciantes</h1>
        <p className="mt-1 text-sm text-ink-500">
          Propietarios, inmobiliarias y constructoras que publican propiedades en tu vitrina.
        </p>
      </div>

      {error && <p className="text-rose-600">{error}</p>}

      <div className="space-y-2">
        {anunciantes.map((a) => (
          <div key={a.id} className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-ink-800">{a.nombre}</p>
                <p className="text-xs text-ink-500">
                  {ETIQUETAS_TIPO[a.tipo] ?? a.tipo} · {a.telefono_contacto ?? "sin teléfono"} · {a.email ?? "sin email"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {a.score_riesgo != null && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_NIVEL[a.nivel_riesgo ?? ""] ?? "bg-ink-100 text-ink-500"}`}>
                    {a.score_riesgo}/1000 · {a.nivel_riesgo}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setExpandido(expandido === a.id ? null : a.id)}
                  className="text-xs font-semibold text-clay-600"
                >
                  {expandido === a.id ? "Ocultar" : "Evaluar riesgo"}
                </button>
              </div>
            </div>
            {expandido === a.id && (
              <div className="border-t border-ink-100 p-4">
                <EditorRiesgo
                  titulo="Score de riesgo del propietario"
                  definicion={OWNER_COMPS}
                  componentesActuales={a.componentes_riesgo}
                  scoreActual={a.score_riesgo}
                  nivelActual={a.nivel_riesgo}
                  onGuardar={async (componentes) => {
                    await actualizarRiesgoAnunciante(a.id, componentes);
                    cargar();
                  }}
                />
              </div>
            )}
          </div>
        ))}
        {anunciantes.length === 0 && <p className="text-ink-400">Sin anunciantes registrados.</p>}
      </div>
    </div>
  );
}
