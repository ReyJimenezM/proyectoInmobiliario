"use client";

import { useEffect, useMemo, useState } from "react";
import { obtenerReportesAdmin } from "@/lib/api";
import { formatoPorcentaje } from "@/lib/format";

interface ReportesOut {
  solicitudes_por_estado: Record<string, number>;
  solicitudes_por_ciudad: { ciudad: string; total: number; aprobadas: number; rechazadas: number }[];
  solicitudes_por_mes: { mes: string; total: number }[];
  tiempo_promedio_evaluacion_horas: number | null;
  tasa_aprobacion: number;
  tasa_rechazo: number;
  top_razones_rechazo: { razon: string; count: number }[];
  solicitudes_por_analista: { analista: string; total: number; pendientes: number }[];
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  en_evaluacion: "En evaluación",
  revision_manual: "Revisión manual",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  con_ruta_alterna: "Con ruta alterna",
};

const COLORES_ESTADO: Record<string, string> = {
  borrador: "bg-ink-300",
  enviada: "bg-sky-500",
  en_evaluacion: "bg-purple-500",
  revision_manual: "bg-amber-500",
  aprobada: "bg-emerald-500",
  rechazada: "bg-rose-500",
  con_ruta_alterna: "bg-sky-400",
};

function KPI({ titulo, valor, subtitulo, color }: { titulo: string; valor: string; subtitulo?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-ink-500">{titulo}</p>
      <p className={`mt-1 text-3xl font-bold tracking-tight ${color ?? "text-ink-900"}`}>{valor}</p>
      {subtitulo && <p className="mt-1 text-sm text-ink-400">{subtitulo}</p>}
    </div>
  );
}

function BarraHorizontal({ label, valor, max, color }: { label: string; valor: number; max: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-ink-600">{label}</span>
        <span className="font-semibold text-ink-800">{valor}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${max > 0 ? (valor / max) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

function exportarCSV(nombre: string, filas: Record<string, unknown>[]) {
  if (filas.length === 0) return;
  const encabezados = Object.keys(filas[0]);
  const lineas = [
    encabezados.join(","),
    ...filas.map((f) => encabezados.map((h) => JSON.stringify(f[h] ?? "")).join(",")),
  ];
  const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportesAdminPage() {
  const [reportes, setReportes] = useState<ReportesOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerReportesAdmin()
      .then((r) => setReportes(r as ReportesOut))
      .catch(() => setError("No pudimos cargar los reportes."));
  }, []);

  const totalSolicitudes = useMemo(
    () => (reportes ? Object.values(reportes.solicitudes_por_estado).reduce((a, b) => a + b, 0) : 0),
    [reportes]
  );

  const maxMes = useMemo(
    () => Math.max(1, ...(reportes?.solicitudes_por_mes.map((m) => m.total) ?? [1])),
    [reportes]
  );
  const maxEstado = useMemo(
    () => Math.max(1, ...Object.values(reportes?.solicitudes_por_estado ?? {})),
    [reportes]
  );
  const maxRazon = useMemo(
    () => Math.max(1, ...(reportes?.top_razones_rechazo.map((r) => r.count) ?? [1])),
    [reportes]
  );

  function exportar() {
    if (!reportes) return;
    exportarCSV("reportes_solicitudes.csv", reportes.solicitudes_por_ciudad);
  }

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!reportes) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-ink-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Reportes</h1>
          <p className="mt-1 text-sm text-ink-500">Analítica de solicitudes, aprobaciones y desempeño operativo</p>
        </div>
        <button type="button" onClick={exportar} className="btn-secondary text-sm">
          Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI titulo="Total de solicitudes" valor={String(totalSolicitudes)} subtitulo="Acumulado histórico" />
        <KPI titulo="Tasa de aprobación" valor={formatoPorcentaje(reportes.tasa_aprobacion)} color="text-emerald-600" />
        <KPI titulo="Tasa de rechazo" valor={formatoPorcentaje(reportes.tasa_rechazo)} color="text-rose-600" />
        <KPI
          titulo="Tiempo promedio"
          valor={reportes.tiempo_promedio_evaluacion_horas != null ? `${reportes.tiempo_promedio_evaluacion_horas} h` : "—"}
          subtitulo="De evaluación"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Solicitudes por estado */}
        <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-ink-500">Solicitudes por estado</h2>
          <div className="space-y-3">
            {Object.entries(reportes.solicitudes_por_estado).map(([estado, cantidad]) => (
              <BarraHorizontal
                key={estado}
                label={ETIQUETAS_ESTADO[estado] ?? estado}
                valor={cantidad}
                max={maxEstado}
                color={COLORES_ESTADO[estado] ?? "bg-ink-400"}
              />
            ))}
            {Object.keys(reportes.solicitudes_por_estado).length === 0 && (
              <p className="text-sm text-ink-400">Sin datos disponibles.</p>
            )}
          </div>
        </div>

        {/* Top razones de rechazo */}
        <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-ink-500">Top razones de rechazo</h2>
          <div className="space-y-3">
            {reportes.top_razones_rechazo.map((r) => (
              <BarraHorizontal key={r.razon} label={r.razon || "Sin comentario"} valor={r.count} max={maxRazon} color="bg-rose-500" />
            ))}
            {reportes.top_razones_rechazo.length === 0 && (
              <p className="text-sm text-ink-400">No hay rechazos registrados todavía.</p>
            )}
          </div>
        </div>
      </div>

      {/* Solicitudes por mes */}
      <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-sm font-bold uppercase tracking-wider text-ink-500">Solicitudes por mes (últimos 6 meses)</h2>
        {reportes.solicitudes_por_mes.length === 0 ? (
          <p className="text-sm text-ink-400">Sin datos disponibles.</p>
        ) : (
          <div className="flex h-48 items-end gap-4">
            {reportes.solicitudes_por_mes.map((m) => (
              <div key={m.mes} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold text-ink-700">{m.total}</span>
                <div
                  className="w-full rounded-t-md bg-clay-500 transition-all"
                  style={{ height: `${Math.max(4, (m.total / maxMes) * 140)}px` }}
                />
                <span className="text-xs text-ink-400">{m.mes}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Solicitudes por ciudad */}
        <div className="card overflow-x-auto">
          <div className="border-b border-ink-100 px-5 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Solicitudes por ciudad</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2">Ciudad</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Aprobadas</th>
                <th className="px-4 py-2">Rechazadas</th>
                <th className="px-4 py-2">Tasa aprobación</th>
              </tr>
            </thead>
            <tbody>
              {reportes.solicitudes_por_ciudad.map((c) => (
                <tr key={c.ciudad} className="border-t border-ink-100">
                  <td className="px-4 py-2 font-medium text-ink-800">{c.ciudad}</td>
                  <td className="px-4 py-2">{c.total}</td>
                  <td className="px-4 py-2 text-emerald-600">{c.aprobadas}</td>
                  <td className="px-4 py-2 text-rose-600">{c.rechazadas}</td>
                  <td className="px-4 py-2 font-semibold text-ink-800">
                    {c.total > 0 ? formatoPorcentaje(c.aprobadas / c.total) : "—"}
                  </td>
                </tr>
              ))}
              {reportes.solicitudes_por_ciudad.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-400">
                    Sin datos disponibles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Solicitudes por analista */}
        <div className="card overflow-x-auto">
          <div className="border-b border-ink-100 px-5 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Solicitudes por analista</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2">Analista</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Pendientes</th>
              </tr>
            </thead>
            <tbody>
              {reportes.solicitudes_por_analista.map((a) => (
                <tr key={a.analista} className="border-t border-ink-100">
                  <td className="px-4 py-2 font-medium text-ink-800">{a.analista}</td>
                  <td className="px-4 py-2">{a.total}</td>
                  <td className="px-4 py-2 text-amber-600">{a.pendientes}</td>
                </tr>
              ))}
              {reportes.solicitudes_por_analista.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-ink-400">
                    No hay analistas con solicitudes asignadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
