"use client";

import { useEffect, useState } from "react";
import {
  abrirDocumento,
  listarDocumentos,
  obtenerResultadoSolicitud,
  obtenerSolicitud,
  tomarDecisionManual,
} from "@/lib/api";
import type { DocumentoOut, ResultadoSolicitudOut, SolicitudOut } from "@/lib/types";

interface PageProps {
  params: { id: string };
}

function BloqueDatos({ titulo, datos }: { titulo: string; datos: Record<string, unknown> }) {
  const entradas = Object.entries(datos).filter(([, v]) => v !== null && v !== "" && v !== undefined);
  return (
    <div className="card p-5">
      <h3 className="mb-3 font-semibold text-ink-900">{titulo}</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {entradas.map(([clave, valor]) => (
          <div key={clave} className="contents">
            <dt className="capitalize text-ink-400">{clave.replace(/_/g, " ")}</dt>
            <dd className="truncate text-ink-800">{typeof valor === "object" ? JSON.stringify(valor) : String(valor)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function DetalleSolicitudAdminPage({ params }: PageProps) {
  const [solicitud, setSolicitud] = useState<SolicitudOut | null>(null);
  const [resultado, setResultado] = useState<ResultadoSolicitudOut | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoOut[]>([]);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  async function cargarTodo() {
    try {
      const [s, r, docs] = await Promise.all([
        obtenerSolicitud(params.id),
        obtenerResultadoSolicitud(params.id).catch(() => null),
        listarDocumentos(params.id),
      ]);
      setSolicitud(s);
      setResultado(r);
      setDocumentos(docs);
    } catch {
      setError("No pudimos cargar esta solicitud.");
    }
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function decidir(decisionFinal: "aprobada" | "rechazada" | "solicitar_info") {
    if (comentario.trim().length < 10) {
      setError("El comentario debe tener al menos 10 caracteres — queda en el log de auditoría.");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await tomarDecisionManual(params.id, { decision_final: decisionFinal, comentario });
      setMensajeExito("Decisión registrada correctamente.");
      setComentario("");
      cargarTodo();
    } catch {
      setError("No pudimos registrar la decisión.");
    } finally {
      setEnviando(false);
    }
  }

  if (error && !solicitud) return <p className="text-rose-600">{error}</p>;
  if (!solicitud) return <p className="text-ink-500">Cargando solicitud...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">
          {(solicitud.datos_personales as { nombres_apellidos?: string }).nombres_apellidos ?? "Solicitud"}
        </h1>
        <p className="text-sm capitalize text-ink-500">
          {solicitud.vertical} · estado: {solicitud.estado.replace(/_/g, " ")}
        </p>
      </div>

      {resultado && (
        <div className="card p-5">
          <h2 className="mb-2 font-semibold text-ink-900">Resultado del motor automático</h2>
          <p className="text-sm text-ink-600">{resultado.explicacion}</p>
          {resultado.score != null && (
            <p className="mt-2 text-sm font-semibold text-ink-800">
              Score: {resultado.score.toFixed(1)} / {resultado.escala_maxima}
            </p>
          )}
          <ul className="mt-3 space-y-1">
            {resultado.variables_evaluadas.map((v) => (
              <li key={v.nombre} className="flex justify-between text-xs text-ink-500">
                <span className="capitalize">{v.nombre}</span>
                <span>
                  banda {v.banda} · {v.puntaje_ponderado} pts
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BloqueDatos titulo="Datos personales" datos={solicitud.datos_personales} />
        <BloqueDatos titulo="Información laboral" datos={solicitud.datos_laborales} />
        <BloqueDatos titulo="Información financiera" datos={solicitud.datos_financieros} />
        <BloqueDatos titulo="Garantías y referencias" datos={solicitud.garantias_referencias} />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-ink-900">Documentos</h2>
        <ul className="space-y-2">
          {documentos.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between text-sm">
              <span className="text-ink-700">{doc.tipo_documento.replace(/_/g, " ")}</span>
              <button
                type="button"
                onClick={() => abrirDocumento(params.id, doc.id)}
                className="text-xs font-semibold text-clay-600 hover:text-clay-700"
              >
                Ver documento
              </button>
            </li>
          ))}
          {documentos.length === 0 && <p className="text-sm text-ink-400">Sin documentos cargados.</p>}
        </ul>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-ink-900">Decisión manual</h2>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Comentario obligatorio — queda registrado en el log de auditoría"
          className="input-field min-h-24"
        />
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        {mensajeExito && <p className="mt-2 text-sm text-emerald-600">{mensajeExito}</p>}
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={enviando} onClick={() => decidir("aprobada")} className="btn-primary">
            Aprobar
          </button>
          <button type="button" disabled={enviando} onClick={() => decidir("rechazada")} className="btn-secondary">
            Rechazar
          </button>
          <button type="button" disabled={enviando} onClick={() => decidir("solicitar_info")} className="btn-secondary">
            Solicitar información adicional
          </button>
        </div>
      </div>
    </div>
  );
}
