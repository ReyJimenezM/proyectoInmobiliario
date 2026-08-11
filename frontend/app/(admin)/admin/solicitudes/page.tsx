"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, type TonoBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SlaBadge } from "@/components/ui/SlaBadge";
import { useToast } from "@/components/ui/Toast";
import { exportarSolicitudesCSV, listarSolicitudesAdmin } from "@/lib/api";
import { exportCSV } from "@/lib/csv";
import type { EstadoSolicitud, SolicitudOut } from "@/lib/types";

const ETIQUETAS_ESTADO: Record<EstadoSolicitud, string> = {
  borrador: "Borrador",
  enviada: "Nueva",
  en_evaluacion: "En evaluación",
  revision_manual: "En estudio",
  con_ruta_alterna: "Requiere codeudor",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

const TONOS_ESTADO: Record<EstadoSolicitud, TonoBadge> = {
  borrador: "neutro",
  enviada: "info",
  en_evaluacion: "info",
  revision_manual: "alerta",
  con_ruta_alterna: "violeta",
  aprobada: "exito",
  rechazada: "error",
};

/** SLA de referencia por estado, en horas. Se ajusta en /admin/parametrizacion. */
const SLA_HORAS: Partial<Record<EstadoSolicitud, number>> = {
  enviada: 4,
  en_evaluacion: 8,
  revision_manual: 24,
  con_ruta_alterna: 48,
};

const FILTROS: { clave: EstadoSolicitud | "todas"; etiqueta: string }[] = [
  { clave: "todas", etiqueta: "Todas" },
  { clave: "enviada", etiqueta: "Nuevas" },
  { clave: "en_evaluacion", etiqueta: "En evaluación" },
  { clave: "revision_manual", etiqueta: "En estudio" },
  { clave: "con_ruta_alterna", etiqueta: "Requiere codeudor" },
  { clave: "aprobada", etiqueta: "Aprobadas" },
  { clave: "rechazada", etiqueta: "Rechazadas" },
];

function nombreDe(solicitud: SolicitudOut): string {
  const datos = solicitud.datos_personales as { nombres_apellidos?: string; numero_documento?: string };
  return datos.nombres_apellidos?.trim() || "Sin nombre registrado";
}

function documentoDe(solicitud: SolicitudOut): string {
  const datos = solicitud.datos_personales as { numero_documento?: string };
  return datos.numero_documento ?? "—";
}

export default function SolicitudesAdminPage() {
  const { toast } = useToast();
  const [solicitudes, setSolicitudes] = useState<SolicitudOut[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<EstadoSolicitud | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<"recientes" | "antiguas">("recientes");

  useEffect(() => {
    listarSolicitudesAdmin()
      .then(setSolicitudes)
      .catch(() => setError("No pudimos cargar la cola de solicitudes."))
      .finally(() => setCargando(false));
  }, []);

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return solicitudes
      .filter((s) => (filtro === "todas" ? true : s.estado === filtro))
      .filter((s) =>
        termino ? nombreDe(s).toLowerCase().includes(termino) || documentoDe(s).includes(termino) : true
      )
      .sort((a, b) =>
        orden === "recientes" ? b.creado_en.localeCompare(a.creado_en) : a.creado_en.localeCompare(b.creado_en)
      );
  }, [solicitudes, filtro, busqueda, orden]);

  async function exportar() {
    try {
      const filas = (await exportarSolicitudesCSV()) as Record<string, unknown>[];
      if (filas.length === 0) {
        toast({ type: "info", title: "No hay datos para exportar" });
        return;
      }
      const encabezados = Object.keys(filas[0]);
      exportCSV(
        "solicitudes.csv",
        encabezados,
        filas.map((fila) => encabezados.map((clave) => String(fila[clave] ?? "")))
      );
      toast({ type: "success", title: "Exportación lista", description: `${filas.length} solicitudes descargadas.` });
    } catch {
      toast({ type: "error", title: "No pudimos exportar", description: "Intenta de nuevo en unos minutos." });
    }
  }

  const conteos = useMemo(() => {
    const mapa: Record<string, number> = { todas: solicitudes.length };
    for (const s of solicitudes) mapa[s.estado] = (mapa[s.estado] ?? 0) + 1;
    return mapa;
  }, [solicitudes]);

  return (
    <div>
      <PageHeader
        titulo="Cola de solicitudes"
        descripcion="Todas las solicitudes en curso, ordenadas por antigüedad y con su consumo de SLA."
        acciones={
          <>
            <Link href="/admin/pipeline" className="btn-secondary px-4 py-2 text-sm">
              Ver como pipeline
            </Link>
            <button type="button" onClick={exportar} className="btn-primary px-4 py-2 text-sm">
              Exportar CSV
            </button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const activo = filtro === f.clave;
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
              <span className={`ml-1.5 text-xs ${activo ? "text-ink-300" : "text-ink-400"}`}>
                {conteos[f.clave] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o documento…"
          className="input-field sm:max-w-xs"
          aria-label="Buscar solicitudes"
        />
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as "recientes" | "antiguas")}
          className="input-field w-auto"
          aria-label="Ordenar"
        >
          <option value="recientes">Más recientes primero</option>
          <option value="antiguas">Más antiguas primero</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      {cargando ? (
        <p className="text-sm text-ink-500">Cargando solicitudes…</p>
      ) : visibles.length === 0 ? (
        <EmptyState
          titulo="No hay solicitudes en esta vista"
          descripcion="Cambia el filtro o limpia la búsqueda para ver el resto de la cola."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Solicitante</th>
                <th className="px-4 py-3 font-semibold">Documento</th>
                <th className="px-4 py-3 font-semibold">Vertical</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Ingreso</th>
                <th className="px-4 py-3 font-semibold">SLA</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((solicitud) => {
                const sla = SLA_HORAS[solicitud.estado];
                return (
                  <tr key={solicitud.id} className="border-t border-ink-100 transition hover:bg-sand-50">
                    <td className="px-4 py-3 font-medium text-ink-900">{nombreDe(solicitud)}</td>
                    <td className="px-4 py-3 text-ink-500">{documentoDe(solicitud)}</td>
                    <td className="px-4 py-3 capitalize text-ink-600">{solicitud.vertical}</td>
                    <td className="px-4 py-3">
                      <Badge tono={TONOS_ESTADO[solicitud.estado]}>{ETIQUETAS_ESTADO[solicitud.estado]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-500">
                      {new Date(solicitud.creado_en).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {sla ? <SlaBadge createdAt={solicitud.creado_en} slaHours={sla} /> : <span className="text-xs text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/solicitudes/${solicitud.id}`}
                        className="text-sm font-semibold text-clay-600 hover:text-clay-700"
                      >
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
