"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { eliminarImagenPropiedad, reordenarImagenesPropiedad, subirImagenPropiedad } from "@/lib/api";
import type { ImagenPropiedad } from "@/lib/types";

export function GestorImagenesPropiedad({
  propiedadId,
  imagenesIniciales,
}: {
  propiedadId: string;
  imagenesIniciales: ImagenPropiedad[];
}) {
  const [imagenes, setImagenes] = useState<ImagenPropiedad[]>(
    [...imagenesIniciales].sort((a, b) => a.orden - b.orden)
  );
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function subirArchivos(archivos: FileList) {
    setError(null);
    setSubiendo(true);
    try {
      for (const archivo of Array.from(archivos)) {
        const nueva = await subirImagenPropiedad(propiedadId, archivo);
        setImagenes((prev) => [...prev, nueva]);
      }
    } catch {
      setError("No pudimos subir una o más fotos. Verifica el formato (JPG/PNG/WEBP) y tamaño (máx. 10 MB).");
    } finally {
      setSubiendo(false);
    }
  }

  async function eliminar(imagenId: string) {
    const anteriores = imagenes;
    setImagenes((prev) => prev.filter((img) => img.id !== imagenId));
    try {
      await eliminarImagenPropiedad(propiedadId, imagenId);
    } catch {
      setError("No pudimos eliminar la foto.");
      setImagenes(anteriores);
    }
  }

  async function mover(idx: number, direccion: -1 | 1) {
    const destino = idx + direccion;
    if (destino < 0 || destino >= imagenes.length) return;

    const copia = [...imagenes];
    [copia[idx], copia[destino]] = [copia[destino], copia[idx]];
    setImagenes(copia);

    try {
      await reordenarImagenesPropiedad(propiedadId, copia.map((img) => img.id));
    } catch {
      setError("No pudimos guardar el nuevo orden.");
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          if (e.dataTransfer.files.length) subirArchivos(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl2 border-2 border-dashed p-8 text-center transition ${
          arrastrando ? "border-clay-400 bg-clay-50" : "border-ink-200 hover:border-ink-400"
        }`}
      >
        <p className="text-sm font-medium text-ink-700">
          {subiendo ? "Subiendo..." : "Arrastra fotos aquí o haz clic para elegir archivos"}
        </p>
        <p className="mt-1 text-xs text-ink-400">JPG, PNG o WEBP — máx. 10 MB por foto</p>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && subirArchivos(e.target.files)}
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {imagenes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {imagenes.map((imagen, idx) => (
            <div key={imagen.id} className="group relative overflow-hidden rounded-lg border border-ink-100">
              <div className="relative aspect-square">
                <Image src={imagen.url} alt="" fill unoptimized className="object-cover" />
              </div>
              {idx === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-ink-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Portada
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-1.5 py-1 opacity-0 transition group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => mover(idx, -1)}
                    disabled={idx === 0}
                    className="rounded bg-white/20 px-1.5 text-xs text-white disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(idx, 1)}
                    disabled={idx === imagenes.length - 1}
                    className="rounded bg-white/20 px-1.5 text-xs text-white disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => eliminar(imagen.id)}
                  className="rounded bg-rose-600/90 px-1.5 text-xs text-white"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
