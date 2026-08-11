"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, type TonoBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { PLANTILLAS, VARIABLES_PLANTILLA, type CanalNotificacion, type PlantillaNotificacion } from "@/lib/demo";

const ETIQUETAS_CANAL: Record<CanalNotificacion, string> = {
  email: "Correo",
  whatsapp: "WhatsApp",
  sms: "SMS",
};

const TONOS_CANAL: Record<CanalNotificacion, TonoBadge> = {
  email: "info",
  whatsapp: "exito",
  sms: "violeta",
};

const ETIQUETAS_DESTINATARIO: Record<PlantillaNotificacion["destinatario"], string> = {
  cliente: "Arrendatario",
  propietario: "Propietario",
  analista: "Equipo interno",
};

/** Reemplaza las variables por valores de muestra para la vista previa. */
const MUESTRA: Record<string, string> = {
  "{{nombre}}": "Laura",
  "{{codigo_solicitud}}": "AC-KQTMRD",
  "{{inmueble}}": "Apartamento 302 · Laureles",
  "{{canon}}": "$2.400.000",
  "{{veredicto}}": "Aprobado con condiciones",
  "{{condiciones}}": "Se requiere depósito de 2 meses de canon.",
  "{{enlace}}": "raiz.co/estado/AC-KQTMRD",
  "{{asesor}}": "Juan Pablo Cárdenas",
};

function renderizarVistaPrevia(texto: string): string {
  return Object.entries(MUESTRA).reduce(
    (acumulado, [variable, valor]) => acumulado.split(variable).join(valor),
    texto
  );
}

export default function NotificacionesPage() {
  const { toast } = useToast();
  const [plantillas, setPlantillas] = useState<PlantillaNotificacion[]>(PLANTILLAS);
  const [seleccionadaId, setSeleccionadaId] = useState(PLANTILLAS[0].id);
  const [filtroCanal, setFiltroCanal] = useState<CanalNotificacion | "todos">("todos");

  const visibles = useMemo(
    () => (filtroCanal === "todos" ? plantillas : plantillas.filter((p) => p.canal === filtroCanal)),
    [plantillas, filtroCanal]
  );

  const seleccionada = plantillas.find((p) => p.id === seleccionadaId) ?? plantillas[0];

  function actualizar(cambios: Partial<PlantillaNotificacion>) {
    setPlantillas((previas) => previas.map((p) => (p.id === seleccionada.id ? { ...p, ...cambios } : p)));
  }

  function insertarVariable(variable: string) {
    actualizar({ cuerpo: `${seleccionada.cuerpo}${variable}` });
  }

  return (
    <div>
      <PageHeader
        titulo="Notificaciones"
        descripcion="Plantillas de correo, WhatsApp y SMS para cada estado del pipeline de una solicitud."
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Lista */}
        <aside>
          <div className="mb-3 flex flex-wrap gap-2">
            {(["todos", "email", "whatsapp", "sms"] as const).map((canal) => (
              <button
                key={canal}
                type="button"
                onClick={() => setFiltroCanal(canal)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filtroCanal === canal
                    ? "bg-ink-900 text-white"
                    : "bg-white text-ink-600 ring-1 ring-ink-200 hover:ring-ink-400"
                }`}
              >
                {canal === "todos" ? "Todos" : ETIQUETAS_CANAL[canal]}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {visibles.map((plantilla) => {
              const activa = plantilla.id === seleccionada.id;
              return (
                <button
                  key={plantilla.id}
                  type="button"
                  onClick={() => setSeleccionadaId(plantilla.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    activa ? "border-ink-800 bg-white shadow-card" : "border-ink-100 bg-white hover:border-ink-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">{plantilla.evento_nombre}</p>
                    <Badge tono={TONOS_CANAL[plantilla.canal]}>{ETIQUETAS_CANAL[plantilla.canal]}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-500">{plantilla.asunto}</p>
                  <p className="mt-1.5 text-xs text-ink-400">
                    Para: {ETIQUETAS_DESTINATARIO[plantilla.destinatario]} ·{" "}
                    <span className={plantilla.activa ? "text-emerald-600" : "text-ink-400"}>
                      {plantilla.activa ? "Activa" : "Inactiva"}
                    </span>
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Editor */}
        <section className="space-y-5">
          <div className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">{seleccionada.evento_nombre}</h2>
                <p className="mt-0.5 text-xs text-ink-400">
                  Evento del pipeline: <span className="font-mono">{seleccionada.evento}</span>
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-ink-300 text-clay-600 focus:ring-clay-500"
                  checked={seleccionada.activa}
                  onChange={(e) => actualizar({ activa: e.target.checked })}
                />
                Plantilla activa
              </label>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="canal" className="label-field">
                  Canal
                </label>
                <select
                  id="canal"
                  className="input-field"
                  value={seleccionada.canal}
                  onChange={(e) => actualizar({ canal: e.target.value as CanalNotificacion })}
                >
                  {(Object.keys(ETIQUETAS_CANAL) as CanalNotificacion[]).map((canal) => (
                    <option key={canal} value={canal}>
                      {ETIQUETAS_CANAL[canal]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="destinatario" className="label-field">
                  Destinatario
                </label>
                <select
                  id="destinatario"
                  className="input-field"
                  value={seleccionada.destinatario}
                  onChange={(e) => actualizar({ destinatario: e.target.value as PlantillaNotificacion["destinatario"] })}
                >
                  {(Object.keys(ETIQUETAS_DESTINATARIO) as PlantillaNotificacion["destinatario"][]).map((d) => (
                    <option key={d} value={d}>
                      {ETIQUETAS_DESTINATARIO[d]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="asunto" className="label-field">
                {seleccionada.canal === "email" ? "Asunto" : "Título interno"}
              </label>
              <input
                id="asunto"
                className="input-field"
                value={seleccionada.asunto}
                onChange={(e) => actualizar({ asunto: e.target.value })}
              />
            </div>

            <div className="mt-4">
              <label htmlFor="cuerpo" className="label-field">
                Mensaje
              </label>
              <textarea
                id="cuerpo"
                rows={8}
                className="input-field font-mono text-xs leading-relaxed"
                value={seleccionada.cuerpo}
                onChange={(e) => actualizar({ cuerpo: e.target.value })}
              />
              {seleccionada.canal === "sms" && seleccionada.cuerpo.length > 160 && (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  {seleccionada.cuerpo.length} caracteres: el SMS se enviará en varios segmentos.
                </p>
              )}
            </div>

            <div className="mt-4">
              <p className="label-field">Variables disponibles</p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES_PLANTILLA.map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => insertarVariable(variable)}
                    className="rounded-full bg-ink-50 px-2.5 py-1 font-mono text-xs text-ink-600 transition hover:bg-ink-100"
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toast({ type: "success", title: "Plantilla guardada" })}
                className="btn-primary px-5 py-2.5 text-sm"
              >
                Guardar plantilla
              </button>
              <button
                type="button"
                onClick={() =>
                  toast({
                    type: "info",
                    title: "Envío de prueba",
                    description: "Se enviará a la dirección del usuario que está en sesión.",
                  })
                }
                className="btn-secondary px-5 py-2.5 text-sm"
              >
                Enviar prueba
              </button>
            </div>
          </div>

          {/* Vista previa */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-ink-900">Vista previa</h3>
            <p className="mt-0.5 text-xs text-ink-400">Con datos de muestra de una solicitud real.</p>

            <div className="mt-4 rounded-xl border border-ink-100 bg-sand-50 p-4">
              {seleccionada.canal === "email" && (
                <p className="mb-3 border-b border-ink-100 pb-2 text-sm font-semibold text-ink-900">
                  {renderizarVistaPrevia(seleccionada.asunto)}
                </p>
              )}
              <p className="whitespace-pre-wrap text-sm text-ink-700">{renderizarVistaPrevia(seleccionada.cuerpo)}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
