"use client";

import { useState } from "react";
import { simularCompra } from "@/lib/api";
import { formatoMoneda, formatoPorcentaje } from "@/lib/format";
import type { SimuladorCompraOutput } from "@/lib/types";
import { Semaforo } from "./Semaforo";

export function SimuladorCompra({
  propiedadId,
  precioInicial,
  onResult,
}: {
  propiedadId?: string;
  precioInicial: number;
  onResult?: (result: SimuladorCompraOutput, contexto: { precio: number; cuotaInicial: number }) => void;
}) {
  const [precio, setPrecio] = useState(precioInicial);
  const [cuotaInicialPct, setCuotaInicialPct] = useState(20);
  const [ingresos, setIngresos] = useState(0);
  const [ingresos2, setIngresos2] = useState(0);
  const [plazo, setPlazo] = useState<10 | 15 | 20>(15);
  const [resultado, setResultado] = useState<SimuladorCompraOutput | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cuotaInicialValor = Math.round((precio * cuotaInicialPct) / 100);

  async function simular() {
    if (ingresos <= 0) {
      setError("Ingresa tus ingresos mensuales para simular.");
      return;
    }
    setError(null);
    setCargando(true);
    try {
      const res = await simularCompra({
        propiedad_id: propiedadId,
        precio,
        cuota_inicial: cuotaInicialValor,
        ingresos_mensuales: ingresos,
        ingresos_mensuales_2: ingresos2 || undefined,
        plazo_anios: plazo,
      });
      setResultado(res);
      onResult?.(res, { precio, cuotaInicial: cuotaInicialValor });
    } catch {
      setError("No pudimos calcular tu simulación. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="label-field">Precio de la propiedad</label>
        <input
          type="number"
          value={precio}
          onChange={(e) => setPrecio(Number(e.target.value))}
          className="input-field"
        />
      </div>

      <div>
        <label className="label-field">Cuota inicial: {cuotaInicialPct}% ({formatoMoneda(cuotaInicialValor)})</label>
        <input
          type="range"
          min={5}
          max={50}
          value={cuotaInicialPct}
          onChange={(e) => setCuotaInicialPct(Number(e.target.value))}
          className="w-full accent-ink-800"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
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
          <label className="label-field">Ingresos segundo solicitante (opcional)</label>
          <input
            type="number"
            value={ingresos2 || ""}
            onChange={(e) => setIngresos2(Number(e.target.value))}
            placeholder="$0"
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label-field">Plazo del crédito</label>
        <div className="flex gap-2">
          {([10, 15, 20] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlazo(p)}
              className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition ${
                plazo === p ? "border-ink-800 bg-ink-800 text-white" : "border-ink-200 text-ink-600"
              }`}
            >
              {p} años
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button type="button" onClick={simular} disabled={cargando} className="btn-primary w-full">
        {cargando ? "Calculando..." : "Simular mi aprobación"}
      </button>

      {resultado && (
        <div className="space-y-4 border-t border-ink-100 pt-5">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-ink-500">Monto a financiar</dt>
              <dd className="font-semibold text-ink-900">{formatoMoneda(resultado.monto_a_financiar)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Cuota mensual estimada</dt>
              <dd className="font-semibold text-ink-900">{formatoMoneda(resultado.cuota_mensual_estimada)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Relación cuota / ingreso</dt>
              <dd className="font-semibold text-ink-900">{formatoPorcentaje(resultado.relacion_cuota_ingreso)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Tasa de referencia</dt>
              <dd className="font-semibold text-ink-900">
                {formatoPorcentaje(resultado.tasa_ea_usada)} EA <span className="font-normal text-ink-400">(referencial, sujeta a estudio)</span>
              </dd>
            </div>
          </dl>

          <Semaforo estado={resultado.semaforo} mensaje={resultado.mensaje} />

          <a
            href={`/solicitud/nueva?vertical=compra${propiedadId ? `&propiedad_id=${propiedadId}` : ""}`}
            className="btn-secondary w-full"
          >
            Inicia tu solicitud formal
          </a>
        </div>
      )}
    </div>
  );
}
