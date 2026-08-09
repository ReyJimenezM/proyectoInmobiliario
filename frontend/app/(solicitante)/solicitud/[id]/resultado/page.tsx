"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { obtenerResultadoSolicitud } from "@/lib/api";
import { estaAutenticado } from "@/lib/auth";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import type { ResultadoSolicitudOut } from "@/lib/types";

interface PageProps {
  params: { id: string };
}

const CONFIG_ESTADO: Record<string, { icono: string; titulo: string; bg: string; texto: string }> = {
  aprobada: {
    icono: "✓",
    titulo: "¡Buenas noticias! Tu solicitud fue aprobada",
    bg: "from-emerald-800 to-emerald-500",
    texto: "Un asesor te contactará para coordinar los siguientes pasos.",
  },
  revision_manual: {
    icono: "⏳",
    titulo: "Tu solicitud está en revisión",
    bg: "from-amber-700 to-amber-500",
    texto: "Estamos revisando tu caso con calma. Te contamos el resultado en menos de 24 horas hábiles.",
  },
  rechazada: {
    icono: "✕",
    titulo: "Por ahora no pudimos aprobar tu solicitud",
    bg: "from-rose-800 to-rose-500",
    texto: "Queremos que sepas exactamente por qué. Puedes intentar con un codeudor o hablar con nuestro equipo.",
  },
  con_ruta_alterna: {
    icono: "↗",
    titulo: "Tu solicitud tiene una ruta alternativa",
    bg: "from-sky-700 to-sky-500",
    texto: "No alcanzaste la aprobación directa, pero hay opciones viables para ti.",
  },
};

const NOMBRES_GRUPO: Record<string, string> = {
  capacidad: "Capacidad de pago",
  estabilidad: "Estabilidad",
  endeudamiento: "Endeudamiento",
  verificabilidad: "Verificabilidad",
  historial: "Historial",
  fraude: "Antifraude",
  compatibilidad_arrendatario_inmueble: "Compatibilidad arrendatario–inmueble",
};

const NOMBRES_SUGERENCIA: Record<string, string> = {
  agregar_codeudor: "Agregar codeudor a mi solicitud",
  tomar_poliza: "Tomar póliza de arrendamiento",
};

function nivelScore(score: number, max: number) {
  const ratio = score / max;
  if (ratio >= 0.78) return { label: "Bajo riesgo", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (ratio >= 0.68) return { label: "Riesgo moderado", color: "text-sky-600", bg: "bg-sky-50" };
  if (ratio >= 0.56) return { label: "Riesgo alto", color: "text-amber-600", bg: "bg-amber-50" };
  return { label: "Riesgo crítico", color: "text-rose-600", bg: "bg-rose-50" };
}

export default function ResultadoSolicitudPage({ params }: PageProps) {
  const router = useRouter();
  const [resultado, setResultado] = useState<ResultadoSolicitudOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!estaAutenticado()) {
      router.push(`/login?destino=${encodeURIComponent(`/solicitud/${params.id}/resultado`)}`);
      return;
    }
    obtenerResultadoSolicitud(params.id)
      .then(setResultado)
      .catch(() => setError("No pudimos cargar el resultado de tu solicitud."));
  }, [params.id, router]);

  if (error) return <p className="mx-auto max-w-2xl px-4 py-16 text-center text-rose-600">{error}</p>;
  if (!resultado) return <p className="mx-auto max-w-2xl px-4 py-16 text-center text-ink-500">Cargando resultado...</p>;

  const config = resultado.decision ? CONFIG_ESTADO[resultado.decision] : null;
  const nivel = resultado.score != null ? nivelScore(resultado.score, resultado.escala_maxima) : null;
  const variablesSinMatch = resultado.variables_evaluadas.filter(
    (v) => v.nombre !== "compatibilidad_arrendatario_inmueble"
  );
  const matchVar = resultado.variables_evaluadas.find(
    (v) => v.nombre === "compatibilidad_arrendatario_inmueble"
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Hero */}
      {config && (
        <div className={`rounded-2xl bg-gradient-to-br ${config.bg} p-8 text-center text-white sm:p-12`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
            {config.icono}
          </div>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{config.titulo}</h1>
          <p className="mx-auto mt-3 max-w-md text-white/80">{config.texto}</p>
        </div>
      )}

      {/* Score + Gauge */}
      {resultado.score != null && (
        <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          <ScoreGauge score={resultado.score} maxScore={resultado.escala_maxima} size={160} />
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold uppercase tracking-wider text-ink-400">Score de riesgo</p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-ink-900">
              {Math.round(resultado.score)}{" "}
              <span className="text-lg font-medium text-ink-400">/ {resultado.escala_maxima}</span>
            </p>
            {nivel && (
              <span className={`mt-2 inline-block rounded-full ${nivel.bg} px-3 py-1 text-xs font-semibold ${nivel.color}`}>
                {nivel.label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Explicación */}
      {resultado.explicacion && (
        <div className="mt-8 rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">¿Por qué esta decisión?</h2>
          <p className="mt-2 leading-relaxed text-ink-700">{resultado.explicacion}</p>
        </div>
      )}

      {/* Variables evaluadas (factores) */}
      {variablesSinMatch.length > 0 && (
        <div className="mt-8 rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">Factores de la evaluación</h2>
          <div className="space-y-4">
            {variablesSinMatch.map((v) => {
              const pctScore = v.puntaje_obtenido != null ? v.puntaje_obtenido : 0;
              const barColor =
                pctScore >= 78 ? "bg-emerald-500" : pctScore >= 55 ? "bg-sky-500" : pctScore >= 40 ? "bg-amber-500" : "bg-rose-500";
              return (
                <div key={v.nombre}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-800">{NOMBRES_GRUPO[v.nombre] ?? v.nombre}</span>
                    <span className="font-semibold text-ink-600">
                      {v.banda && <span className="mr-2 rounded bg-ink-50 px-2 py-0.5 text-xs">{v.banda}</span>}
                      {Math.round(v.peso * 100)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pctScore}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match Risk */}
      {matchVar && (
        <div className="mt-6 rounded-xl border-2 border-sky-200 bg-sky-50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <path d="M4 11L12 4l8 7" /><path d="M6.5 10v9h11v-9" /><path d="M10 19v-5h4v5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-sky-800">
                Compatibilidad arrendatario–inmueble: {matchVar.banda}
              </p>
              <p className="text-sm text-sky-600">
                Puntaje: {Math.round(matchVar.puntaje_obtenido ?? 0)} / 100
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ruta alterna */}
      {resultado.ruta_alterna_disponible && resultado.ruta_alterna_sugerencias.length > 0 && (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-3 text-sm font-semibold text-amber-800">Opciones disponibles para fortalecer tu solicitud</h2>
          <div className="space-y-2">
            {resultado.ruta_alterna_sugerencias.map((sugerencia) => (
              <button key={sugerencia} type="button" className="btn-secondary w-full text-sm">
                {NOMBRES_SUGERENCIA[sugerencia] ?? sugerencia}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Volver */}
      <div className="mt-8 text-center">
        <button type="button" onClick={() => router.push("/")} className="btn-secondary">
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
