"use client";

import { useEffect, useMemo, useState } from "react";
import { listarSolicitudesAdmin, obtenerReportesAdmin } from "@/lib/api";
import { formatoPorcentaje } from "@/lib/format";
import type { SolicitudOut } from "@/lib/types";

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

const COLORES_ESTADO_HEX: Record<string, string> = {
  borrador: "#98aca4", // ink-300
  enviada: "#0ea5e9", // sky-500
  en_evaluacion: "#a855f7", // purple-500
  revision_manual: "#f59e0b", // amber-500
  aprobada: "#10b981", // emerald-500
  rechazada: "#f43f5e", // rose-500
  con_ruta_alterna: "#38bdf8", // sky-400
};

const COLORES_ESTADO_BG: Record<string, string> = {
  borrador: "bg-ink-300",
  enviada: "bg-sky-500",
  en_evaluacion: "bg-purple-500",
  revision_manual: "bg-amber-500",
  aprobada: "bg-emerald-500",
  rechazada: "bg-rose-500",
  con_ruta_alterna: "bg-sky-400",
};

/* ---------------------------------- Helpers ---------------------------------- */

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

function claseIntensidad(ratio: number, tipo: "verde" | "rojo") {
  const paso = Math.min(4, Math.max(0, Math.floor(ratio * 5)));
  const verdes = ["bg-white", "bg-emerald-50", "bg-emerald-100", "bg-emerald-200", "bg-emerald-300"];
  const rojos = ["bg-white", "bg-rose-50", "bg-rose-100", "bg-rose-200", "bg-rose-300"];
  return tipo === "verde" ? verdes[paso] : rojos[paso];
}

/* ---------------------------------- UI atoms ---------------------------------- */

function IconoTendencia() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-clay-500" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoReloj() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoEscudo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KPI({
  titulo,
  valor,
  subtitulo,
  color,
  icono,
}: {
  titulo: string;
  valor: string;
  subtitulo?: string;
  color?: string;
  icono?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm transition hover:shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-wider text-ink-500">{titulo}</p>
        {icono}
      </div>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${color ?? "text-ink-900"}`}>{valor}</p>
      {subtitulo && <p className="mt-1 text-xs text-ink-400">{subtitulo}</p>}
    </div>
  );
}

/* ---------------------------------- SVG Donut chart ---------------------------------- */

function DonutChart({ datos }: { datos: { label: string; valor: number; color: string; clave: string }[] }) {
  const [montado, setMontado] = useState(false);
  const [activo, setActivo] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setMontado(true), 50);
    return () => clearTimeout(t);
  }, []);

  const total = datos.reduce((a, d) => a + d.valor, 0);
  const radio = 80;
  const circunferencia = 2 * Math.PI * radio;
  let acumulado = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
      <div className="relative h-56 w-56 shrink-0">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={radio} fill="none" stroke="#f4f1ea" strokeWidth="26" />
          {total === 0
            ? null
            : datos.map((d) => {
                const fraccion = d.valor / total;
                const largo = fraccion * circunferencia;
                const offsetInicial = acumulado;
                acumulado += largo;
                const esActivo = activo === d.clave;
                return (
                  <circle
                    key={d.clave}
                    cx="100"
                    cy="100"
                    r={radio}
                    fill="none"
                    stroke={d.color}
                    strokeWidth={esActivo ? 30 : 26}
                    strokeDasharray={`${circunferencia} ${circunferencia}`}
                    strokeDashoffset={montado ? circunferencia - offsetInicial : circunferencia}
                    style={{
                      transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1), stroke-width 0.2s ease",
                      opacity: activo && !esActivo ? 0.45 : 1,
                      cursor: "pointer",
                    }}
                    strokeLinecap="butt"
                    onMouseEnter={() => setActivo(d.clave)}
                    onMouseLeave={() => setActivo(null)}
                    onClick={() => setActivo(activo === d.clave ? null : d.clave)}
                  />
                );
              })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-ink-900">{activo ? datos.find((d) => d.clave === activo)?.valor : total}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            {activo ? datos.find((d) => d.clave === activo)?.label : "Total"}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {datos.map((d) => (
          <button
            type="button"
            key={d.clave}
            onMouseEnter={() => setActivo(d.clave)}
            onMouseLeave={() => setActivo(null)}
            onClick={() => setActivo(activo === d.clave ? null : d.clave)}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
              activo === d.clave ? "bg-sand-100" : "hover:bg-sand-50"
            }`}
          >
            <span className="flex items-center gap-2 text-ink-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              {d.label}
            </span>
            <span className="font-semibold text-ink-800">
              {d.valor} <span className="text-ink-400">({total > 0 ? formatoPorcentaje(d.valor / total) : "0%"})</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- SVG Bar chart ---------------------------------- */

function BarChart({ datos }: { datos: { label: string; valor: number }[] }) {
  const [montado, setMontado] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setMontado(true), 50);
    return () => clearTimeout(t);
  }, []);

  const ancho = 640;
  const alto = 220;
  const margenIzq = 32;
  const margenInf = 28;
  const areaAlto = alto - margenInf - 12;
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const anchoBarra = datos.length > 0 ? (ancho - margenIzq) / datos.length : 0;
  const gridLines = 4;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-56 w-full min-w-[420px]">
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = 12 + (areaAlto / gridLines) * i;
          const valorLinea = Math.round(max - (max / gridLines) * i);
          return (
            <g key={i}>
              <line x1={margenIzq} y1={y} x2={ancho} y2={y} stroke="#e3e8e6" strokeWidth={1} />
              <text x={0} y={y + 4} fontSize="9" fill="#6c8880">
                {valorLinea}
              </text>
            </g>
          );
        })}
        {datos.map((d, i) => {
          const alturaBarra = max > 0 ? (d.valor / max) * areaAlto : 0;
          const x = margenIzq + i * anchoBarra + anchoBarra * 0.2;
          const anchoReal = anchoBarra * 0.6;
          const y = 12 + areaAlto - (montado ? alturaBarra : 0);
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect
                x={x}
                y={y}
                width={anchoReal}
                height={montado ? alturaBarra : 0}
                rx={4}
                fill={hover === i ? "#b85d24" : "#d5762f"}
                style={{ transition: "height 0.9s cubic-bezier(.4,0,.2,1), y 0.9s cubic-bezier(.4,0,.2,1), fill 0.2s" }}
              />
              {hover === i && (
                <g>
                  <rect x={x + anchoReal / 2 - 16} y={y - 24} width={32} height={18} rx={4} fill="#122320" />
                  <text x={x + anchoReal / 2} y={y - 11} fontSize="10" fill="white" textAnchor="middle">
                    {d.valor}
                  </text>
                </g>
              )}
              <text x={x + anchoReal / 2} y={12 + areaAlto + 16} fontSize="10" fill="#4c6b63" textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------------------------------- Funnel chart ---------------------------------- */

function FunnelChart({ etapas }: { etapas: { label: string; valor: number; color: string }[] }) {
  const max = Math.max(1, ...etapas.map((e) => e.valor));
  return (
    <div className="flex flex-col gap-3">
      {etapas.map((e, i) => {
        const anteriorValor = i > 0 ? etapas[i - 1].valor : e.valor;
        const pctPrevio = anteriorValor > 0 ? e.valor / anteriorValor : i === 0 ? 1 : 0;
        const anchoPct = Math.max(8, (e.valor / max) * 100);
        return (
          <div key={e.label} className="flex items-center gap-4">
            <div className="w-32 shrink-0 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">{e.label}</div>
            <div className="flex-1">
              <div className="flex h-9 items-center justify-center rounded-md text-sm font-bold text-white shadow-sm transition-all duration-700"
                style={{ width: `${anchoPct}%`, backgroundColor: e.color, marginInline: "auto" }}
              >
                {e.valor}
              </div>
            </div>
            <div className="w-20 shrink-0 text-xs font-semibold text-ink-400">
              {i === 0 ? "" : formatoPorcentaje(pctPrevio)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Sortable heat map table ---------------------------------- */

type CiudadFila = ReportesOut["solicitudes_por_ciudad"][number] & { tasaAprobacion: number };

type ColumnaCiudad = "ciudad" | "total" | "aprobadas" | "rechazadas" | "tasaAprobacion";

function TablaCiudades({ filas }: { filas: CiudadFila[] }) {
  const [orden, setOrden] = useState<{ col: ColumnaCiudad; dir: "asc" | "desc" }>({ col: "total", dir: "desc" });

  const filasOrdenadas = useMemo(() => {
    const copia = [...filas];
    copia.sort((a, b) => {
      const va = a[orden.col];
      const vb = b[orden.col];
      if (typeof va === "string" || typeof vb === "string") {
        return orden.dir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      }
      return orden.dir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
    return copia;
  }, [filas, orden]);

  const maxTotal = Math.max(1, ...filas.map((f) => f.total));

  function alternarOrden(col: ColumnaCiudad) {
    setOrden((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }));
  }

  function Encabezado({ col, children }: { col: ColumnaCiudad; children: React.ReactNode }) {
    const activo = orden.col === col;
    return (
      <th
        className="cursor-pointer select-none px-4 py-2 transition hover:text-ink-800"
        onClick={() => alternarOrden(col)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {activo && <span className="text-clay-500">{orden.dir === "asc" ? "▲" : "▼"}</span>}
        </span>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
          <tr>
            <Encabezado col="ciudad">Ciudad</Encabezado>
            <Encabezado col="total">Total</Encabezado>
            <Encabezado col="aprobadas">Aprobadas</Encabezado>
            <Encabezado col="rechazadas">Rechazadas</Encabezado>
            <Encabezado col="tasaAprobacion">Tasa aprobación</Encabezado>
          </tr>
        </thead>
        <tbody>
          {filasOrdenadas.map((c) => (
            <tr key={c.ciudad} className="border-t border-ink-100">
              <td className="px-4 py-2 font-medium text-ink-800">{c.ciudad}</td>
              <td className={`px-4 py-2 transition-colors ${claseIntensidad(c.total / maxTotal, "verde")}`}>{c.total}</td>
              <td className={`px-4 py-2 text-emerald-700 transition-colors ${claseIntensidad(c.total > 0 ? c.aprobadas / c.total : 0, "verde")}`}>
                {c.aprobadas}
              </td>
              <td className={`px-4 py-2 text-rose-700 transition-colors ${claseIntensidad(c.total > 0 ? c.rechazadas / c.total : 0, "rojo")}`}>
                {c.rechazadas}
              </td>
              <td
                className={`px-4 py-2 font-semibold text-ink-800 transition-colors ${claseIntensidad(c.tasaAprobacion, "verde")}`}
              >
                {c.total > 0 ? formatoPorcentaje(c.tasaAprobacion) : "—"}
              </td>
            </tr>
          ))}
          {filasOrdenadas.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-ink-400">
                Sin datos disponibles.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------- Analyst cards ---------------------------------- */

function TarjetaAnalista({ analista }: { analista: ReportesOut["solicitudes_por_analista"][number] }) {
  const completadas = Math.max(0, analista.total - analista.pendientes);
  const tasaCompletado = analista.total > 0 ? completadas / analista.total : 0;
  const carga = analista.pendientes >= 8 ? "Alta" : analista.pendientes >= 3 ? "Media" : "Baja";
  const colorCarga =
    carga === "Alta" ? "bg-rose-100 text-rose-700" : carga === "Media" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink-900">{analista.analista}</p>
          <p className="text-xs text-ink-400">{analista.total} solicitudes asignadas</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${colorCarga}`}>{carga}</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
        <span>Completado</span>
        <span className="font-semibold text-ink-800">{formatoPorcentaje(tasaCompletado)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
          style={{ width: `${tasaCompletado * 100}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-ink-400">Pendientes</span>
        <span className="font-semibold text-amber-600">{analista.pendientes}</span>
      </div>
    </div>
  );
}

/* ---------------------------------- Tiempo por analista ---------------------------------- */

const HORAS_DEMO = [4.2, 6.8, 5.1];

function TiempoAnalistaCard({ analistas }: { analistas: ReportesOut["solicitudes_por_analista"] }) {
  const filas = analistas.map((a, i) => ({ analista: a.analista, horas: HORAS_DEMO[i % HORAS_DEMO.length] }));
  const maxHoras = Math.max(1, ...filas.map((f) => f.horas));
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-ink-500">Tiempo por analista</h2>
      <div className="space-y-3">
        {filas.map((f) => (
          <div key={f.analista}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-ink-600">{f.analista}</span>
              <span className="font-semibold text-ink-800">{f.horas} h</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-clay-500 transition-all duration-700"
                style={{ width: `${(f.horas / maxHoras) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {filas.length === 0 && <p className="text-sm text-ink-400">Sin analistas con solicitudes asignadas.</p>}
      </div>
      <p className="mt-4 text-xs text-ink-400">Horas promedio de evaluación por solicitud (datos demo).</p>
    </div>
  );
}

/* ---------------------------------- Documentos rechazados ---------------------------------- */

const DOCS_RECHAZADOS_DEMO = [
  { documento: "Extractos bancarios", count: 7 },
  { documento: "Certificación laboral", count: 5 },
  { documento: "Documento de identidad", count: 2 },
  { documento: "RUT", count: 2 },
  { documento: "Certificado de tradición", count: 1 },
];

function DocumentosRechazadosCard() {
  const total = DOCS_RECHAZADOS_DEMO.reduce((a, b) => a + b.count, 0);
  const max = Math.max(1, ...DOCS_RECHAZADOS_DEMO.map((d) => d.count));
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-ink-500">Documentos rechazados</h2>
      <div className="space-y-3">
        {DOCS_RECHAZADOS_DEMO.map((d) => (
          <div key={d.documento}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-ink-600">{d.documento}</span>
              <span className="font-semibold text-ink-800">
                {d.count} <span className="text-ink-400">({formatoPorcentaje(d.count / total)})</span>
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-700"
                style={{ width: `${(d.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-400">Rechazos en revisión documental (datos demo).</p>
    </div>
  );
}

/* ---------------------------------- Filtros ---------------------------------- */

interface FiltrosReporte {
  desde: string;
  hasta: string;
  estado: string;
  analista: string;
}

const FILTROS_VACIOS: FiltrosReporte = { desde: "", hasta: "", estado: "", analista: "" };

/* ---------------------------------- Page ---------------------------------- */

export default function ReportesAdminPage() {
  const [reportes, setReportes] = useState<ReportesOut | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosReporte>(FILTROS_VACIOS);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosReporte>(FILTROS_VACIOS);

  useEffect(() => {
    obtenerReportesAdmin()
      .then((r) => setReportes(r as ReportesOut))
      .catch(() => setError("No pudimos cargar los reportes."));
    listarSolicitudesAdmin()
      .then(setSolicitudes)
      .catch(() => {
        /* los filtros locales quedan deshabilitados si falla */
      });
  }, []);

  const filtroActivo =
    filtrosAplicados.desde !== "" || filtrosAplicados.hasta !== "" || filtrosAplicados.estado !== "";

  const solicitudesFiltradas = useMemo(() => {
    if (!filtroActivo) return solicitudes;
    return solicitudes.filter((s) => {
      const fecha = s.creado_en.slice(0, 10);
      if (filtrosAplicados.desde && fecha < filtrosAplicados.desde) return false;
      if (filtrosAplicados.hasta && fecha > filtrosAplicados.hasta) return false;
      if (filtrosAplicados.estado && s.estado !== filtrosAplicados.estado) return false;
      return true;
    });
  }, [solicitudes, filtrosAplicados, filtroActivo]);

  /* Vista de reportes: con filtros activos, estado + total + por_mes se derivan
     de la lista filtrada; el resto de gráficos mantiene el agregado del API. */
  const reportesVista = useMemo(() => {
    if (!reportes || !filtroActivo) return reportes;
    const porEstado: Record<string, number> = {};
    const porMesMap: Record<string, number> = {};
    for (const s of solicitudesFiltradas) {
      porEstado[s.estado] = (porEstado[s.estado] ?? 0) + 1;
      const mes = s.creado_en.slice(0, 7);
      porMesMap[mes] = (porMesMap[mes] ?? 0) + 1;
    }
    const porMes = Object.entries(porMesMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, total]) => ({ mes, total }));
    const aprobadas = porEstado.aprobada ?? 0;
    const rechazadas = porEstado.rechazada ?? 0;
    const evaluadas = aprobadas + rechazadas;
    return {
      ...reportes,
      solicitudes_por_estado: porEstado,
      solicitudes_por_mes: porMes,
      tasa_aprobacion: evaluadas > 0 ? aprobadas / evaluadas : 0,
      tasa_rechazo: evaluadas > 0 ? rechazadas / evaluadas : 0,
    };
  }, [reportes, filtroActivo, solicitudesFiltradas]);

  const totalSolicitudes = useMemo(
    () => (reportesVista ? Object.values(reportesVista.solicitudes_por_estado).reduce((a, b) => a + b, 0) : 0),
    [reportesVista]
  );

  const datosDonut = useMemo(() => {
    if (!reportesVista) return [];
    return Object.entries(reportesVista.solicitudes_por_estado)
      .filter(([, v]) => v > 0)
      .map(([estado, valor]) => ({
        clave: estado,
        label: ETIQUETAS_ESTADO[estado] ?? estado,
        valor,
        color: COLORES_ESTADO_HEX[estado] ?? "#98aca4",
      }));
  }, [reportesVista]);

  const datosMes = useMemo(
    () => (reportesVista?.solicitudes_por_mes ?? []).slice(-6).map((m) => ({ label: m.mes, valor: m.total })),
    [reportesVista]
  );

  const maxRazon = useMemo(
    () => Math.max(1, ...(reportes?.top_razones_rechazo.map((r) => r.count) ?? [1])),
    [reportes]
  );

  const filasCiudad: CiudadFila[] = useMemo(
    () =>
      (reportes?.solicitudes_por_ciudad ?? []).map((c) => ({
        ...c,
        tasaAprobacion: c.total > 0 ? c.aprobadas / c.total : 0,
      })),
    [reportes]
  );

  const etapasFunnel = useMemo(() => {
    if (!reportesVista) return [];
    const est = reportesVista.solicitudes_por_estado;
    const enviadas =
      (est.enviada ?? 0) + (est.en_evaluacion ?? 0) + (est.revision_manual ?? 0) + (est.aprobada ?? 0) + (est.rechazada ?? 0);
    const enEvaluacion = (est.en_evaluacion ?? 0) + (est.revision_manual ?? 0) + (est.aprobada ?? 0) + (est.rechazada ?? 0);
    const revision = (est.revision_manual ?? 0) + (est.aprobada ?? 0);
    const aprobadas = est.aprobada ?? 0;
    return [
      { label: "Enviadas", valor: enviadas, color: "#0ea5e9" },
      { label: "En evaluación", valor: enEvaluacion, color: "#a855f7" },
      { label: "Revisión", valor: revision, color: "#f59e0b" },
      { label: "Aprobadas", valor: aprobadas, color: "#10b981" },
    ];
  }, [reportesVista]);

  const slaCumplimiento = useMemo(() => {
    if (!reportes || reportes.tiempo_promedio_evaluacion_horas == null) return null;
    return reportes.tiempo_promedio_evaluacion_horas <= 48;
  }, [reportes]);

  function aplicarFiltros() {
    setFiltrosAplicados(filtros);
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS);
    setFiltrosAplicados(FILTROS_VACIOS);
  }

  function exportar() {
    if (!reportes) return;
    exportarCSV("reportes_solicitudes_por_ciudad.csv", reportes.solicitudes_por_ciudad);
  }

  function exportarCompleto() {
    if (!reportes) return;
    exportarCSV("reportes_por_estado.csv", Object.entries(reportes.solicitudes_por_estado).map(([estado, total]) => ({ estado, total })));
    exportarCSV("reportes_por_ciudad.csv", reportes.solicitudes_por_ciudad);
    exportarCSV("reportes_por_mes.csv", reportes.solicitudes_por_mes);
    exportarCSV("reportes_por_analista.csv", reportes.solicitudes_por_analista);
    exportarCSV("reportes_razones_rechazo.csv", reportes.top_razones_rechazo);
  }

  function imprimir() {
    window.print();
  }

  async function compartir() {
    if (!reportes) return;
    const resumen = [
      `Reporte de solicitudes — ${new Date().toLocaleDateString("es-CO")}`,
      `Total de solicitudes: ${totalSolicitudes}`,
      `Tasa de aprobación: ${formatoPorcentaje(reportes.tasa_aprobacion)}`,
      `Tasa de rechazo: ${formatoPorcentaje(reportes.tasa_rechazo)}`,
      `Tiempo promedio de evaluación: ${reportes.tiempo_promedio_evaluacion_horas != null ? `${reportes.tiempo_promedio_evaluacion_horas} h` : "—"}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(resumen);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* clipboard no disponible */
    }
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
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Centro de Reportes</h1>
          <p className="mt-1 text-sm text-ink-500">
            Analítica de solicitudes, aprobaciones y desempeño operativo · Actualizado al {new Date().toLocaleDateString("es-CO")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportar} className="btn-secondary text-sm">
            Exportar CSV
          </button>
          <button type="button" onClick={imprimir} className="btn-secondary text-sm">
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-500">Filtros</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Desde</label>
            <input
              type="date"
              value={filtros.desde}
              onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 focus:border-clay-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Hasta</label>
            <input
              type="date"
              value={filtros.hasta}
              onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 focus:border-clay-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Estado</label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 focus:border-clay-500 focus:outline-none"
            >
              <option value="">Todos</option>
              {Object.entries(ETIQUETAS_ESTADO).map(([clave, etiqueta]) => (
                <option key={clave} value={clave}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Analista</label>
            <input
              type="text"
              placeholder="Nombre del analista"
              value={filtros.analista}
              onChange={(e) => setFiltros({ ...filtros, analista: e.target.value })}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 focus:border-clay-500 focus:outline-none"
            />
          </div>
          <button type="button" onClick={aplicarFiltros} className="btn-primary text-sm">
            Aplicar
          </button>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-sm font-semibold text-clay-600 underline-offset-2 hover:underline"
          >
            Limpiar
          </button>
        </div>
        {filtroActivo && (
          <p className="mt-3 text-xs text-amber-600">
            Filtros activos: {solicitudesFiltradas.length} solicitudes en el rango. Algunos gráficos usan el total
            histórico.
          </p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPI titulo="Total solicitudes" valor={String(totalSolicitudes)} subtitulo={filtroActivo ? "En el rango filtrado" : "Acumulado histórico"} icono={<IconoTendencia />} />
        <KPI
          titulo="Tasa de aprobación"
          valor={formatoPorcentaje(reportesVista?.tasa_aprobacion ?? reportes.tasa_aprobacion)}
          color="text-emerald-600"
          subtitulo="Sobre total evaluado"
        />
        <KPI
          titulo="Tasa de rechazo"
          valor={formatoPorcentaje(reportesVista?.tasa_rechazo ?? reportes.tasa_rechazo)}
          color="text-rose-600"
          subtitulo="Sobre total evaluado"
        />
        <KPI
          titulo="Tiempo promedio"
          valor={reportes.tiempo_promedio_evaluacion_horas != null ? `${reportes.tiempo_promedio_evaluacion_horas} h` : "—"}
          subtitulo="De evaluación"
          icono={<IconoReloj />}
        />
        <KPI
          titulo="SLA cumplimiento"
          valor={slaCumplimiento == null ? "—" : slaCumplimiento ? "Dentro de SLA" : "Fuera de SLA"}
          color={slaCumplimiento ? "text-emerald-600" : "text-rose-600"}
          subtitulo="Meta: menos de 48 h"
          icono={<IconoEscudo />}
        />
        <KPI titulo="Score promedio" valor="712" subtitulo="Solicitudes evaluadas (demo)" color="text-clay-600" />
      </div>

      {/* Donut + Bar chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-ink-500">Solicitudes por estado</h2>
          {datosDonut.length === 0 ? (
            <p className="text-sm text-ink-400">Sin datos disponibles.</p>
          ) : (
            <DonutChart datos={datosDonut} />
          )}
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-ink-500">Solicitudes por mes (últimos 6 meses)</h2>
          {datosMes.length === 0 ? <p className="text-sm text-ink-400">Sin datos disponibles.</p> : <BarChart datos={datosMes} />}
        </div>
      </div>

      {/* Funnel */}
      <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-sm font-bold uppercase tracking-wider text-ink-500">Embudo de conversión</h2>
        {etapasFunnel.every((e) => e.valor === 0) ? (
          <p className="text-sm text-ink-400">Sin datos disponibles.</p>
        ) : (
          <FunnelChart etapas={etapasFunnel} />
        )}
      </div>

      {/* Heat map ciudades */}
      <div className="card">
        <div className="border-b border-ink-100 px-5 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Desempeño por ciudad</h2>
        </div>
        <TablaCiudades filas={filasCiudad} />
      </div>

      {/* Analistas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-500">Desempeño por analista</h2>
          {reportes.solicitudes_por_analista.length === 0 ? (
            <p className="rounded-xl border border-ink-100 bg-white p-6 text-sm text-ink-400 shadow-sm">
              No hay analistas con solicitudes asignadas.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {reportes.solicitudes_por_analista.map((a) => (
                <TarjetaAnalista key={a.analista} analista={a} />
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-500">Tiempos de evaluación</h2>
          <TiempoAnalistaCard analistas={reportes.solicitudes_por_analista} />
        </div>
      </div>

      {/* Razones de rechazo + documentos rechazados */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-ink-500">Top razones de rechazo</h2>
        <div className="space-y-3">
          {reportes.top_razones_rechazo.map((r) => {
            const totalRazones = reportes.top_razones_rechazo.reduce((a, b) => a + b.count, 0);
            return (
              <div key={r.razon}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-600">{r.razon || "Sin comentario"}</span>
                  <span className="font-semibold text-ink-800">
                    {r.count} <span className="text-ink-400">({totalRazones > 0 ? formatoPorcentaje(r.count / totalRazones) : "0%"})</span>
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all duration-700"
                    style={{ width: `${maxRazon > 0 ? (r.count / maxRazon) * 100 : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
          {reportes.top_razones_rechazo.length === 0 && <p className="text-sm text-ink-400">No hay rechazos registrados todavía.</p>}
        </div>
      </div>
      <DocumentosRechazadosCard />
      </div>

      {/* Quick actions footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-sand-50 p-5">
        <p className="text-sm text-ink-500">¿Necesitas compartir estos resultados con tu equipo?</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportarCompleto} className="btn-primary text-sm">
            Exportar reporte completo
          </button>
          <button type="button" onClick={imprimir} className="btn-secondary text-sm">
            Imprimir
          </button>
          <button type="button" onClick={compartir} className="btn-secondary text-sm">
            {copiado ? "Copiado ✓" : "Compartir"}
          </button>
        </div>
      </div>
    </div>
  );
}
