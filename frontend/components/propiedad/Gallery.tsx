"use client";

import Image from "next/image";
import { useState } from "react";
import type { ImagenPropiedad } from "@/lib/types";

export function Gallery({ imagenes, titulo }: { imagenes: ImagenPropiedad[]; titulo: string }) {
  const [activa, setActiva] = useState(0);
  const imagen = imagenes[activa];

  if (imagenes.length === 0) {
    return <div className="aspect-video w-full rounded-xl2 bg-ink-100" />;
  }

  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden rounded-xl2 bg-ink-100">
        <Image src={imagen.url} alt={titulo} fill unoptimized className="object-cover" priority sizes="100vw" />
      </div>

      {imagenes.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {imagenes.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiva(idx)}
              className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                idx === activa ? "border-ink-800" : "border-transparent"
              }`}
            >
              <Image src={img.url} alt="" fill unoptimized className="object-cover" sizes="96px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
