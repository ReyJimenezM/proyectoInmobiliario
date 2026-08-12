"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { actualizarLeadAdmin, listarLeadsAdmin } from "@/lib/api";
import {
  ESTADOS_LEAD_CRM,
  type EstadoLeadCrm,
  type LeadCrm,
  type LeadsResumen,
  type TipoLeadCrm,
} from "@/lib/types";

const SIN_ASIGNAR = "Sin asignar";

const TONOS: Record<EstadoLeadCrm, "neutro" | "info" | "alerta" | "exito" | "error"> = {
  nuevo: "info",
  contactado: "neutro",
  en_gestion: "alerta",
  calificado: "info",
  ganado: "exito",
  perdido: "error",
};

const ETIQUETAS_TIPO: Record<TipoLeadCrm, string> = {
  inmobiliaria: "Inmobiliaria",
  arrendatario: "Arrendatario",
  propietario: "Propietario",
};

const FILTROS_TIPO: { valor: "todos" | TipoLeadCrm; texto: string }[] = [
  { valor: "todos", texto: "Todos" },
  { valor: "inmobiliaria", texto: "Inmobiliarias" },
  { valor: "arrendatario", texto: "Arrendatarios" },
  { valor: "propietario", texto: "Propietarios" },
];

const RESUMEN_VACIO: LeadsResumen = {
  total: 0,
  activos: 0,
  ganados: 0,
  cerrados: 0,
  sin_asignar: 0,
  agendados: 0,
};

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Solo dígitos: los enlaces de tel: y wa.me no toleran espacios ni paréntesis. */
function soloDigitos(telefono: string): string {
  return telefono.replace(/\D/g, "");
}

function TarjetaLead({ lead, onAbrir }: { lead: LeadCrm; onAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="w-full rounded-lg border border-ink-100 bg-white p-3 text-left shadow-sm transition hover:shadow-md"
    >
      <p className="truncate text-sm font-semibold text-ink-900">{lead.nombre}</p>
      <p className="mt-0.5 truncate text-xs text-ink-500">
        {lead.empresa || lead.interes || lead.correo}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tono={lead.tipo === "inmobiliaria" ? "violeta" : "neutro"}>
          {ETIQUETAS_TIPO[lead.tipo]}
        </Badge>
        {lead.agendado_en && <Badge tono="exito">Agendado</Badge>}
      </div>
      <p className="mt-2 truncate text-xs text-ink-400">{lead.asesor || SIN_ASIGNAR}</p>
    </button>
  );
}

export default function LeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadCrm[]>([]);
  const [resumen, setResumen] = useState<LeadsResumen>(RESUMEN_VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"todos" | TipoLeadCrm>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<LeadCrm | null>(null);
  const [nota, setNota] = useState("");
  const [asesor, setAsesor] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await listarLeadsAdmin({
        tipo: tipo === "todos" ? undefined : tipo,
        q: busqueda.trim() || undefined,
      });
      setLeads(datos.leads);
      setResumen(datos.resumen);
    } catch {
      setError("No pudimos cargar los leads. Revisa tu conexión con el backend e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }, [tipo, busqueda]);

  // La búsqueda se manda al backend, así que se espera a que la persona deje de escribir.
  useEffect(() => {
    const temporizador = setTimeout(cargar, busqueda ? 350 : 0);
    return () => clearTimeout(temporizador);
  }, [cargar, busqueda]);

  const conversion = resumen.cerrados > 0 ? Math.round((resumen.ganados / resumen.cerrados) * 100) : 0;

  // Los asesores que ya aparecen en los leads: evita escribir el mismo nombre distinto
  // cada vez sin inventar un catálogo que el backend todavía no tiene.
  const asesores = useMemo(() => {
    const nombres = new Set(leads.map((lead) => lead.asesor).filter((a): a is string => Boolean(a)));
    return [...nombres].sort();
  }, [leads]);

  async function guardar(cambios: { estado?: EstadoLeadCrm; asesor?: string; nota?: string }) {
    if (!seleccionado) return;
    setGuardando(true);
    try {
      const actualizado = await actualizarLeadAdmin(seleccionado.id, cambios);
      setLeads((previos) => previos.map((lead) => (lead.id === actualizado.id ? actualizado : lead)));
      setSeleccionado(actualizado);
      // El resumen lo calcula el backend sobre el filtro vigente: se refresca aparte.
      listarLeadsAdmin({ tipo: tipo === "todos" ? undefined : tipo, q: busqueda.trim() || undefined })
        .then((datos) => setResumen(datos.resumen))
        .catch(() => undefined);
      return true;
    } catch {
      toast({
        type: "error",
        title: "No se pudo guardar",
        description: "El cambio no quedó registrado. Vuelve a intentarlo.",
      });
      return false;
    } finally {
      setGuardando(false);
    }
  }

  function abrir(lead: LeadCrm) {
    setSeleccionado(lead);
    setNota("");
    setAsesor(lead.asesor ?? "");
  }

  const asesorCambio = Boolean(seleccionado) && asesor.trim() !== (seleccionado?.asesor ?? "");
  const hayGestion = Boolean(nota.trim()) || asesorCambio;

  /** Guarda asesor y nota en una sola acción explícita: nada se envía al perder el foco,
   *  que es justo donde se pierden los cambios sin que nadie se entere. */
  async function guardarGestion() {
    if (!hayGestion) return;
    const cambios: { asesor?: string; nota?: string } = {};
    if (asesorCambio) cambios.asesor = asesor.trim();
    if (nota.trim()) cambios.nota = nota.trim();

    const ok = await guardar(cambios);
    if (ok) {
      setNota("");
      toast({
        type: "success",
        title: "Gestión registrada",
        description: "Queda en la traza de auditoría del lead.",
      });
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Leads / CRM"
        descripcion="Contactos que llegan de la landing y del resto de canales: inmobiliarias que piden demo, y propietarios y arrendatarios que dejan sus datos."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard etiqueta="Leads activos" valor={resumen.activos} detalle={`${resumen.total} en total`} />
        <StatCard
          etiqueta="Conversión"
          valor={`${conversion}%`}
          detalle={`${resumen.ganados} ganados de ${resumen.cerrados} cerrados`}
          tono={conversion >= 50 ? "exito" : "alerta"}
        />
        <StatCard
          etiqueta="Sin asignar"
          valor={resumen.sin_asignar}
          detalle="Requieren asesor"
          tono={resumen.sin_asignar > 0 ? "alerta" : "exito"}
        />
        <StatCard
          etiqueta="Con reunión agendada"
          valor={resumen.agendados}
          detalle="Confirmadas desde el calendario"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTROS_TIPO.map((filtro) => (
            <button
              key={filtro.valor}
              type="button"
              onClick={() => setTipo(filtro.valor)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tipo === filtro.valor
                  ? "bg-ink-900 text-white"
                  : "bg-white text-ink-600 ring-1 ring-ink-200 hover:ring-ink-400"
              }`}
            >
              {filtro.texto}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, correo, empresa o radicado…"
          className="input-field ml-auto w-full sm:w-80"
          aria-label="Buscar leads"
        />
      </div>

      {error && (
        <div className="mb-5 rounded-xl2 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">{error}</p>
          <button type="button" onClick={cargar} className="btn-secondary mt-3 px-4 py-2 text-xs">
            Reintentar
          </button>
        </div>
      )}

      {cargando && leads.length === 0 && !error ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {ESTADOS_LEAD_CRM.map((columna) => (
            <div key={columna.clave} className="h-40 animate-pulse rounded-xl2 bg-ink-50" />
          ))}
        </div>
      ) : leads.length === 0 && !error ? (
        <EmptyState
          titulo="Todavía no hay leads en esta vista"
          descripcion={
            busqueda || tipo !== "todos"
              ? "Cambia el filtro o limpia la búsqueda para ver el resto del pipeline."
              : "Cuando alguien llene el formulario de la landing, su contacto aparece aquí como “Nuevo”."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {ESTADOS_LEAD_CRM.map((columna) => {
            const items = leads.filter((lead) => lead.estado === columna.clave);
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
                    <TarjetaLead key={lead.id} lead={lead} onAbrir={() => abrir(lead)} />
                  ))}
                  {items.length === 0 && <p className="text-xs text-ink-400">Sin leads</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detalle */}
      <Drawer
        open={seleccionado !== null}
        onClose={() => {
          setSeleccionado(null);
          setNota("");
          setAsesor("");
        }}
        title={seleccionado?.nombre ?? ""}
      >
        {seleccionado && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tono={seleccionado.tipo === "inmobiliaria" ? "violeta" : "neutro"}>
                {ETIQUETAS_TIPO[seleccionado.tipo]}
              </Badge>
              <Badge tono={TONOS[seleccionado.estado]}>
                {ESTADOS_LEAD_CRM.find((e) => e.clave === seleccionado.estado)?.titulo}
              </Badge>
              <Badge tono="neutro">Origen: {seleccionado.origen}</Badge>
              {seleccionado.agendado_en && <Badge tono="exito">Reunión agendada</Badge>}
            </div>

            <dl className="space-y-2.5 text-sm">
              {(
                [
                  ["Radicado", seleccionado.codigo],
                  ["Empresa", seleccionado.empresa],
                  ["Inmuebles administrados", seleccionado.inmuebles],
                  ["Interés", seleccionado.interes],
                  ["Ciudad", seleccionado.ciudad],
                  ["Teléfono", seleccionado.telefono],
                  ["Correo", seleccionado.correo],
                  ["Campaña", seleccionado.utm_campaign],
                  ["Página de origen", seleccionado.pagina],
                  ["Creado", fechaCorta(seleccionado.creado_en)],
                  ["Última gestión", fechaCorta(seleccionado.ultima_gestion)],
                  ["Agendado", seleccionado.agendado_en ? fechaCorta(seleccionado.agendado_en) : null],
                ] as [string, string | null][]
              )
                .filter(([, valor]) => Boolean(valor))
                .map(([etiqueta, valor]) => (
                  <div key={etiqueta} className="flex justify-between gap-4 border-b border-ink-100 pb-2">
                    <dt className="text-ink-500">{etiqueta}</dt>
                    <dd className="break-all text-right font-medium text-ink-900">{valor}</dd>
                  </div>
                ))}
            </dl>

            {seleccionado.mensaje && (
              <div>
                <p className="label-field">Lo que escribió</p>
                <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-600">{seleccionado.mensaje}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="estado_lead" className="label-field">
                  Estado
                </label>
                <select
                  id="estado_lead"
                  className="input-field"
                  disabled={guardando}
                  value={seleccionado.estado}
                  onChange={(e) => guardar({ estado: e.target.value as EstadoLeadCrm })}
                >
                  {ESTADOS_LEAD_CRM.map((estado) => (
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
                <input
                  id="asesor_lead"
                  list="asesores_conocidos"
                  className="input-field"
                  disabled={guardando}
                  value={asesor}
                  onChange={(e) => setAsesor(e.target.value)}
                  placeholder={SIN_ASIGNAR}
                />
                <datalist id="asesores_conocidos">
                  {asesores.map((nombre) => (
                    <option key={nombre} value={nombre} />
                  ))}
                </datalist>
              </div>
            </div>

            {seleccionado.nota && (
              <div>
                <p className="label-field">Última nota</p>
                <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-600">{seleccionado.nota}</p>
              </div>
            )}

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
              <button
                type="button"
                onClick={guardarGestion}
                disabled={!hayGestion || guardando}
                className="btn-primary mt-3 w-full"
              >
                {guardando ? "Guardando…" : "Guardar gestión"}
              </button>
              {asesorCambio && !nota.trim() && (
                <p className="mt-2 text-xs text-ink-500">Se guardará el cambio de asesor.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
              <a href={`tel:+57${soloDigitos(seleccionado.telefono)}`} className="btn-secondary px-4 py-2 text-xs">
                Llamar
              </a>
              <a
                href={`https://wa.me/57${soloDigitos(seleccionado.telefono)}`}
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
