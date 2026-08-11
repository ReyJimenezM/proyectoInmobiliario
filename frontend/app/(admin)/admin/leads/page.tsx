"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { ESTADOS_LEAD, LEADS, type EstadoLead, type Lead } from "@/lib/demo";
import { formatoMoneda } from "@/lib/format";

const ASESORES = ["Sin asignar", "Juan Pablo Cárdenas", "Marcela Ortiz", "Daniel Aguirre"];

const TONOS: Record<EstadoLead, "neutro" | "info" | "alerta" | "exito" | "error"> = {
  nuevo: "info",
  contactado: "neutro",
  en_gestion: "alerta",
  calificado: "info",
  ganado: "exito",
  perdido: "error",
};

function TarjetaLead({ lead, onAbrir }: { lead: Lead; onAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="w-full rounded-lg border border-ink-100 bg-white p-3 text-left shadow-sm transition hover:shadow-md"
    >
      <p className="truncate text-sm font-semibold text-ink-900">{lead.nombre}</p>
      <p className="mt-0.5 truncate text-xs text-ink-500">{lead.interes}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tono={lead.tipo === "propietario" ? "violeta" : "neutro"}>
          {lead.tipo === "propietario" ? "Propietario" : "Arrendatario"}
        </Badge>
        <span className="text-xs text-ink-400">{formatoMoneda(lead.canon_objetivo)}</span>
      </div>
      <p className="mt-2 truncate text-xs text-ink-400">{lead.asesor}</p>
    </button>
  );
}

export default function LeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>(LEADS);
  const [tipo, setTipo] = useState<"todos" | "propietario" | "arrendatario">("todos");
  const [seleccionado, setSeleccionado] = useState<Lead | null>(null);
  const [nota, setNota] = useState("");

  const visibles = useMemo(() => (tipo === "todos" ? leads : leads.filter((l) => l.tipo === tipo)), [leads, tipo]);

  const ganados = leads.filter((l) => l.estado === "ganado").length;
  const cerrados = leads.filter((l) => l.estado === "ganado" || l.estado === "perdido").length;
  const conversion = cerrados > 0 ? Math.round((ganados / cerrados) * 100) : 0;
  const sinAsignar = leads.filter((l) => l.asesor === "Sin asignar").length;

  function actualizarLead(id: string, cambios: Partial<Lead>) {
    setLeads((previos) => previos.map((l) => (l.id === id ? { ...l, ...cambios } : l)));
    setSeleccionado((previo) => (previo && previo.id === id ? { ...previo, ...cambios } : previo));
  }

  function guardarNota() {
    if (!seleccionado || !nota.trim()) return;
    actualizarLead(seleccionado.id, { nota: nota.trim(), ultima_gestion: new Date().toISOString() });
    setNota("");
    toast({ type: "success", title: "Gestión registrada", description: "La nota queda en la traza del lead." });
  }

  return (
    <div>
      <PageHeader
        titulo="Leads / CRM"
        descripcion="Pipeline comercial de propietarios que quieren publicar y arrendatarios que buscan inmueble."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard etiqueta="Leads activos" valor={leads.length - cerrados} detalle={`${leads.length} en total`} />
        <StatCard etiqueta="Conversión" valor={`${conversion}%`} detalle={`${ganados} ganados de ${cerrados} cerrados`} tono={conversion >= 50 ? "exito" : "alerta"} />
        <StatCard etiqueta="Sin asignar" valor={sinAsignar} detalle="Requieren asesor" tono={sinAsignar > 0 ? "alerta" : "exito"} />
        <StatCard
          etiqueta="Canon promedio buscado"
          valor={formatoMoneda(Math.round(leads.reduce((s, l) => s + l.canon_objetivo, 0) / leads.length))}
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {(["todos", "arrendatario", "propietario"] as const).map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => setTipo(valor)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tipo === valor ? "bg-ink-900 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:ring-ink-400"
            }`}
          >
            {valor === "todos" ? "Todos" : valor === "arrendatario" ? "Arrendatarios" : "Propietarios"}
          </button>
        ))}
      </div>

      {/* Pipeline por estado */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {ESTADOS_LEAD.map((columna) => {
          const items = visibles.filter((l) => l.estado === columna.clave);
          return (
            <div key={columna.clave} className="rounded-xl2 bg-ink-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-700">{columna.titulo}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink-500">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((lead) => (
                  <TarjetaLead key={lead.id} lead={lead} onAbrir={() => setSeleccionado(lead)} />
                ))}
                {items.length === 0 && <p className="text-xs text-ink-400">Sin leads</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalle */}
      <Drawer open={seleccionado !== null} onClose={() => setSeleccionado(null)} title={seleccionado?.nombre ?? ""}>
        {seleccionado && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tono={seleccionado.tipo === "propietario" ? "violeta" : "neutro"}>
                {seleccionado.tipo === "propietario" ? "Propietario" : "Arrendatario"}
              </Badge>
              <Badge tono={TONOS[seleccionado.estado]}>
                {ESTADOS_LEAD.find((e) => e.clave === seleccionado.estado)?.titulo}
              </Badge>
              <Badge tono="neutro">Origen: {seleccionado.origen}</Badge>
            </div>

            <dl className="space-y-2.5 text-sm">
              {[
                ["Interés", seleccionado.interes],
                ["Ciudad", seleccionado.ciudad],
                ["Canon objetivo", formatoMoneda(seleccionado.canon_objetivo)],
                ["Teléfono", seleccionado.telefono],
                ["Correo", seleccionado.correo],
                ["Creado", new Date(seleccionado.creado_en).toLocaleString("es-CO")],
                ["Última gestión", new Date(seleccionado.ultima_gestion).toLocaleString("es-CO")],
              ].map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex justify-between gap-4 border-b border-ink-100 pb-2">
                  <dt className="text-ink-500">{etiqueta}</dt>
                  <dd className="text-right font-medium text-ink-900">{valor}</dd>
                </div>
              ))}
            </dl>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="estado_lead" className="label-field">
                  Estado
                </label>
                <select
                  id="estado_lead"
                  className="input-field"
                  value={seleccionado.estado}
                  onChange={(e) => actualizarLead(seleccionado.id, { estado: e.target.value as EstadoLead })}
                >
                  {ESTADOS_LEAD.map((estado) => (
                    <option key={estado.clave} value={estado.clave}>
                      {estado.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="asesor_lead" className="label-field">
                  Asesor asignado
                </label>
                <select
                  id="asesor_lead"
                  className="input-field"
                  value={seleccionado.asesor}
                  onChange={(e) => actualizarLead(seleccionado.id, { asesor: e.target.value })}
                >
                  {ASESORES.map((asesor) => (
                    <option key={asesor}>{asesor}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="label-field">Última nota</p>
              <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-600">{seleccionado.nota}</p>
            </div>

            <div>
              <label htmlFor="nueva_nota" className="label-field">
                Registrar gestión
              </label>
              <textarea
                id="nueva_nota"
                rows={3}
                className="input-field"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Qué se habló, próximos pasos, compromisos…"
              />
              <button type="button" onClick={guardarNota} disabled={!nota.trim()} className="btn-primary mt-3 w-full">
                Guardar gestión
              </button>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
              <a href={`tel:+57${seleccionado.telefono}`} className="btn-secondary px-4 py-2 text-xs">
                Llamar
              </a>
              <a
                href={`https://wa.me/57${seleccionado.telefono}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary px-4 py-2 text-xs"
              >
                WhatsApp
              </a>
              <a href={`mailto:${seleccionado.correo}`} className="btn-secondary px-4 py-2 text-xs">
                Correo
              </a>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
