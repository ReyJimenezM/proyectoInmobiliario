"use client";

import { useEffect, useMemo, useState } from "react";
import { listarProyectos } from "@/lib/api";
import { formatoMoneda, ETIQUETAS_TIPO_PROPIEDAD } from "@/lib/format";

type Proyecto = {
  id: string;
  nombre: string;
  constructora: string;
  descripcion?: string | null;
  ciudad: string;
  zona?: string | null;
  tipo: string;
  precio_desde?: number | string | null;
  precio_hasta?: number | string | null;
  area_desde?: number | string | null;
  area_hasta?: number | string | null;
  habitaciones_desde?: number | null;
  habitaciones_hasta?: number | null;
  fecha_entrega?: string | null;
  estado: string;
  imagen_url?: string | null;
  amenidades?: string[];
  financiacion_directa?: boolean;
  subsidio_aplicable?: boolean;
};

const ESTADOS: { valor: string; label: string; badge: string }[] = [
  { valor: "preventa", label: "Preventa", badge: "bg-amber-100 text-amber-800" },
  { valor: "en_construccion", label: "En construcción", badge: "bg-sky-100 text-sky-800" },
  { valor: "entrega_inmediata", label: "Entrega inmediata", badge: "bg-emerald-100 text-emerald-800" },
];

function badgeEstado(estado: string) {
  const found = ESTADOS.find((e) => e.valor === estado);
  return found ?? { valor: estado, label: estado, badge: "bg-ink-100 text-ink-700" };
}

function formatoRango(desde?: number | string | null, hasta?: number | string | null, fmt?: (v: number) => string) {
  const d = desde !== undefined && desde !== null ? Number(desde) : null;
  const h = hasta !== undefined && hasta !== null ? Number(hasta) : null;
  const f = fmt ?? ((v: number) => String(v));
  if (d && h && d !== h) return `${f(d)} - ${f(h)}`;
  if (d && !h) return f(d);
  if (!d && h) return f(h);
  if (d && h && d === h) return f(d);
  return null;
}

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [todosProyectos, setTodosProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const [ciudad, setCiudad] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");

  useEffect(() => {
    listarProyectos()
      .then((data) => setTodosProyectos(Array.isArray(data) ? data : []))
      .catch(() => setTodosProyectos([]));
  }, []);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(false);
    listarProyectos({ ciudad: ciudad || undefined, tipo: tipo || undefined })
      .then((data) => {
        if (activo) setProyectos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (activo) {
          setProyectos([]);
          setError(true);
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [ciudad, tipo]);

  const ciudades = useMemo(
    () => Array.from(new Set(todosProyectos.map((p) => p.ciudad).filter(Boolean))).sort(),
    [todosProyectos]
  );
  const tipos = useMemo(
    () => Array.from(new Set(todosProyectos.map((p) => p.tipo).filter(Boolean))).sort(),
    [todosProyectos]
  );

  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter((p) => (estado ? p.estado === estado : true));
  }, [proyectos, estado]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-semibold text-white sm:text-5xl">
          Nuevos Proyectos Inmobiliarios
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-100">
          Encuentra tu hogar desde planos con precios de preventa
        </p>
      </section>

      {/* Filtros */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="label-field">Ciudad</label>
            <select value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="input-field">
              <option value="">Todas las ciudades</option>
              {ciudades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="label-field">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input-field">
              <option value="">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {ETIQUETAS_TIPO_PROPIEDAD[t] ?? t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="label-field">Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="input-field">
              <option value="">Todos los estados</option>
              {ESTADOS.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Grid de proyectos */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {cargando ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-96 animate-pulse rounded-xl bg-ink-50" />
            ))}
          </div>
        ) : proyectosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white py-20 text-center">
            <p className="font-display text-2xl font-semibold text-ink-900">
              {error ? "No pudimos cargar los proyectos" : "No encontramos proyectos con esos filtros"}
            </p>
            <p className="mt-2 max-w-md text-ink-500">
              {error
                ? "Intenta de nuevo en unos minutos."
                : "Prueba ajustando la ciudad, el tipo o el estado del proyecto."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {proyectosFiltrados.map((proyecto) => (
              <ProyectoCard key={proyecto.id} proyecto={proyecto} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProyectoCard({ proyecto }: { proyecto: Proyecto }) {
  const est = badgeEstado(proyecto.estado);
  const rangoPrecio = formatoRango(proyecto.precio_desde, proyecto.precio_hasta, (v) => formatoMoneda(v));
  const rangoArea = formatoRango(proyecto.area_desde, proyecto.area_hasta, (v) => `${v} m²`);
  const rangoHabitaciones = formatoRango(proyecto.habitaciones_desde, proyecto.habitaciones_hasta);
  const amenidades = proyecto.amenidades ?? [];
  const amenidadesVisibles = amenidades.slice(0, 4);
  const amenidadesRestantes = amenidades.length - amenidadesVisibles.length;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm transition hover:shadow-card">
      <div className="relative h-48 w-full bg-ink-100">
        {proyecto.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proyecto.imagen_url} alt={proyecto.nombre} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-300">
            <span className="font-display text-lg">{proyecto.nombre}</span>
          </div>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${est.badge}`}>
          {est.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold text-ink-900">{proyecto.nombre}</h3>
        <p className="text-sm text-ink-500">{proyecto.constructora}</p>
        <p className="mt-1 text-sm text-ink-600">
          {proyecto.zona ? `${proyecto.zona}, ` : ""}
          {proyecto.ciudad}
        </p>

        <div className="mt-4 space-y-1.5 text-sm">
          {rangoPrecio && (
            <p className="font-semibold text-ink-900">
              Desde <span className="text-clay-600">{formatoMoneda(proyecto.precio_desde ?? 0)}</span>
              {proyecto.precio_hasta && proyecto.precio_hasta !== proyecto.precio_desde
                ? ` hasta ${formatoMoneda(proyecto.precio_hasta)}`
                : ""}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-ink-500">
            {rangoArea && <span>{rangoArea}</span>}
            {rangoHabitaciones && <span>{rangoHabitaciones} hab.</span>}
          </div>
          {proyecto.fecha_entrega && <p className="text-ink-500">Entrega: {proyecto.fecha_entrega}</p>}
        </div>

        {amenidadesVisibles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {amenidadesVisibles.map((a) => (
              <span key={a} className="rounded-full bg-sand-100 px-2.5 py-1 text-xs text-ink-600">
                {a}
              </span>
            ))}
            {amenidadesRestantes > 0 && (
              <span className="rounded-full bg-sand-100 px-2.5 py-1 text-xs text-ink-500">
                +{amenidadesRestantes} más
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {proyecto.financiacion_directa && (
            <span className="rounded-full bg-ink-800 px-2.5 py-1 text-xs font-medium text-white">
              Financiación directa
            </span>
          )}
          {proyecto.subsidio_aplicable && (
            <span className="rounded-full bg-clay-100 px-2.5 py-1 text-xs font-medium text-clay-700">
              Aplica subsidio
            </span>
          )}
        </div>

        <div className="mt-5 flex gap-2 pt-1">
          <a href={`/proyectos/${proyecto.id}`} className="btn-secondary flex-1 !px-4 !py-2 text-xs">
            Ver proyecto
          </a>
          <a
            href={`/simulador?precio=${Math.round(Number(proyecto.precio_desde ?? 0))}`}
            className="btn-primary flex-1 !px-4 !py-2 text-xs"
          >
            Simular crédito
          </a>
        </div>
      </div>
    </div>
  );
}
