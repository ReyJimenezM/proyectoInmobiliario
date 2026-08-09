"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { crearSolicitud } from "@/lib/api";
import { estaAutenticado } from "@/lib/auth";

export default function NuevaSolicitudPage() {
  return (
    <Suspense fallback={null}>
      <NuevaSolicitudContenido />
    </Suspense>
  );
}

function NuevaSolicitudContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const propiedadId = searchParams.get("propiedad_id");
    const vertical = (searchParams.get("vertical") as "compra" | "arriendo" | null) ?? "compra";

    if (!propiedadId) {
      setError("Falta indicar la propiedad para iniciar la solicitud.");
      return;
    }

    if (!estaAutenticado()) {
      const destino = `/solicitud/nueva?propiedad_id=${propiedadId}&vertical=${vertical}`;
      router.push(`/login?destino=${encodeURIComponent(destino)}`);
      return;
    }

    crearSolicitud(propiedadId, vertical)
      .then((solicitud) => router.push(`/solicitud/${solicitud.id}/paso/1`))
      .catch(() => setError("No pudimos crear tu solicitud. Intenta de nuevo."));
  }, [router, searchParams]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      {error ? (
        <p className="text-rose-600">{error}</p>
      ) : (
        <p className="text-ink-500">Preparando tu solicitud...</p>
      )}
    </div>
  );
}
