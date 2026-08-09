"use client";

import { useEffect, useState } from "react";
import { listarAuditoria } from "@/lib/api";
import type { AuditoriaEntrada } from "@/lib/types";

const ENTIDADES = ["solicitud", "documento_solicitud", "evaluacion", "politica_credito", "motor_decision", "propiedad", "inmobiliaria", "usuario"];

export default function AuditoriaPage() {
  const [entradas, setEntradas] = useState<AuditoriaEntrada[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [entidadTipo, setEntidadTipo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarAuditoria({ entidad_tipo: entidadTipo || undefined, pagina })
      .then((res) => {
        setEntradas(res.resultados);
        setTotal(res.total);
      })
      .catch(() => setError("No pudimos cargar el log de auditoría."));
  }, [entidadTipo, pagina]);

  const totalPaginas = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Auditoría</h1>
        <p className="mt-1 text-sm text-ink-500">
          Log append-only — cada acción sobre solicitudes, evaluaciones, políticas y catálogos queda
          registrada aquí de forma inmutable. No existe ningún endpoint para editar o borrar estas entradas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setEntidadTipo("");
            setPagina(1);
          }}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            entidadTipo === "" ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600"
          }`}
        >
          Todas
        </button>
        {ENTIDADES.map((tipo) => (
          <button
            key={tipo}
            type="button"
            onClick={() => {
              setEntidadTipo(tipo);
              setPagina(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
              entidadTipo === tipo ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600"
            }`}
          >
            {tipo.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {error && <p className="text-rose-600">{error}</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Entidad</th>
              <th className="px-4 py-2">Acción</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {entradas.map((e) => (
              <tr key={e.id} className="border-t border-ink-100 align-top">
                <td className="whitespace-nowrap px-4 py-2 text-xs text-ink-500">
                  {new Date(e.timestamp).toLocaleString("es-CO")}
                </td>
                <td className="px-4 py-2 capitalize">{e.entidad_tipo.replace(/_/g, " ")}</td>
                <td className="px-4 py-2">{e.accion.replace(/_/g, " ")}</td>
                <td className="px-4 py-2 text-xs text-ink-500">
                  {e.actor_id ? e.actor_id.slice(0, 8) : "Sistema"}
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-xs text-ink-500" title={JSON.stringify(e.payload_despues)}>
                  {JSON.stringify(e.payload_despues)}
                </td>
              </tr>
            ))}
            {entradas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-400">
                  Sin entradas para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPagina(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                p === pagina ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
