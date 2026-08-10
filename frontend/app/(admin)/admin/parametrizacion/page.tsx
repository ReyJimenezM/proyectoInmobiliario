"use client";

import { useEffect, useState } from "react";
import {
  obtenerParametrizacion,
  guardarParametrizacion,
  type ParametrizacionOperativa,
} from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

/* ------------------------------------------------------------------ */
/*  SLA priority metadata                                              */
/* ------------------------------------------------------------------ */

const PRIORIDADES: {
  clave: string;
  etiqueta: string;
  badge: string;
  barra: string;
}[] = [
  { clave: "critica", etiqueta: "Crítica", badge: "bg-rose-50 text-rose-700 ring-rose-200", barra: "bg-rose-500" },
  { clave: "alta", etiqueta: "Alta", badge: "bg-amber-50 text-amber-700 ring-amber-200", barra: "bg-amber-500" },
  { clave: "media", etiqueta: "Media", badge: "bg-sky-50 text-sky-700 ring-sky-200", barra: "bg-sky-500" },
  { clave: "baja", etiqueta: "Baja", badge: "bg-ink-100 text-ink-600 ring-ink-200", barra: "bg-ink-400" },
];

/* ------------------------------------------------------------------ */
/*  Estados del flujo (referencia estática)                            */
/* ------------------------------------------------------------------ */

const ESTADOS_FLUJO: { clave: string; etiqueta: string; color: string; descripcion: string }[] = [
  { clave: "borrador", etiqueta: "Borrador", color: "bg-ink-100 text-ink-600", descripcion: "Solicitud iniciada, aún incompleta" },
  { clave: "enviada", etiqueta: "Enviada", color: "bg-sky-50 text-sky-700", descripcion: "Formulario radicado por el solicitante" },
  { clave: "en_evaluacion", etiqueta: "En evaluación", color: "bg-purple-50 text-purple-700", descripcion: "Ejecutando validaciones y motor de decisión" },
  { clave: "revision_manual", etiqueta: "Revisión manual", color: "bg-amber-50 text-amber-700", descripcion: "Requiere revisión de un analista" },
  { clave: "aprobada", etiqueta: "Aprobada", color: "bg-emerald-50 text-emerald-700", descripcion: "Cumple todos los criterios de riesgo" },
  { clave: "rechazada", etiqueta: "Rechazada", color: "bg-rose-50 text-rose-700", descripcion: "No cumple los criterios de riesgo" },
  { clave: "con_ruta_alterna", etiqueta: "Con ruta alterna", color: "bg-sky-50 text-sky-600", descripcion: "Se ofrece una alternativa (codeudor, depósito, póliza)" },
];

/* ------------------------------------------------------------------ */
/*  Automatizaciones                                                   */
/* ------------------------------------------------------------------ */

const AUTOMATIZACIONES: {
  clave: "auto_asignacion" | "notificaciones" | "revision_manual_obligatoria";
  titulo: string;
  descripcion: string;
}[] = [
  {
    clave: "auto_asignacion",
    titulo: "Asignación automática de analista",
    descripcion: "Distribuye por carga de trabajo y ciudad.",
  },
  {
    clave: "notificaciones",
    titulo: "Notificaciones automáticas al solicitante",
    descripcion: "Correo en cada cambio de estado.",
  },
  {
    clave: "revision_manual_obligatoria",
    titulo: "Revisión humana obligatoria en toda decisión",
    descripcion: "Desactiva las preaprobaciones automáticas del motor.",
  },
];

/* ------------------------------------------------------------------ */
/*  UI atoms                                                           */
/* ------------------------------------------------------------------ */

function IconoReloj() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-ink-400" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4l2.5 2" />
    </svg>
  );
}

function Interruptor({
  activo,
  onCambio,
  etiqueta,
}: {
  activo: boolean;
  onCambio: (valor: boolean) => void;
  etiqueta: string;
}) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={activo}
        onChange={(e) => onCambio(e.target.checked)}
        aria-label={etiqueta}
      />
      <span className="h-6 w-11 rounded-full bg-ink-200 transition-colors peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-300" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ParametrizacionAdminPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<ParametrizacionOperativa | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevoMotivo, setNuevoMotivo] = useState("");

  useEffect(() => {
    obtenerParametrizacion()
      .then(setConfig)
      .catch(() => setError("No fue posible cargar la parametrización operativa."));
  }, []);

  async function guardar(payload: Partial<ParametrizacionOperativa>, titulo: string, descripcion?: string) {
    try {
      const res = await guardarParametrizacion(payload);
      setConfig(res);
      toast({ type: "success", title: titulo, description: descripcion });
    } catch {
      toast({ type: "error", title: "No se pudo guardar", description: "Intenta de nuevo en unos segundos." });
    }
  }

  function cambiarSla(clave: string, horas: number) {
    if (!config || Number.isNaN(horas) || horas <= 0) return;
    const sla = { ...config.sla, [clave]: horas };
    setConfig({ ...config, sla });
    void guardar({ sla }, "SLA actualizado", `${clave}: ${horas} h`);
  }

  function cambiarFlag(clave: (typeof AUTOMATIZACIONES)[number]["clave"], valor: boolean) {
    if (!config) return;
    setConfig({ ...config, [clave]: valor });
    void guardar({ [clave]: valor }, "Configuración guardada");
  }

  function agregarMotivo() {
    if (!config) return;
    const v = nuevoMotivo.trim();
    if (!v || config.motivos_rechazo.includes(v)) return;
    const motivos_rechazo = [...config.motivos_rechazo, v];
    setConfig({ ...config, motivos_rechazo });
    setNuevoMotivo("");
    void guardar({ motivos_rechazo }, "Motivo agregado", v);
  }

  function quitarMotivo(motivo: string) {
    if (!config) return;
    const motivos_rechazo = config.motivos_rechazo.filter((m) => m !== motivo);
    setConfig({ ...config, motivos_rechazo });
    void guardar({ motivos_rechazo }, "Motivo eliminado", motivo);
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-ink-900">Parametrización operativa</h1>
        <p className="py-10 text-center text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-300 border-t-transparent" />
      </div>
    );
  }

  const maxSla = Math.max(...Object.values(config.sla), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Parametrización operativa</h1>
        <p className="mt-1 text-sm text-ink-500">
          Tiempos de atención, automatizaciones, motivos de rechazo y estados del flujo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* SLA card */}
        <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
          <div className="border-b border-ink-100 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">
              Acuerdos de nivel de servicio (SLA)
            </h2>
          </div>
          <div className="space-y-4 px-5 py-4">
            {PRIORIDADES.map((p) => {
              const horas = config.sla[p.clave] ?? 0;
              const pct = Math.max(6, Math.min(100, Math.round((horas / maxSla) * 100)));
              return (
                <div key={p.clave} className="flex items-center gap-3">
                  <span className={`inline-flex w-24 shrink-0 items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${p.badge}`}>
                    {p.etiqueta}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <div className={`h-full rounded-full ${p.barra}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="relative w-28 shrink-0">
                    <input
                      type="number"
                      min={1}
                      className="input-field pr-8 text-right"
                      value={horas}
                      onChange={(e) => cambiarSla(p.clave, Number(e.target.value))}
                      aria-label={`SLA prioridad ${p.etiqueta} en horas`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-400">
                      h
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="flex items-start gap-3 rounded-lg bg-ink-50 p-3">
              <IconoReloj />
              <p className="text-xs text-ink-600">
                El SLA se mide desde la radicación hasta la decisión final. Al 80% del tiempo la
                solicitud se marca en riesgo en la cola.
              </p>
            </div>
          </div>
        </div>

        {/* Automatizaciones card */}
        <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
          <div className="border-b border-ink-100 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Automatizaciones</h2>
          </div>
          <div className="space-y-5 px-5 py-4">
            {AUTOMATIZACIONES.map((a) => (
              <div key={a.clave} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-800">{a.titulo}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{a.descripcion}</p>
                </div>
                <Interruptor
                  activo={config[a.clave]}
                  onCambio={(v) => cambiarFlag(a.clave, v)}
                  etiqueta={a.titulo}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Motivos de rechazo card */}
        <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
          <div className="border-b border-ink-100 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Motivos de rechazo</h2>
          </div>
          <div className="space-y-3 px-5 py-4">
            <div className="space-y-1">
              {config.motivos_rechazo.map((m) => (
                <div key={m} className="flex items-center justify-between gap-3 border-b border-dashed border-ink-100 py-2 last:border-b-0">
                  <span className="min-w-0 text-sm text-ink-800">{m}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      activo
                    </span>
                    <button
                      type="button"
                      onClick={() => quitarMotivo(m)}
                      aria-label={`Eliminar motivo ${m}`}
                      title="Eliminar motivo"
                      className="rounded-full p-1 text-ink-300 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </span>
                </div>
              ))}
              {config.motivos_rechazo.length === 0 && (
                <p className="py-4 text-center text-xs text-ink-400">Sin motivos configurados.</p>
              )}
            </div>
            <div className="flex gap-2 border-t border-ink-100 pt-3">
              <input
                type="text"
                className="input-field flex-1 text-sm"
                placeholder="Ej.: Inmueble no apto para la actividad declarada"
                value={nuevoMotivo}
                onChange={(e) => setNuevoMotivo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarMotivo();
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary shrink-0 px-3 py-1.5 text-sm"
                onClick={agregarMotivo}
                disabled={nuevoMotivo.trim().length === 0}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Estados del flujo card */}
        <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
          <div className="border-b border-ink-100 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Estados del flujo</h2>
            <p className="mt-0.5 text-xs text-ink-400">Referencia del pipeline de evaluación. No editable.</p>
          </div>
          <div className="px-5 py-2">
            {ESTADOS_FLUJO.map((e) => (
              <div key={e.clave} className="flex items-center justify-between gap-4 border-b border-dashed border-ink-100 py-2.5 last:border-b-0">
                <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${e.color}`}>
                  {e.etiqueta}
                </span>
                <span className="max-w-[60%] text-right text-xs text-ink-500">{e.descripcion}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
