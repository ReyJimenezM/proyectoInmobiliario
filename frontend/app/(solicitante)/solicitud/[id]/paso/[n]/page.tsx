"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { obtenerSolicitud } from "@/lib/api";
import { estaAutenticado } from "@/lib/auth";
import type { SolicitudOut } from "@/lib/types";
import { StepProgress, NOMBRES_PASOS } from "@/components/solicitud/StepProgress";
import { PasoDatosPersonales } from "@/components/solicitud/PasoDatosPersonales";
import { PasoDatosLaborales } from "@/components/solicitud/PasoDatosLaborales";
import { PasoDatosFinancieros } from "@/components/solicitud/PasoDatosFinancieros";
import { PasoGarantiasReferencias } from "@/components/solicitud/PasoGarantiasReferencias";
import { PasoDocumentos } from "@/components/solicitud/PasoDocumentos";
import { PasoRevisionEnvio } from "@/components/solicitud/PasoRevisionEnvio";

interface PageProps {
  params: { id: string; n: string };
}

export default function PasoSolicitudPage({ params }: PageProps) {
  const router = useRouter();
  const pasoActual = Math.min(Math.max(Number(params.n) || 1, 1), NOMBRES_PASOS.length);
  const [solicitud, setSolicitud] = useState<SolicitudOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function recargar() {
    try {
      const datos = await obtenerSolicitud(params.id);
      setSolicitud(datos);
    } catch {
      setError("No pudimos cargar tu solicitud. Es posible que haya expirado tu sesión.");
    }
  }

  useEffect(() => {
    if (!estaAutenticado()) {
      router.push(`/login?destino=${encodeURIComponent(`/solicitud/${params.id}/paso/${pasoActual}`)}`);
      return;
    }
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, pasoActual]);

  function irAlSiguientePaso() {
    if (pasoActual < NOMBRES_PASOS.length) {
      router.push(`/solicitud/${params.id}/paso/${pasoActual + 1}`);
    }
  }

  if (error) {
    return <p className="mx-auto max-w-2xl px-4 py-16 text-center text-rose-600">{error}</p>;
  }

  if (!solicitud) {
    return <p className="mx-auto max-w-2xl px-4 py-16 text-center text-ink-500">Cargando tu solicitud...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <StepProgress pasoActual={pasoActual} />

      <div className="card p-6 sm:p-8">
        {pasoActual === 1 && <PasoDatosPersonales solicitud={solicitud} onGuardado={irAlSiguientePaso} />}
        {pasoActual === 2 && <PasoDatosLaborales solicitud={solicitud} onGuardado={irAlSiguientePaso} />}
        {pasoActual === 3 && <PasoDatosFinancieros solicitud={solicitud} onGuardado={irAlSiguientePaso} />}
        {pasoActual === 4 && <PasoGarantiasReferencias solicitud={solicitud} onGuardado={irAlSiguientePaso} />}
        {pasoActual === 5 && <PasoDocumentos solicitud={solicitud} onGuardado={irAlSiguientePaso} />}
        {pasoActual === 6 && <PasoRevisionEnvio solicitud={solicitud} />}
      </div>

      {pasoActual > 1 && pasoActual < 6 && (
        <button
          type="button"
          onClick={() => router.push(`/solicitud/${params.id}/paso/${pasoActual - 1}`)}
          className="mt-4 text-sm font-medium text-ink-500 hover:text-ink-800"
        >
          ← Volver al paso anterior
        </button>
      )}
    </div>
  );
}
