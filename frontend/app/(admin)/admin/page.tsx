"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { obtenerDashboard } from "@/lib/api";
import { formatoPorcentaje } from "@/lib/format";
import type { DashboardOut } from "@/lib/types";

const ETIQUETAS_ESTADO: Record<string, { label: string; color: string }> = {
  borrador: { label: "Borrador", color: "bg-ink-300" },
  enviada: { label: "Enviada", color: "bg-sky-500" },
  en_evaluacion: { label: "En evaluación", color: "bg-purple-500" },
  revision_manual: { label: "Revisión manual", color: "bg-amber-500" },
  aprobada: { label: "Aprobada", color: "bg-emerald-500" },
  rechazada: { label: "Rechazada", color: "bg-rose-500" },
  con_ruta_alterna: { label: "Con ruta alterna", color: "bg-sky-400" },
};

function KPI({ titulo, valor, subtitulo, acento }: { titulo: string; valor: string; subtitulo?: string; acento?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-ink-100 bg-white p-5 shadow-sm ${acento ? "border-l-4 border-l-clay-600" : ""}`}>
      <p className="text-sm font-semibold text-ink-500">{titulo}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-ink-900">{valor}</p>
      {subtitulo && <p className="mt-1 text-sm text-ink-400">{subtitulo}</p>}
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const r = 60;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width="150" height="150" style={{ transform: "rotate(-90deg)" }}>
        {data.map((d) => {
          const frac = d.value / total;
          const seg = (
            <circle
              key={d.label}
              cx="75"
              cy="75"
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="16"
              strokeDasharray={`${c * frac} ${c}`}
              strokeDashoffset={-offset * c}
            />
          );
          offset += frac;
          return seg;
        })}
      </svg>
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: d.color }} />
            <span className="text-ink-600">{d.label}</span>
            <span className="ml-auto font-semibold text-ink-800">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const COLORES_ESTADO: Record<string, string> = {
  borrador: "#A8A29E",
  enviada: "#0369A1",
  en_evaluacion: "#7E4A9E",
  revision_manual: "#B45309",
  aprobada: "#15803D",
  rechazada: "#BC2C22",
  con_ruta_alterna: "#0284C7",
};

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerDashboard()
      .then(setDashboard)
      .catch(() => setError("No pudimos cargar las métricas."));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!dashboard)
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-ink-100" />
        ))}
      </div>
    );

  const maxCantidadScore = Math.max(1, ...dashboard.distribucion_scores.map((d) => d.cantidad));

  const donutData = dashboard.solicitudes_por_estado.map((m) => ({
    label: ETIQUETAS_ESTADO[m.estado]?.label ?? m.estado,
    value: m.cantidad,
    color: COLORES_ESTADO[m.estado] ?? "#A8A29E",
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">Vista general de la operación de riesgo inmobiliario</p>
        </div>
        <Link href="/admin/pipeline" className="btn-primary text-sm">
          Ver pipeline completo
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI titulo="Total de solicitudes" valor={String(dashboard.total_solicitudes)} acento />
        <KPI titulo="Tasa de aprobación" valor={formatoPorcentaje(dashboard.tasa_aprobacion)} subtitulo="Sobre solicitudes evaluadas" />
        <KPI
          titulo="Tiempo promedio"
          valor={dashboard.tiempo_promedio_evaluacion_horas != null ? `${dashboard.tiempo_promedio_evaluacion_horas} h` : "—"}
          subtitulo="De evaluación"
        />
        <KPI titulo="En revisión activa" valor={String(dashboard.solicitudes_por_estado.filter((m) => ["enviada", "en_evaluacion", "revision_manual"].includes(m.estado)).reduce((s, m) => s + m.cantidad, 0))} subtitulo="Requieren atención" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Distribución por estado */}
        <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-ink-500">Solicitudes por estado</h2>
          <DonutChart data={donutData} />
        </div>

        {/* Distribución de scores */}
        <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-ink-500">Distribución de scores</h2>
          <div className="space-y-3">
            {dashboard.distribucion_scores.map((d) => {
              const barColor =
                d.rango.includes("800") || d.rango.includes("900")
                  ? "bg-emerald-500"
                  : d.rango.includes("600") || d.rango.includes("700")
                    ? "bg-sky-500"
                    : d.rango.includes("400") || d.rango.includes("500")
                      ? "bg-amber-500"
                      : "bg-rose-500";
              return (
                <div key={d.rango}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-ink-600">{d.rango}</span>
                    <span className="text-sm font-bold text-ink-800">{d.cantidad}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${(d.cantidad / maxCantidadScore) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/admin/motor" className="group flex gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-sm transition hover:border-clay-300 hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-clay-50 text-clay-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-800 group-hover:text-clay-700">Motor de decisión</p>
            <p className="text-xs text-ink-400">Reglas, umbrales y versiones</p>
          </div>
        </Link>
        <Link href="/admin/propiedades" className="group flex gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-sm transition hover:border-clay-300 hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10 21v-3h4v3"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-800 group-hover:text-emerald-700">Propiedades</p>
            <p className="text-xs text-ink-400">Gestionar vitrina e imágenes</p>
          </div>
        </Link>
        <Link href="/admin/auditoria" className="group flex gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-sm transition hover:border-clay-300 hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v4h4"/><path d="M12 8v4.5l3 1.8"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-800 group-hover:text-purple-700">Auditoría</p>
            <p className="text-xs text-ink-400">Trazabilidad completa</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
