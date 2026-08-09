"use client";

import { useState } from "react";
import { simularArriendo } from "@/lib/api";
import { formatoPorcentaje } from "@/lib/format";
import type { SimuladorArriendoOutput } from "@/lib/types";
import { Semaforo } from "./Semaforo";

export function SimuladorArriendo({
  propiedadId,
  canonInicial,
}: {
  propiedadId?: string;
  canonInicial: number;
}) {
  const [canon, setCanon] = useState(canonInicial);
  const [ingresos, setIngresos] = useState(0);
  const [tipoIngreso, setTipoIngreso] = useState<"empleado" | "independiente">("empleado");
  const [tieneCodeudor, setTieneCodeudor] = useState(false);
  const [resultado, setResultado] = useState<SimuladorArriendoOutput | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function simular() {
    if (ingresos <= 0) {
      setError("Ingresa tus ingresos mensuales para simular.");
      return;
    }
    setError(null);
    setCargando(true);
    try {
      const res = await simularArriendo({
        propiedad_id: propiedadId,
        canon_mensual: canon,
        ingresos_mensuales: ingresos,
        tipo_ingreso: tipoIngreso,
        tiene_codeudor: tieneCodeudor,
      });
      setResultado(res);
    } catch {
      setError("No pudimos calcular tu simulación. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="label-field">Canon mensual</label>
        <input
          type="number"
          value={canon}
          onChange={(e) => setCanon(Number(e.target.value))}
          className="input-field"
        />
      </div>

      <div>
        <label className="label-field">Tus ingresos mensuales</label>
        <input
          type="number"
          value={ingresos || ""}
          onChange={(e) => setIngresos(Number(e.target.value))}
          placeholder="$0"
          className="input-field"
        />
      </div>

      <div>
        <label className="label-field">Tipo de ingreso</label>
        <div className="flex gap-2">
          {(["empleado", "independiente"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipoIngreso(t)}
              className={`flex-1 rounded-lg border py-2 text-sm font-semibold capitalize transition ${
                tipoIngreso === t ? "border-ink-800 bg-ink-800 text-white" : "border-ink-200 text-ink-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={tieneCodeudor}
          onChange={(e) => setTieneCodeudor(e.target.checked)}
          className="h-4 w-4 rounded border-ink-300"
        />
        ¿Tienes codeudor?
      </label>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button type="button" onClick={simular} disabled={cargando} className="btn-primary w-full">
        {cargando ? "Calculando..." : "Simular mi aprobación"}
      </button>

      {resultado && (
        <div className="space-y-4 border-t border-ink-100 pt-5">
          <div>
            <p className="text-sm text-ink-500">Relación canon / ingreso</p>
            <p className="text-lg font-semibold text-ink-900">
              {formatoPorcentaje(resultado.relacion_canon_ingreso)}
            </p>
          </div>

          <Semaforo estado={resultado.semaforo} mensaje={resultado.mensaje} />

          <a
            href={`/solicitud/nueva?vertical=arriendo${propiedadId ? `&propiedad_id=${propiedadId}` : ""}`}
            className="btn-secondary w-full"
          >
            Inicia tu solicitud formal
          </a>
        </div>
      )}
    </div>
  );
}
