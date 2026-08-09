"use client";

import { useEffect, useState } from "react";
import { obtenerChecklistDocumentos } from "@/lib/api";
import type { ChecklistDocumentos, SolicitudOut } from "@/lib/types";
import { DocumentoUpload } from "./DocumentoUpload";

export function PasoDocumentos({ solicitud, onGuardado }: { solicitud: SolicitudOut; onGuardado: () => void }) {
  const [checklist, setChecklist] = useState<ChecklistDocumentos | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function recargarChecklist() {
    try {
      const datos = await obtenerChecklistDocumentos(solicitud.id);
      setChecklist(datos);
    } catch {
      setError("No pudimos cargar la lista de documentos requeridos.");
    }
  }

  useEffect(() => {
    recargarChecklist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitud.id]);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!checklist) return <p className="text-sm text-ink-500">Cargando checklist de documentos...</p>;

  const todosCargados = checklist.requeridos.every((tipo) => checklist.cargados.includes(tipo));

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-600">
        Estos documentos varían según tu tipo de ocupación. Formatos aceptados: PDF, JPG, PNG (máx. 10 MB).
      </p>

      {checklist.requeridos.map((tipo) => (
        <DocumentoUpload
          key={tipo}
          solicitudId={solicitud.id}
          tipoDocumento={tipo}
          yaCargado={checklist.cargados.includes(tipo)}
          onCargado={recargarChecklist}
        />
      ))}

      <button type="button" disabled={!todosCargados} onClick={onGuardado} className="btn-primary w-full">
        {todosCargados ? "Continuar" : "Carga todos los documentos para continuar"}
      </button>
    </div>
  );
}
