"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { INMUEBLES_PROPIETARIO, LEADS, type Lead } from "@/lib/demo";
import { formatoMoneda } from "@/lib/format";

/**
 * Interesados que ha recibido el propietario. A diferencia del CRM del backoffice, aquí no se ve
 * el pipeline comercial interno ni el asesor asignado: solo el contacto y qué buscan.
 */
const INTERESADOS: (Lead & { inmueble_id: string })[] = LEADS.filter((l) => l.tipo === "arrendatario").map(
  (lead, i) => ({ ...lead, inmueble_id: INMUEBLES_PROPIETARIO[i % INMUEBLES_PROPIETARIO.length].id })
);

function tiempoRelativo(iso: string): string {
  const dias = Math.floor((Date.parse("2026-08-10T12:00:00Z") - Date.parse(iso)) / 86400000);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  return `Hace ${dias} días`;
}

export default function LeadsPropietarioPage() {
  const [inmuebleFiltro, setInmuebleFiltro] = useState("todos");

  const visibles = useMemo(
    () => (inmuebleFiltro === "todos" ? INTERESADOS : INTERESADOS.filter((l) => l.inmueble_id === inmuebleFiltro)),
    [inmuebleFiltro]
  );

  return (
    <div>
      <PageHeader
        titulo="Interesados"
        descripcion="Personas que pidieron información sobre tus inmuebles. Un asesor las contacta, pero puedes escribirles directamente."
      />

      <div className="mb-6">
        <label htmlFor="inmueble" className="label-field">
          Filtrar por inmueble
        </label>
        <select
          id="inmueble"
          className="input-field sm:max-w-md"
          value={inmuebleFiltro}
          onChange={(e) => setInmuebleFiltro(e.target.value)}
        >
          <option value="todos">Todos los inmuebles</option>
          {INMUEBLES_PROPIETARIO.map((inmueble) => (
            <option key={inmueble.id} value={inmueble.id}>
              {inmueble.titulo}
            </option>
          ))}
        </select>
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          titulo="Todavía no hay interesados en este inmueble"
          descripcion="Los avisos con fotos completas y descripción detallada reciben hasta tres veces más contactos."
        />
      ) : (
        <div className="space-y-3">
          {visibles.map((lead) => {
            const inmueble = INMUEBLES_PROPIETARIO.find((i) => i.id === lead.inmueble_id);
            return (
              <article key={lead.id} className="rounded-xl2 bg-white p-5 shadow-card ring-1 ring-ink-900/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-ink-900">{lead.nombre}</h2>
                    <p className="mt-0.5 text-sm text-ink-500">{lead.interes}</p>
                    <p className="mt-1 text-xs text-ink-400">
                      Interesado en {inmueble?.titulo ?? "un inmueble"} · {tiempoRelativo(lead.creado_en)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tono={lead.estado === "calificado" ? "exito" : lead.estado === "nuevo" ? "info" : "neutro"}>
                      {lead.estado === "calificado" ? "Ya pasó el estudio" : lead.estado === "nuevo" ? "Nuevo" : "En gestión"}
                    </Badge>
                    <span className="text-sm font-semibold text-ink-900">
                      Busca hasta {formatoMoneda(lead.canon_objetivo)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
                  <a href={`tel:+57${lead.telefono}`} className="btn-secondary px-4 py-2 text-xs">
                    Llamar
                  </a>
                  <a
                    href={`https://wa.me/57${lead.telefono}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary px-4 py-2 text-xs"
                  >
                    WhatsApp
                  </a>
                  <a href={`mailto:${lead.correo}`} className="btn-secondary px-4 py-2 text-xs">
                    Correo
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
