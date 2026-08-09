"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listarSolicitudesAdmin } from "@/lib/api";
import type { EstadoSolicitud, SolicitudOut } from "@/lib/types";

const COLUMNAS: { estados: EstadoSolicitud[]; titulo: string }[] = [
  { estados: ["enviada"], titulo: "Recibido" },
  { estados: ["en_evaluacion"], titulo: "En evaluación" },
  { estados: ["revision_manual"], titulo: "En estudio" },
  { estados: ["con_ruta_alterna"], titulo: "Requisitos / ruta alterna" },
  { estados: ["aprobada"], titulo: "Aprobadas" },
  { estados: ["rechazada"], titulo: "Rechazadas" },
];

function TarjetaSolicitud({ solicitud }: { solicitud: SolicitudOut }) {
  const nombre = (solicitud.datos_personales as { nombres_apellidos?: string }).nombres_apellidos ?? "Sin nombre";
  return (
    <Link
      href={`/admin/solicitudes/${solicitud.id}`}
      className="block rounded-lg border border-ink-100 bg-white p-3 shadow-sm transition hover:shadow-md"
    >
      <p className="truncate text-sm font-semibold text-ink-900">{nombre}</p>
      <p className="mt-1 text-xs capitalize text-ink-500">{solicitud.vertical}</p>
      <p className="mt-1 text-xs text-ink-400">
        {new Date(solicitud.creado_en).toLocaleDateString("es-CO")}
      </p>
    </Link>
  );
}

export default function PipelinePage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudOut[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarSolicitudesAdmin()
      .then(setSolicitudes)
      .catch(() => setError("No pudimos cargar el pipeline de solicitudes."));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink-900">Pipeline de solicitudes</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {COLUMNAS.map((columna) => {
          const items = solicitudes.filter((s) => columna.estados.includes(s.estado));
          return (
            <div key={columna.titulo} className="rounded-xl2 bg-ink-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-700">{columna.titulo}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink-500">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((s) => (
                  <TarjetaSolicitud key={s.id} solicitud={s} />
                ))}
                {items.length === 0 && <p className="text-xs text-ink-400">Sin solicitudes</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
