"use client";

import { useRef, useState } from "react";
import { cargarDocumento } from "@/lib/api";

const ETIQUETAS_DOCUMENTO: Record<string, string> = {
  cedula_ciudadania: "Documento de identidad (ambas caras)",
  desprendibles_pago_o_certificacion_laboral: "Desprendibles de pago o certificación laboral",
  extractos_bancarios_3_meses: "Extractos bancarios (últimos 3 meses)",
  rut: "RUT",
  declaracion_renta: "Declaración de renta del último año",
  certificado_pension_vigente: "Certificado de pensión vigente",
  cedula_codeudor: "Documento de identidad del codeudor",
  soporte_ingresos_codeudor: "Soporte de ingresos del codeudor",
  certificado_tradicion_libertad: "Certificado de tradición y libertad",
};

const FORMATOS_ACEPTADOS = ".pdf,.jpg,.jpeg,.png";

export function DocumentoUpload({
  solicitudId,
  tipoDocumento,
  yaCargado,
  onCargado,
}: {
  solicitudId: string;
  tipoDocumento: string;
  yaCargado: boolean;
  onCargado: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subirArchivo(archivo: File) {
    setError(null);
    setSubiendo(true);
    try {
      await cargarDocumento(solicitudId, tipoDocumento, archivo);
      onCargado();
    } catch {
      setError("No pudimos cargar el archivo. Verifica el formato (PDF/JPG/PNG) y el tamaño (máx. 10 MB).");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        const archivo = e.dataTransfer.files?.[0];
        if (archivo) subirArchivo(archivo);
      }}
      className={`flex items-center justify-between rounded-lg border-2 border-dashed p-4 transition ${
        arrastrando ? "border-clay-400 bg-clay-50" : "border-ink-200"
      }`}
    >
      <div>
        <p className="text-sm font-medium text-ink-800">{ETIQUETAS_DOCUMENTO[tipoDocumento] ?? tipoDocumento}</p>
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </div>

      <div className="flex items-center gap-3">
        {yaCargado ? (
          <span className="text-sm font-semibold text-emerald-600">Cargado ✓</span>
        ) : (
          <span className="text-sm text-ink-400">Pendiente</span>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          className="btn-secondary px-4 py-2 text-xs"
        >
          {subiendo ? "Subiendo..." : yaCargado ? "Reemplazar" : "Subir archivo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={FORMATOS_ACEPTADOS}
          className="hidden"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) subirArchivo(archivo);
          }}
        />
      </div>
    </div>
  );
}
