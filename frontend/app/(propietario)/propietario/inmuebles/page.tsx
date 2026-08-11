"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  ETIQUETAS_ESTADO_INMUEBLE,
  INMUEBLES_PROPIETARIO,
  type EstadoInmueble,
  type InmueblePropietario,
} from "@/lib/demo";
import { formatoMoneda } from "@/lib/format";

const FILTROS: { clave: EstadoInmueble | "todos"; etiqueta: string }[] = [
  { clave: "todos", etiqueta: "Todos" },
  { clave: "disponible", etiqueta: "Disponibles" },
  { clave: "reservado", etiqueta: "Reservados" },
  { clave: "arrendado", etiqueta: "Arrendados" },
  { clave: "en_revision", etiqueta: "En revisión" },
  { clave: "borrador", etiqueta: "Borradores" },
];

const TONOS: Record<EstadoInmueble, "exito" | "info" | "alerta" | "neutro"> = {
  arrendado: "exito",
  reservado: "info",
  en_revision: "alerta",
  disponible: "neutro",
  borrador: "neutro",
};

function TarjetaInmueble({
  inmueble,
  onCambiarEstado,
}: {
  inmueble: InmueblePropietario;
  onCambiarEstado: (estado: EstadoInmueble) => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl2 bg-white shadow-card ring-1 ring-ink-900/5">
      <div
        className="h-40 bg-ink-100 bg-cover bg-center"
        style={{ backgroundImage: `url(${inmueble.imagen})` }}
        role="presentation"
      />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-ink-900">{inmueble.titulo}</h2>
            <p className="truncate text-xs text-ink-500">
              {inmueble.direccion} · {inmueble.ciudad}
            </p>
          </div>
          <Badge tono={TONOS[inmueble.estado]}>{ETIQUETAS_ESTADO_INMUEBLE[inmueble.estado]}</Badge>
        </div>

        <p className="mt-3 text-lg font-semibold text-ink-900">
          {formatoMoneda(inmueble.canon)}
          <span className="ml-1 text-xs font-normal text-ink-400">/ mes</span>
        </p>
        {inmueble.administracion > 0 && (
          <p className="text-xs text-ink-500">+ {formatoMoneda(inmueble.administracion)} de administración</p>
        )}

        <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-ink-100 py-3 text-center">
          <div>
            <dt className="text-xs text-ink-400">Área</dt>
            <dd className="text-sm font-semibold text-ink-800">{inmueble.area} m²</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Habitaciones</dt>
            <dd className="text-sm font-semibold text-ink-800">{inmueble.habitaciones || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Baños</dt>
            <dd className="text-sm font-semibold text-ink-800">{inmueble.banos}</dd>
          </div>
        </dl>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-500">
          <span>{inmueble.visitas} visitas</span>
          <span>·</span>
          <span>{inmueble.leads} interesados</span>
          <span>·</span>
          <span>{inmueble.acepta_mascotas ? "Acepta mascotas" : "Sin mascotas"}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label htmlFor={`estado-${inmueble.id}`} className="text-xs font-medium text-ink-500">
            Estado
          </label>
          <select
            id={`estado-${inmueble.id}`}
            className="input-field w-auto py-1.5 text-xs"
            value={inmueble.estado}
            onChange={(e) => onCambiarEstado(e.target.value as EstadoInmueble)}
          >
            {(Object.keys(ETIQUETAS_ESTADO_INMUEBLE) as EstadoInmueble[]).map((estado) => (
              <option key={estado} value={estado}>
                {ETIQUETAS_ESTADO_INMUEBLE[estado]}
              </option>
            ))}
          </select>

          <Link
            href={`/propietario/candidatos?inmueble=${inmueble.id}`}
            className="ml-auto text-xs font-semibold text-clay-600 hover:text-clay-700"
          >
            Ver candidatos →
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function InmueblesPropietarioPage() {
  const { toast } = useToast();
  const [inmuebles, setInmuebles] = useState<InmueblePropietario[]>(INMUEBLES_PROPIETARIO);
  const [filtro, setFiltro] = useState<EstadoInmueble | "todos">("todos");

  const visibles = useMemo(
    () => (filtro === "todos" ? inmuebles : inmuebles.filter((i) => i.estado === filtro)),
    [inmuebles, filtro]
  );

  function cambiarEstado(id: string, estado: EstadoInmueble) {
    setInmuebles((previos) => previos.map((i) => (i.id === id ? { ...i, estado } : i)));
    toast({
      type: "success",
      title: "Estado actualizado",
      description: `El inmueble quedó como ${ETIQUETAS_ESTADO_INMUEBLE[estado].toLowerCase()}.`,
    });
  }

  return (
    <div>
      <PageHeader
        titulo="Mis inmuebles"
        descripcion="Publica, actualiza la disponibilidad y revisa el desempeño de cada aviso."
        acciones={
          <Link href="/propietario/inmuebles/nuevo" className="btn-primary">
            Publicar inmueble
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const activo = filtro === f.clave;
          const cantidad = f.clave === "todos" ? inmuebles.length : inmuebles.filter((i) => i.estado === f.clave).length;
          return (
            <button
              key={f.clave}
              type="button"
              onClick={() => setFiltro(f.clave)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activo ? "bg-ink-900 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:ring-ink-400"
              }`}
            >
              {f.etiqueta}
              <span className={`ml-1.5 text-xs ${activo ? "text-ink-300" : "text-ink-400"}`}>{cantidad}</span>
            </button>
          );
        })}
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          titulo="No hay inmuebles en este estado"
          descripcion="Cambia el filtro o publica un inmueble nuevo para empezar a recibir interesados."
          accion={
            <Link href="/propietario/inmuebles/nuevo" className="btn-primary">
              Publicar inmueble
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((inmueble) => (
            <TarjetaInmueble
              key={inmueble.id}
              inmueble={inmueble}
              onCambiarEstado={(estado) => cambiarEstado(inmueble.id, estado)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
