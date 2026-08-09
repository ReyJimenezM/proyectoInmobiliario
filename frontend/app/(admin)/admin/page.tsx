"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listarSolicitudesAdmin, obtenerDashboard } from "@/lib/api";
import { formatoPorcentaje } from "@/lib/format";
import type { DashboardOut, SolicitudOut } from "@/lib/types";

const ETIQUETAS_ESTADO: Record<string, { label: string; color: string }> = {
  borrador: { label: "Borrador", color: "bg-ink-300" },
  enviada: { label: "Enviada", color: "bg-sky-500" },
  en_evaluacion: { label: "En evaluación", color: "bg-purple-500" },
  revision_manual: { label: "Revisión manual", color: "bg-amber-500" },
  aprobada: { label: "Aprobada", color: "bg-emerald-500" },
  rechazada: { label: "Rechazada", color: "bg-rose-500" },
  con_ruta_alterna: { label: "Con ruta alterna", color: "bg-sky-400" },
};

const COLORES_ESTADO: Record<string, string> = {
  borrador: "#A8A29E",
  enviada: "#0369A1",
  en_evaluacion: "#7E4A9E",
  revision_manual: "#B45309",
  aprobada: "#15803D",
  rechazada: "#BC2C22",
  con_ruta_alterna: "#0284C7",
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

function DonutChart({ data }: { data: { estado: string; label: string; value: number; color: string }[] }) {
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
          <Link
            key={d.label}
            href="/admin/pipeline"
            className="group flex items-center gap-2 rounded px-1 py-0.5 text-sm transition hover:bg-ink-50"
            title={`Ver ${d.label} en el pipeline`}
          >
            <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: d.color }} />
            <span className="text-ink-600 group-hover:text-ink-900">{d.label}</span>
            <span className="ml-auto font-semibold text-ink-800">{d.value}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  titulo,
  subtitulo,
  colorBg,
  colorText,
  icono,
}: {
  href: string;
  titulo: string;
  subtitulo: string;
  colorBg: string;
  colorText: string;
  icono: React.ReactNode;
}) {
  return (
    <Link href={href} className="group flex gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-sm transition hover:border-clay-300 hover:shadow-md">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorBg} ${colorText}`}>{icono}</div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-800 group-hover:text-clay-700">{titulo}</p>
        <p className="truncate text-xs text-ink-400">{subtitulo}</p>
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudOut[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerDashboard()
      .then(setDashboard)
      .catch(() => setError("No pudimos cargar las métricas."));
    listarSolicitudesAdmin()
      .then(setSolicitudes)
      .catch(() => {
        /* la actividad reciente y el desglose por ciudad son un extra —
           si no cargan no bloqueamos el resto del dashboard */
      });
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
    estado: m.estado,
    label: ETIQUETAS_ESTADO[m.estado]?.label ?? m.estado,
    value: m.cantidad,
    color: COLORES_ESTADO[m.estado] ?? "#A8A29E",
  }));

  // --- Desglose por ciudad: se deriva del listado de solicitudes porque el
  // endpoint de dashboard no expone esta dimensión todavía.
  const porCiudad = new Map<string, { total: number; aprobadas: number; rechazadas: number }>();
  for (const s of solicitudes) {
    const ciudad =
      (s.datos_personales as { ciudad_residencia?: string })?.ciudad_residencia?.trim() || "Sin ciudad";
    const actual = porCiudad.get(ciudad) ?? { total: 0, aprobadas: 0, rechazadas: 0 };
    actual.total += 1;
    if (s.estado === "aprobada") actual.aprobadas += 1;
    if (s.estado === "rechazada") actual.rechazadas += 1;
    porCiudad.set(ciudad, actual);
  }
  const filasCiudad = Array.from(porCiudad.entries())
    .map(([ciudad, m]) => ({ ciudad, ...m }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const recientes = [...solicitudes]
    .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">
            Vista general de la operación de riesgo inmobiliario · <span className="font-medium text-ink-600">Últimos 30 días</span>
          </p>
        </div>
        <Link href="/admin/pipeline" className="btn-primary text-sm">
          Ver pipeline completo
        </Link>
      </div>

      {/* KPIs — fila completa */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI titulo="Total de solicitudes" valor={String(dashboard.total_solicitudes)} acento />
        <KPI titulo="Tasa de aprobación" valor={formatoPorcentaje(dashboard.tasa_aprobacion)} subtitulo="Sobre solicitudes evaluadas" />
        <KPI
          titulo="Tiempo promedio"
          valor={dashboard.tiempo_promedio_evaluacion_horas != null ? `${dashboard.tiempo_promedio_evaluacion_horas} h` : "—"}
          subtitulo="De evaluación"
        />
        <KPI
          titulo="En revisión activa"
          valor={String(
            dashboard.solicitudes_por_estado
              .filter((m) => ["enviada", "en_evaluacion", "revision_manual"].includes(m.estado))
              .reduce((s, m) => s + m.cantidad, 0)
          )}
          subtitulo="Requieren atención"
        />
      </div>

      {/* Charts — 2 columnas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Solicitudes por estado</h2>
            <Link href="/admin/pipeline" className="text-xs font-semibold text-clay-600 hover:text-clay-700">
              Ver detalle →
            </Link>
          </div>
          <DonutChart data={donutData} />
        </div>

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
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: `${(d.cantidad / maxCantidadScore) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {dashboard.distribucion_scores.length === 0 && (
              <p className="text-sm text-ink-400">Aún no hay scores calculados.</p>
            )}
          </div>
        </div>
      </div>

      {/* Tablas — ciudad y actividad reciente */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
          <div className="border-b border-ink-100 px-6 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Solicitudes por ciudad</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-6 py-2">Ciudad</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">Aprobadas</th>
                  <th className="px-4 py-2 text-right">Rechazadas</th>
                </tr>
              </thead>
              <tbody>
                {filasCiudad.map((f) => (
                  <tr key={f.ciudad} className="border-t border-ink-100">
                    <td className="px-6 py-2 font-medium text-ink-800">{f.ciudad}</td>
                    <td className="px-4 py-2 text-right text-ink-700">{f.total}</td>
                    <td className="px-4 py-2 text-right text-emerald-600">{f.aprobadas}</td>
                    <td className="px-4 py-2 text-right text-rose-600">{f.rechazadas}</td>
                  </tr>
                ))}
                {filasCiudad.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-ink-400">
                      Sin datos de ciudad todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Actividad reciente</h2>
            <Link href="/admin/pipeline" className="text-xs font-semibold text-clay-600 hover:text-clay-700">
              Ver todas →
            </Link>
          </div>
          <ul className="divide-y divide-ink-100">
            {recientes.map((s) => {
              const nombre = (s.datos_personales as { nombres_apellidos?: string })?.nombres_apellidos ?? "Sin nombre";
              const etiqueta = ETIQUETAS_ESTADO[s.estado]?.label ?? s.estado;
              return (
                <li key={s.id}>
                  <Link href={`/admin/solicitudes/${s.id}`} className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-ink-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-800">{nombre}</p>
                      <p className="text-xs capitalize text-ink-400">
                        {s.vertical} · {new Date(s.creado_en).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: COLORES_ESTADO[s.estado] ?? "#A8A29E" }}
                    >
                      {etiqueta}
                    </span>
                  </Link>
                </li>
              );
            })}
            {recientes.length === 0 && <li className="px-6 py-8 text-center text-sm text-ink-400">Sin solicitudes recientes.</li>}
          </ul>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <QuickAction
          href="/admin/motor"
          titulo="Motor de decisión"
          subtitulo="Reglas, umbrales y versiones"
          colorBg="bg-clay-50"
          colorText="text-clay-600"
          icono={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>}
        />
        <QuickAction
          href="/admin/propiedades"
          titulo="Propiedades"
          subtitulo="Gestionar vitrina e imágenes"
          colorBg="bg-emerald-50"
          colorText="text-emerald-600"
          icono={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10 21v-3h4v3"/></svg>}
        />
        <QuickAction
          href="/admin/auditoria"
          titulo="Auditoría"
          subtitulo="Trazabilidad completa"
          colorBg="bg-purple-50"
          colorText="text-purple-600"
          icono={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v4h4"/><path d="M12 8v4.5l3 1.8"/></svg>}
        />
        <QuickAction
          href="/admin/reportes"
          titulo="Reportes"
          subtitulo="Exportables y métricas"
          colorBg="bg-sky-50"
          colorText="text-sky-600"
          icono={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 19V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/></svg>}
        />
        <QuickAction
          href="/admin/propietarios"
          titulo="Propietarios"
          subtitulo="Anunciantes y su riesgo"
          colorBg="bg-amber-50"
          colorText="text-amber-600"
          icono={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="7" r="3"/><path d="M2 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><circle cx="18" cy="6" r="2.2"/><path d="M18 11.5a4 4 0 0 1 4 4V17"/></svg>}
        />
      </div>
    </div>
  );
}
