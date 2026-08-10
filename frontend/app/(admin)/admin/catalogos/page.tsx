"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  obtenerDivipola,
  buscarCiiu,
  obtenerEstructuraCiiu,
  obtenerCatalogosOperativos,
  actualizarCatalogoOperativo,
} from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

/* ------------------------------------------------------------------ */
/*  Types (shape of the api.ts responses)                              */
/* ------------------------------------------------------------------ */

interface Municipio {
  cod: string;
  nombre: string;
}

interface Departamento {
  cod: string;
  nombre: string;
  municipios: Municipio[];
}

interface ResultadoCiiu {
  codigo: string;
  descripcion: string;
  seccion: string;
  seccion_nombre: string;
  division: string;
  division_nombre: string;
}

interface EstructuraCiiu {
  secciones: { codigo: string; nombre: string; divisiones: string }[];
  divisiones: { codigo: string; seccion: string; nombre: string; clases_cargadas: number }[];
  total_clases: number;
  total_oficial: number;
}

/* ------------------------------------------------------------------ */
/*  Metadata for operative catalogs                                    */
/* ------------------------------------------------------------------ */

const TITULOS_OPERATIVOS: Record<string, string> = {
  tipo_inmueble: "Tipos de inmueble",
  tipo_contrato: "Tipos de contrato laboral",
  tipo_documento: "Tipos de documento",
  parentescos: "Parentescos",
  periodicidades: "Periodicidades de pago",
  situaciones_laborales: "Situaciones laborales",
  tipo_obligacion: "Tipos de obligación financiera",
  estados_civiles: "Estados civiles",
  paises: "Países",
};

/* ------------------------------------------------------------------ */
/*  Small UI atoms                                                     */
/* ------------------------------------------------------------------ */

function IconoCheck() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M6.5 10.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

function IconoInfo() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-sky-600" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9v4.5M10 6.5v.01" />
    </svg>
  );
}

function Cargando() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-300 border-t-transparent" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 1 — DIVIPOLA                                                   */
/* ------------------------------------------------------------------ */

function TabDivipola() {
  const [departamentos, setDepartamentos] = useState<Departamento[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dptoSel, setDptoSel] = useState<string>("");

  useEffect(() => {
    obtenerDivipola()
      .then((res) => {
        setDepartamentos(res.departamentos);
        if (res.departamentos.length > 0) {
          const bogota = res.departamentos.find((d) => d.cod === "11");
          setDptoSel((bogota ?? res.departamentos[0]).cod);
        }
      })
      .catch(() => setError("No fue posible cargar el catálogo DIVIPOLA."));
  }, []);

  if (error) return <p className="py-10 text-center text-sm text-rose-600">{error}</p>;
  if (!departamentos) return <Cargando />;

  const totalMunicipios = departamentos.reduce((acc, d) => acc + d.municipios.length, 0);
  const seleccionado = departamentos.find((d) => d.cod === dptoSel);

  return (
    <div className="space-y-5">
      {/* Success alert */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <IconoCheck />
        <div className="text-sm text-emerald-900">
          <p className="font-semibold">Catálogo oficial cargado — DIVIPOLA · DANE</p>
          <p className="mt-0.5 text-emerald-800">
            Datos Abiertos Colombia: <b>{departamentos.length} departamentos</b> y{" "}
            <b>{totalMunicipios} municipios y áreas</b> con su código oficial. El portal solo
            muestra los del departamento que elija el solicitante.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-ink-500">Departamentos</p>
          <p className="mt-2 text-3xl font-semibold text-ink-900">{departamentos.length}</p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-ink-500">Municipios y áreas</p>
          <p className="mt-2 text-3xl font-semibold text-ink-900">{totalMunicipios}</p>
          <p className="mt-1 text-xs text-ink-400">Con código DANE oficial</p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-ink-500">Uso en el portal</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">Dependiente</p>
          <p className="mt-1 text-xs text-ink-400">El municipio se filtra por departamento</p>
        </div>
      </div>

      {/* Two-column lists */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">Departamentos</h3>
            <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-600">
              {departamentos.length}
            </span>
          </div>
          <div className="max-h-[420px] overflow-y-auto px-5 py-2">
            {departamentos.map((d) => (
              <div key={d.cod} className="flex items-center justify-between border-b border-dashed border-ink-100 py-2 last:border-b-0">
                <span className="text-sm text-ink-800">{d.nombre}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-ink-400">{d.municipios.length} municipios</span>
                  <span className="font-mono text-xs text-ink-400">{d.cod}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
          <div className="border-b border-ink-100 px-5 py-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">Municipios por departamento</h3>
            <p className="mt-0.5 text-xs text-ink-400">
              {seleccionado ? `${seleccionado.municipios.length} municipios` : ""}
            </p>
          </div>
          <div className="space-y-3 px-5 py-4">
            <div>
              <label htmlFor="cat-dpto" className="label-field">Departamento</label>
              <select
                id="cat-dpto"
                className="input-field"
                value={dptoSel}
                onChange={(e) => setDptoSel(e.target.value)}
              >
                {departamentos.map((d) => (
                  <option key={d.cod} value={d.cod}>{d.nombre}</option>
                ))}
              </select>
            </div>
            <div className="max-h-[340px] overflow-y-auto">
              {seleccionado?.municipios.map((m) => (
                <div key={m.cod} className="flex items-center justify-between border-b border-dashed border-ink-100 py-2 last:border-b-0">
                  <span className="text-sm text-ink-800">{m.nombre}</span>
                  <span className="font-mono text-xs text-ink-400">{m.cod}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 2 — CIIU                                                       */
/* ------------------------------------------------------------------ */

function TabCiiu() {
  const [estructura, setEstructura] = useState<EstructuraCiiu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoCiiu[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    obtenerEstructuraCiiu()
      .then(setEstructura)
      .catch(() => setError("No fue posible cargar la estructura CIIU."));
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResultados(null);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    timerRef.current = setTimeout(() => {
      buscarCiiu(q)
        .then((res) => setResultados(res))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false));
    }, 200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  if (error) return <p className="py-10 text-center text-sm text-rose-600">{error}</p>;
  if (!estructura) return <Cargando />;

  const cobertura = estructura.total_oficial > 0
    ? Math.round((estructura.total_clases / estructura.total_oficial) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Info alert */}
      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
        <IconoInfo />
        <div className="text-sm text-sky-900">
          <p className="font-semibold">Estructura oficial CIIU Rev. 4 A.C. (DANE)</p>
          <p className="mt-0.5 text-sky-800">
            Secciones y divisiones completas ({estructura.secciones.length} y {estructura.divisiones.length}).
            Clases cargadas: <b>{estructura.total_clases} de {estructura.total_oficial}</b> ({cobertura}% de cobertura),
            priorizando las actividades más frecuentes en solicitudes de arrendamiento.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
        <div className="border-b border-ink-100 px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">Buscar una actividad</h3>
        </div>
        <div className="space-y-4 px-5 py-4">
          <input
            type="text"
            className="input-field"
            placeholder="Escribe una actividad: software, restaurante, transporte de carga…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="space-y-2">
            {buscando && <p className="py-4 text-center text-sm text-ink-400">Buscando…</p>}
            {!buscando && resultados === null && (
              <div className="rounded-lg bg-ink-50 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-ink-700">Busca una actividad económica</p>
                <p className="mt-1 text-xs text-ink-500">
                  Así la encuentra el solicitante en el portal. Prueba con &quot;software&quot;,
                  &quot;restaurante&quot; o &quot;transporte&quot;.
                </p>
              </div>
            )}
            {!buscando && resultados !== null && resultados.length === 0 && (
              <div className="rounded-lg bg-ink-50 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-ink-700">Sin resultados</p>
                <p className="mt-1 text-xs text-ink-500">
                  Prueba con otra palabra: &quot;software&quot;, &quot;restaurante&quot;, &quot;transporte&quot;…
                </p>
              </div>
            )}
            {!buscando &&
              resultados?.map((r) => (
                <div key={r.codigo} className="flex items-start gap-3 rounded-lg border border-ink-100 px-3 py-2.5">
                  <span className="mt-0.5 rounded-md bg-ink-900 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                    {r.codigo}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-800">{r.descripcion}</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {r.seccion_nombre} › {r.division_nombre}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Estructura */}
      <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">Estructura</h3>
          <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-600">
            {estructura.secciones.length} secciones · {estructura.divisiones.length} divisiones
          </span>
        </div>
        <div className="space-y-3 px-5 py-4">
          {estructura.secciones.map((s) => {
            const divisiones = estructura.divisiones.filter((d) => d.seccion === s.codigo);
            return (
              <details key={s.codigo} className="rounded-lg border border-ink-100 bg-ink-50/50 px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink-800">
                  {s.codigo} · {s.nombre}
                  <span className="ml-2 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-500">
                    Divisiones {s.divisiones}
                  </span>
                </summary>
                <div className="mt-3 space-y-1">
                  {divisiones.map((d) => (
                    <div key={d.codigo} className="flex items-center gap-3 border-b border-dashed border-ink-100 py-1.5 last:border-b-0">
                      <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs font-semibold text-ink-700 ring-1 ring-ink-200">
                        {d.codigo}
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-ink-700">{d.nombre}</span>
                      <span className="shrink-0 text-xs text-ink-400">
                        {d.clases_cargadas} clase(s) cargadas
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 3 — Catálogos operativos                                       */
/* ------------------------------------------------------------------ */

function CardOperativo({
  clave,
  valores,
  onGuardar,
}: {
  clave: string;
  valores: string[];
  onGuardar: (clave: string, nuevos: string[]) => Promise<void>;
}) {
  const [nuevo, setNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function agregar() {
    const v = nuevo.trim();
    if (!v || valores.includes(v)) return;
    setGuardando(true);
    try {
      await onGuardar(clave, [...valores, v]);
      setNuevo("");
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(valor: string) {
    setGuardando(true);
    try {
      await onGuardar(clave, valores.filter((x) => x !== valor));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-ink-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-ink-800">
          {TITULOS_OPERATIVOS[clave] ?? clave}
        </h3>
        <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-600">
          {valores.length}
        </span>
      </div>
      <div className="max-h-[260px] flex-1 overflow-y-auto px-4 py-2">
        {valores.map((v) => (
          <div key={v} className="flex items-center justify-between gap-2 border-b border-dashed border-ink-100 py-1.5 last:border-b-0">
            <span className="min-w-0 truncate text-sm text-ink-800" title={v}>{v}</span>
            <button
              type="button"
              onClick={() => quitar(v)}
              disabled={guardando}
              aria-label={`Quitar ${v}`}
              title="Quitar valor"
              className="shrink-0 rounded-full p-1 text-ink-300 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
        {valores.length === 0 && (
          <p className="py-4 text-center text-xs text-ink-400">Sin valores. Agrega el primero.</p>
        )}
      </div>
      <div className="flex gap-2 border-t border-ink-100 px-4 py-3">
        <input
          type="text"
          className="input-field flex-1 text-sm"
          placeholder="Nuevo valor"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void agregar();
            }
          }}
        />
        <button
          type="button"
          className="btn-secondary shrink-0 px-3 py-1.5 text-sm"
          onClick={() => void agregar()}
          disabled={guardando || nuevo.trim().length === 0}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

function TabOperativos() {
  const { toast } = useToast();
  const [catalogos, setCatalogos] = useState<Record<string, string[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerCatalogosOperativos()
      .then(setCatalogos)
      .catch(() => setError("No fue posible cargar los catálogos operativos."));
  }, []);

  async function guardar(clave: string, nuevos: string[]) {
    try {
      const res = await actualizarCatalogoOperativo(clave, nuevos);
      setCatalogos(res);
      toast({
        type: "success",
        title: "Catálogo actualizado",
        description: `${TITULOS_OPERATIVOS[clave] ?? clave}: ${nuevos.length} valores.`,
      });
    } catch {
      toast({
        type: "error",
        title: "No se pudo guardar",
        description: "Intenta de nuevo en unos segundos.",
      });
    }
  }

  if (error) return <p className="py-10 text-center text-sm text-rose-600">{error}</p>;
  if (!catalogos) return <Cargando />;

  const claves = Object.keys(TITULOS_OPERATIVOS).filter((k) => k in catalogos);
  const extras = Object.keys(catalogos).filter((k) => !(k in TITULOS_OPERATIVOS));
  const orden = [...claves, ...extras];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50 p-4">
        <IconoInfo />
        <p className="text-sm text-ink-700">
          Estas listas se usan en los formularios del portal. Editarlas cambia lo que ven los
          solicitantes.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {orden.map((clave) => (
          <CardOperativo key={clave} clave={clave} valores={catalogos[clave]} onGuardar={guardar} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: "divipola", label: "DIVIPOLA (departamentos y municipios)" },
  { id: "ciiu", label: "CIIU Rev. 4 A.C." },
  { id: "operativos", label: "Catálogos operativos" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function CatalogosAdminPage() {
  const [tab, setTab] = useState<TabId>("divipola");

  const contenido = useMemo(() => {
    switch (tab) {
      case "divipola":
        return <TabDivipola />;
      case "ciiu":
        return <TabCiiu />;
      case "operativos":
        return <TabOperativos />;
    }
  }, [tab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Catálogos</h1>
        <p className="mt-1 text-sm text-ink-500">
          Listas maestras que alimentan el portal y el backoffice. Los catálogos geográficos y de
          actividad económica provienen de fuentes oficiales del DANE.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === t.id ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {contenido}
    </div>
  );
}
