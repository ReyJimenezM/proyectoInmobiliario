"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  actualizarDocumentoRequisito,
  actualizarReglaRequisito,
  obtenerRequisitos,
} from "@/lib/api";
import type { DocumentoRequisito, ReglaRequisito, RequisitosConfig } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */

function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={`relative inline-flex shrink-0 items-center ${disabled ? "cursor-wait opacity-60" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="peer sr-only"
      />
      <span className="h-5 w-9 rounded-full bg-ink-200 transition-colors peer-checked:bg-clay-600 peer-focus-visible:ring-2 peer-focus-visible:ring-clay-300" />
      <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
    </label>
  );
}

function BadgeObligatorio({ obligatorio }: { obligatorio: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        obligatorio ? "bg-rose-50 text-rose-700" : "bg-ink-100 text-ink-500"
      }`}
    >
      {obligatorio ? "Obligatorio" : "Opcional"}
    </span>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-overlay-in bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[88vh] w-full max-w-lg animate-modal-in flex-col overflow-hidden rounded-2xl bg-white shadow-card"
      >
        <div className="border-b border-ink-100 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex justify-end gap-3 border-t border-ink-100 px-6 py-4">{footer}</div>
      </div>
    </div>,
    document.body
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */

export default function RequisitosAdminPage() {
  const { toast } = useToast();

  const [config, setConfig] = useState<RequisitosConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // Toggle in-flight
  const [reglaEnProceso, setReglaEnProceso] = useState<string | null>(null);

  // Modal: editar regla
  const [reglaEnEdicion, setReglaEnEdicion] = useState<ReglaRequisito | null>(null);
  const [docsSeleccionados, setDocsSeleccionados] = useState<string[]>([]);
  const [guardandoRegla, setGuardandoRegla] = useState(false);

  // Modal: editar textos de documento
  const [docEnEdicion, setDocEnEdicion] = useState<{ perfil: string; doc: DocumentoRequisito } | null>(null);
  const [formDoc, setFormDoc] = useState<Partial<DocumentoRequisito>>({});
  const [guardandoDoc, setGuardandoDoc] = useState(false);

  useEffect(() => {
    obtenerRequisitos()
      .then(setConfig)
      .catch(() => setError("No pudimos cargar la configuración de requisitos."))
      .finally(() => setCargando(false));
  }, []);

  async function alternarRegla(regla: ReglaRequisito, activa: boolean) {
    setReglaEnProceso(regla.id);
    try {
      const nueva = await actualizarReglaRequisito(regla.id, { activa });
      setConfig(nueva);
      toast({
        title: activa ? "Regla activada" : "Regla desactivada",
        description: `${regla.condicion} = ${regla.valor}`,
        type: activa ? "success" : "warning",
      });
    } catch {
      toast({ title: "No pudimos actualizar la regla", type: "error" });
    } finally {
      setReglaEnProceso(null);
    }
  }

  function abrirEdicionRegla(regla: ReglaRequisito) {
    setReglaEnEdicion(regla);
    setDocsSeleccionados([...regla.docs]);
  }

  async function guardarRegla() {
    if (!reglaEnEdicion) return;
    setGuardandoRegla(true);
    try {
      const nueva = await actualizarReglaRequisito(reglaEnEdicion.id, { docs: docsSeleccionados });
      setConfig(nueva);
      toast({
        title: "Regla actualizada",
        description: `${docsSeleccionados.length} documento(s) para ${reglaEnEdicion.valor}`,
        type: "success",
      });
      setReglaEnEdicion(null);
    } catch {
      toast({ title: "No pudimos guardar la regla", type: "error" });
    } finally {
      setGuardandoRegla(false);
    }
  }

  function abrirEdicionDoc(perfil: string, doc: DocumentoRequisito) {
    setDocEnEdicion({ perfil, doc });
    setFormDoc({
      nombre: doc.nombre,
      para: doc.para,
      contiene: doc.contiene,
      formato: doc.formato,
      ejemplo: doc.ejemplo,
      sin_validar: doc.sin_validar,
      obligatorio: doc.obligatorio,
    });
  }

  async function guardarDoc() {
    if (!docEnEdicion) return;
    setGuardandoDoc(true);
    try {
      const nueva = await actualizarDocumentoRequisito(docEnEdicion.perfil, docEnEdicion.doc.id, formDoc);
      setConfig(nueva);
      toast({
        title: "Documento actualizado",
        description: "El portal ya muestra los nuevos textos.",
        type: "success",
      });
      setDocEnEdicion(null);
    } catch {
      toast({ title: "No pudimos guardar el documento", type: "error" });
    } finally {
      setGuardandoDoc(false);
    }
  }

  /* ---------------------------------------------------------------- */

  if (cargando) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-72 animate-pulse rounded-lg bg-ink-100" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-ink-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-ink-100" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
        {error ?? "No pudimos cargar la configuración de requisitos."}
      </p>
    );
  }

  const reglasActivas = config.reglas.filter((r) => r.activa).length;
  const docsUnicos = new Set(
    [...config.base, ...Object.values(config.perfiles).flat()].map((d) => d.id)
  ).size;
  const perfiles = Object.keys(config.perfiles);

  const catalogoRegla = reglaEnEdicion ? config.perfiles[reglaEnEdicion.valor] ?? [] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Requisitos documentales</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-500">
          Define qué documentos se piden según el perfil del solicitante, si son obligatorios y cómo se le
          explican en el portal.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Reglas activas</p>
          <p className="mt-2 text-2xl font-bold text-ink-900">
            {reglasActivas}
            <span className="text-base font-semibold text-ink-400"> / {config.reglas.length}</span>
          </p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Documentos configurados</p>
          <p className="mt-2 text-2xl font-bold text-ink-900">{docsUnicos}</p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Perfiles cubiertos</p>
          <p className="mt-2 text-2xl font-bold text-ink-900">{perfiles.length}</p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Documentos base</p>
          <p className="mt-2 text-2xl font-bold text-ink-900">{config.base.length}</p>
          <p className="text-xs text-ink-400">se piden siempre</p>
        </div>
      </div>

      {/* Reglas por perfil */}
      <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
        <div className="border-b border-ink-100 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Reglas por perfil</h2>
          <p className="mt-0.5 text-sm text-ink-400">
            SI la situación laboral del solicitante es X, ENTONCES se solicitan estos documentos.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="px-5 py-3 font-semibold">Activa</th>
                <th className="px-3 py-3 font-semibold">Condición</th>
                <th className="px-3 py-3 font-semibold">Documentos que se solicitan</th>
                <th className="px-3 py-3 font-semibold">Última modificación</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {config.reglas.map((regla) => {
                const catalogo = config.perfiles[regla.valor] ?? [];
                return (
                  <tr key={regla.id} className="border-t border-ink-100 align-top">
                    <td className="px-5 py-3.5">
                      <ToggleSwitch
                        checked={regla.activa}
                        disabled={reglaEnProceso === regla.id}
                        onChange={(v) => alternarRegla(regla, v)}
                        label={`Activar ${regla.id}`}
                      />
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="font-semibold text-ink-800">
                        {regla.condicion} = {regla.valor}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-ink-400">{regla.id}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {regla.docs.map((docId) => {
                          const doc = catalogo.find((d) => d.id === docId);
                          return (
                            <span
                              key={docId}
                              className="inline-flex items-center gap-1.5 rounded-full border border-ink-100 bg-ink-50 px-2.5 py-1 text-xs text-ink-700"
                            >
                              {doc?.nombre ?? docId}
                              {doc?.obligatorio && (
                                <span className="rounded bg-rose-50 px-1 py-px text-[10px] font-bold text-rose-700">
                                  Obl.
                                </span>
                              )}
                            </span>
                          );
                        })}
                        {regla.docs.length === 0 && (
                          <span className="text-xs text-ink-400">Sin documentos adicionales</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-ink-700">{regla.autor ?? "—"}</p>
                      <p className="text-xs text-ink-400">{regla.fecha ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => abrirEdicionRegla(regla)}
                        className="rounded-full px-3 py-1 text-xs font-semibold text-clay-600 transition hover:bg-clay-50"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {config.reglas.length === 0 && (
                <tr className="border-t border-ink-100">
                  <td colSpan={5} className="px-5 py-6 text-center text-sm text-ink-400">
                    Sin reglas configuradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-ink-100 px-5 py-3 text-xs text-ink-400">
          Los documentos base ({config.base.map((d) => d.nombre).join(", ")}) se solicitan a todos los perfiles.
        </div>
      </div>

      {/* Textos que ve el solicitante */}
      <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
        <div className="border-b border-ink-100 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">
            Textos que ve el solicitante
          </h2>
          <p className="mt-0.5 text-sm text-ink-400">
            Cada documento explica para qué se usa, qué debe contener y qué pasa si no se puede validar.
          </p>
        </div>
        <div className="space-y-6 p-5">
          {["base", ...perfiles].map((perfil) => {
            const lista = perfil === "base" ? config.base : config.perfiles[perfil];
            return (
              <div key={perfil}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                  {perfil === "base" ? "Documentos base (todos los perfiles)" : perfil}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {lista.map((doc) => (
                    <div key={doc.id} className="rounded-lg border border-ink-100 bg-ink-50/50 p-4">
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-ink-900">{doc.nombre}</p>
                        <BadgeObligatorio obligatorio={doc.obligatorio} />
                      </div>
                      <p className="text-xs leading-relaxed text-ink-500">{doc.para}</p>
                      <button
                        type="button"
                        onClick={() => abrirEdicionDoc(perfil, doc)}
                        className="mt-2.5 rounded-full px-3 py-1 text-xs font-semibold text-clay-600 transition hover:bg-clay-50"
                      >
                        Editar textos
                      </button>
                    </div>
                  ))}
                  {lista.length === 0 && (
                    <p className="col-span-full text-sm text-ink-400">Sin documentos para este perfil.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  Modal: editar regla                                          */}
      {/* ------------------------------------------------------------ */}
      {reglaEnEdicion && (
        <Modal
          title="Editar regla de requisitos"
          subtitle={`SI ${reglaEnEdicion.condicion} = ${reglaEnEdicion.valor}`}
          onClose={() => setReglaEnEdicion(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setReglaEnEdicion(null)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 transition hover:bg-ink-100"
              >
                Cancelar
              </button>
              <button type="button" disabled={guardandoRegla} onClick={guardarRegla} className="btn-primary">
                {guardandoRegla ? "Guardando..." : "Guardar regla"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="rounded-lg bg-sky-50 px-3.5 py-2.5 text-sm text-sky-800">
              <b>SI</b> la situación laboral es <b>{reglaEnEdicion.valor}</b> <b>ENTONCES</b> se solicitan
              los documentos marcados.
            </p>
            <div className="space-y-2">
              {catalogoRegla.map((doc) => {
                const seleccionado = docsSeleccionados.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                      seleccionado ? "border-clay-300 bg-clay-50/50" : "border-ink-100 hover:border-ink-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={seleccionado}
                      onChange={(e) =>
                        setDocsSeleccionados((prev) =>
                          e.target.checked ? [...prev, doc.id] : prev.filter((id) => id !== doc.id)
                        )
                      }
                      className="mt-0.5 h-4 w-4 rounded border-ink-300"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <b className="text-sm text-ink-900">{doc.nombre}</b>
                        <BadgeObligatorio obligatorio={doc.obligatorio} />
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">{doc.para}</span>
                    </span>
                  </label>
                );
              })}
              {catalogoRegla.length === 0 && (
                <p className="text-sm text-ink-400">No hay documentos configurados para este perfil.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------ */}
      {/*  Modal: editar textos del documento                           */}
      {/* ------------------------------------------------------------ */}
      {docEnEdicion && (
        <Modal
          title="Editar documento"
          subtitle={`${docEnEdicion.doc.nombre} · perfil ${
            docEnEdicion.perfil === "base" ? "base (todos)" : docEnEdicion.perfil
          }`}
          onClose={() => setDocEnEdicion(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setDocEnEdicion(null)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 transition hover:bg-ink-100"
              >
                Cancelar
              </button>
              <button type="button" disabled={guardandoDoc} onClick={guardarDoc} className="btn-primary">
                {guardandoDoc ? "Guardando..." : "Guardar"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="label-field">Nombre del documento</label>
              <input
                type="text"
                value={formDoc.nombre ?? ""}
                onChange={(e) => setFormDoc((f) => ({ ...f, nombre: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">¿Para qué lo necesitamos? (lo lee el solicitante)</label>
              <textarea
                value={formDoc.para ?? ""}
                onChange={(e) => setFormDoc((f) => ({ ...f, para: e.target.value }))}
                className="input-field min-h-20"
              />
            </div>
            <div>
              <label className="label-field">¿Qué debe contener?</label>
              <textarea
                value={formDoc.contiene ?? ""}
                onChange={(e) => setFormDoc((f) => ({ ...f, contiene: e.target.value }))}
                className="input-field min-h-20"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label-field">Formato y tamaño</label>
                <input
                  type="text"
                  value={formDoc.formato ?? ""}
                  onChange={(e) => setFormDoc((f) => ({ ...f, formato: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Ejemplo o consejo</label>
                <input
                  type="text"
                  value={formDoc.ejemplo ?? ""}
                  onChange={(e) => setFormDoc((f) => ({ ...f, ejemplo: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="label-field">¿Qué pasa si no se puede validar?</label>
              <textarea
                value={formDoc.sin_validar ?? ""}
                onChange={(e) => setFormDoc((f) => ({ ...f, sin_validar: e.target.value }))}
                className="input-field min-h-20"
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-ink-100 bg-ink-50/50 p-3.5">
              <div>
                <p className="text-sm font-semibold text-ink-900">Documento obligatorio</p>
                <p className="text-xs text-ink-500">
                  Si está activo, el solicitante no puede continuar sin cargarlo.
                </p>
              </div>
              <ToggleSwitch
                checked={formDoc.obligatorio ?? false}
                onChange={(v) => setFormDoc((f) => ({ ...f, obligatorio: v }))}
                label="Documento obligatorio"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
