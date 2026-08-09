"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviarSolicitud } from "@/lib/api";
import type { SolicitudOut } from "@/lib/types";

function ResumenSeccion({
  titulo,
  paso,
  solicitudId,
  datos,
}: {
  titulo: string;
  paso: number;
  solicitudId: string;
  datos: Record<string, unknown>;
}) {
  const router = useRouter();
  const entradas = Object.entries(datos).filter(([, valor]) => valor !== null && valor !== "" && valor !== undefined);

  return (
    <div className="rounded-lg border border-ink-100 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-ink-900">{titulo}</h3>
        <button
          type="button"
          onClick={() => router.push(`/solicitud/${solicitudId}/paso/${paso}`)}
          className="text-xs font-semibold text-clay-600 hover:text-clay-700"
        >
          Editar
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {entradas.map(([clave, valor]) => (
          <div key={clave} className="contents">
            <dt className="text-ink-400">{clave.replace(/_/g, " ")}</dt>
            <dd className="truncate text-ink-800">
              {typeof valor === "object" ? JSON.stringify(valor) : String(valor)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function PasoRevisionEnvio({ solicitud }: { solicitud: SolicitudOut }) {
  const router = useRouter();
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!acepta) {
      setError("Debes aceptar la política de tratamiento de datos para continuar.");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await enviarSolicitud(solicitud.id, acepta);
      router.push(`/solicitud/${solicitud.id}/resultado`);
    } catch {
      setError("No pudimos enviar tu solicitud. Verifica que todos los pasos estén completos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-5">
      <ResumenSeccion titulo="Datos personales" paso={1} solicitudId={solicitud.id} datos={solicitud.datos_personales} />
      <ResumenSeccion titulo="Información laboral" paso={2} solicitudId={solicitud.id} datos={solicitud.datos_laborales} />
      <ResumenSeccion
        titulo="Información financiera"
        paso={3}
        solicitudId={solicitud.id}
        datos={solicitud.datos_financieros}
      />
      <ResumenSeccion
        titulo="Garantías y referencias"
        paso={4}
        solicitudId={solicitud.id}
        datos={solicitud.garantias_referencias}
      />

      <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
        <label className="flex items-start gap-3 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={acepta}
            onChange={(e) => setAcepta(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink-300"
          />
          <span>
            Acepto la política de tratamiento de datos personales y autorizo el uso de esta
            información con la finalidad específica de evaluar mi solicitud de crédito o
            arrendamiento.
          </span>
        </label>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button type="button" onClick={enviar} disabled={enviando} className="btn-primary w-full">
        {enviando ? "Enviando..." : "Enviar solicitud"}
      </button>
    </div>
  );
}
