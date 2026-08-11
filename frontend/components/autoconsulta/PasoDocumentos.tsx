"use client";

import { useRef } from "react";
import { documentosRequeridos } from "@/lib/autoconsulta";
import { Badge } from "@/components/ui/Badge";
import type { PropsPaso } from "./tipos";

const TAMANO_MAXIMO_MB = 10;
const FORMATOS = ".pdf,.jpg,.jpeg,.png";

function formatoTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FilaDocumento({
  clave,
  nombre,
  ayuda,
  obligatorio,
  cargado,
  error,
  onCargar,
  onQuitar,
}: {
  clave: string;
  nombre: string;
  ayuda: string;
  obligatorio: boolean;
  cargado: { nombre: string; tamano: number } | undefined;
  error?: string;
  onCargar: (archivo: File) => void;
  onQuitar: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`rounded-xl2 border p-4 transition ${
        error ? "border-rose-300 bg-rose-50/40" : cargado ? "border-emerald-200 bg-emerald-50/30" : "border-ink-100 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            {nombre}
            {obligatorio ? <Badge tono="neutro">Obligatorio</Badge> : <Badge tono="info">Opcional</Badge>}
          </p>
          <p className="mt-0.5 text-xs text-ink-500">{ayuda}</p>
          {cargado && (
            <p className="mt-1.5 text-xs font-medium text-emerald-700">
              {cargado.nombre} · {formatoTamano(cargado.tamano)}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full border border-ink-300 bg-white px-4 py-1.5 text-xs font-semibold text-ink-800 transition hover:border-ink-500"
          >
            {cargado ? "Reemplazar" : "Cargar"}
          </button>
          {cargado && (
            <button
              type="button"
              onClick={onQuitar}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-500 transition hover:text-rose-600"
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        id={clave}
        type="file"
        accept={FORMATOS}
        className="sr-only"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) onCargar(archivo);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function PasoDocumentos({ estado, actualizar, errores }: PropsPaso) {
  const requeridos = documentosRequeridos(estado.economica);

  function cargar(clave: string, archivo: File) {
    if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
      window.alert(`El archivo supera los ${TAMANO_MAXIMO_MB} MB permitidos.`);
      return;
    }
    actualizar({
      documentos: {
        ...estado.documentos,
        // Solo se guarda la referencia del archivo: la subida real ocurre contra el backend.
        [clave]: { nombre: archivo.name, tamano: archivo.size, cargado_en: new Date().toISOString() },
      },
    });
  }

  function quitar(clave: string) {
    const copia = { ...estado.documentos };
    delete copia[clave];
    actualizar({ documentos: copia });
  }

  const obligatorios = requeridos.filter((d) => d.obligatorio);
  const cargadosObligatorios = obligatorios.filter((d) => estado.documentos[d.clave]).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-500">
          Formatos aceptados: PDF, JPG o PNG. Máximo {TAMANO_MAXIMO_MB} MB por archivo.
        </p>
        <Badge tono={cargadosObligatorios === obligatorios.length ? "exito" : "alerta"}>
          {cargadosObligatorios} de {obligatorios.length} obligatorios
        </Badge>
      </div>

      {requeridos.map((doc) => (
        <FilaDocumento
          key={doc.clave}
          clave={doc.clave}
          nombre={doc.nombre}
          ayuda={doc.ayuda}
          obligatorio={doc.obligatorio}
          cargado={estado.documentos[doc.clave]}
          error={errores[doc.clave]}
          onCargar={(archivo) => cargar(doc.clave, archivo)}
          onQuitar={() => quitar(doc.clave)}
        />
      ))}

      {!estado.economica.tipo_actividad && (
        <p className="text-sm text-amber-700">
          La lista se ajusta a tu actividad económica. Vuelve al paso 3 y selecciónala para ver los documentos exactos.
        </p>
      )}
    </div>
  );
}
