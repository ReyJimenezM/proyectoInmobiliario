"use client";

import { useMemo, useState } from "react";
import { simularCompra } from "@/lib/api";
import { formatoMoneda, formatoPorcentaje } from "@/lib/format";
import type { SimuladorCompraOutput } from "@/lib/types";
import { SimuladorCompra } from "@/components/simulador/SimuladorCompra";
import { SimuladorArriendo } from "@/components/simulador/SimuladorArriendo";

type Contexto = { precio: number; cuotaInicial: number };

type FilaAmortizacion = {
  mes: number;
  cuota: number;
  interes: number;
  abono: number;
  saldo: number;
};

function calcularAmortizacion(monto: number, cuota: number, tasaEA: number, meses = 12): FilaAmortizacion[] {
  const tasaMensual = Math.pow(1 + tasaEA, 1 / 12) - 1;
  let saldo = monto;
  const filas: FilaAmortizacion[] = [];
  for (let mes = 1; mes <= meses; mes++) {
    const interes = saldo * tasaMensual;
    const abono = cuota - interes;
    saldo = Math.max(0, saldo - abono);
    filas.push({ mes, cuota, interes, abono, saldo });
  }
  return filas;
}

const TIPS = [
  {
    titulo: "Mejora tu puntaje crediticio",
    texto: "Paga tus obligaciones a tiempo en los meses previos a solicitar tu crédito; esto reduce tu tasa ofrecida.",
  },
  {
    titulo: "Ahorra para la cuota inicial",
    texto: "Una cuota inicial mayor reduce el monto a financiar y mejora tu relación cuota / ingreso.",
  },
  {
    titulo: "Reduce tus deudas activas",
    texto: "Disminuir tu nivel de endeudamiento antes de aplicar aumenta tu capacidad de pago disponible.",
  },
  {
    titulo: "Compara plazos con calma",
    texto: "Un plazo más largo baja la cuota mensual, pero incrementa el total de intereses pagados.",
  },
];

export default function SimuladorPage() {
  const [vertical, setVertical] = useState<"compra" | "arriendo">("compra");
  const [resultado, setResultado] = useState<SimuladorCompraOutput | null>(null);
  const [contexto, setContexto] = useState<Contexto | null>(null);
  const [comparativo, setComparativo] = useState<Record<10 | 15 | 20, SimuladorCompraOutput | null>>({
    10: null,
    15: null,
    20: null,
  });
  const [cargandoComparativo, setCargandoComparativo] = useState(false);

  function manejarResultado(res: SimuladorCompraOutput, ctx: Contexto) {
    setResultado(res);
    setContexto(ctx);
    setCargandoComparativo(true);
    Promise.all(
      ([10, 15, 20] as const).map((plazo) =>
        simularCompra({
          precio: ctx.precio,
          cuota_inicial: ctx.cuotaInicial,
          ingresos_mensuales: Number(res.ingresos_totales) || 1,
          plazo_anios: plazo,
        }).catch(() => null)
      )
    )
      .then(([r10, r15, r20]) => {
        setComparativo({ 10: r10, 15: r15, 20: r20 });
      })
      .finally(() => setCargandoComparativo(false));
  }

  const amortizacion = useMemo(() => {
    if (!resultado) return [];
    return calcularAmortizacion(
      Number(resultado.monto_a_financiar),
      Number(resultado.cuota_mensual_estimada),
      Number(resultado.tasa_ea_usada)
    );
  }, [resultado]);

  const desglose = useMemo(() => {
    if (!contexto) return null;
    const total = contexto.precio || 1;
    const pctInicial = Math.round((contexto.cuotaInicial / total) * 100);
    const pctFinanciado = 100 - pctInicial;
    return { pctInicial, pctFinanciado };
  }, [contexto]);

  return (
    <div className="bg-sand-50">
      {/* Hero */}
      <section className="border-b border-ink-100 bg-white px-4 py-14 text-center sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-900 text-2xl text-white">
            🧮
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
            Simula tu aprobación de crédito
          </h1>
          <p className="mt-3 text-ink-600">
            Este simulador es un espejo honesto del motor de decisión real: usa los mismos umbrales
            que verá tu solicitud formal. Calcula tu cuota, compara plazos y entiende cómo se
            construye tu amortización antes de aplicar.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="card p-6">
          <div className="mb-6 flex gap-2">
            {(["compra", "arriendo"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVertical(v)}
                className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                  vertical === v ? "bg-ink-900 text-white" : "bg-ink-50 text-ink-600 hover:bg-ink-100"
                }`}
              >
                {v === "compra" ? "Compra (crédito hipotecario)" : "Arriendo"}
              </button>
            ))}
          </div>

          {vertical === "compra" ? (
            <SimuladorCompra precioInicial={300000000} onResult={manejarResultado} />
          ) : (
            <SimuladorArriendo canonInicial={1800000} />
          )}
        </div>

        {vertical === "compra" && resultado && desglose && (
          <div className="mt-8 space-y-8">
            {/* Desglose visual */}
            <section className="card p-6">
              <h2 className="font-display text-xl font-semibold text-ink-900">Composición del precio</h2>
              <p className="mt-1 text-sm text-ink-500">
                Cuota inicial vs. monto financiado sobre el precio total de la propiedad.
              </p>
              <div className="mt-4 flex h-8 w-full overflow-hidden rounded-full bg-ink-50">
                <div
                  className="flex items-center justify-center bg-clay-500 text-xs font-semibold text-white"
                  style={{ width: `${desglose.pctInicial}%` }}
                >
                  {desglose.pctInicial >= 10 ? `${desglose.pctInicial}%` : ""}
                </div>
                <div
                  className="flex items-center justify-center bg-ink-800 text-xs font-semibold text-white"
                  style={{ width: `${desglose.pctFinanciado}%` }}
                >
                  {desglose.pctFinanciado >= 10 ? `${desglose.pctFinanciado}%` : ""}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-6 text-sm">
                <span className="flex items-center gap-2 text-ink-700">
                  <span className="h-3 w-3 rounded-full bg-clay-500" /> Cuota inicial (
                  {formatoMoneda(contexto!.cuotaInicial)})
                </span>
                <span className="flex items-center gap-2 text-ink-700">
                  <span className="h-3 w-3 rounded-full bg-ink-800" /> Monto financiado (
                  {formatoMoneda(resultado.monto_a_financiar)})
                </span>
              </div>
            </section>

            {/* Tabla de amortización */}
            <section className="card p-6">
              <h2 className="font-display text-xl font-semibold text-ink-900">
                Amortización estimada (primeros 12 meses)
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                Cálculo referencial en sistema de cuota fija sobre la tasa E.A. usada en tu simulación.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                      <th className="py-2 pr-3">Mes</th>
                      <th className="py-2 pr-3">Cuota</th>
                      <th className="py-2 pr-3">Interés</th>
                      <th className="py-2 pr-3">Abono a capital</th>
                      <th className="py-2 pr-3">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amortizacion.map((fila) => (
                      <tr key={fila.mes} className="border-b border-ink-50">
                        <td className="py-2 pr-3 text-ink-700">{fila.mes}</td>
                        <td className="py-2 pr-3 text-ink-900">{formatoMoneda(fila.cuota)}</td>
                        <td className="py-2 pr-3 text-ink-500">{formatoMoneda(fila.interes)}</td>
                        <td className="py-2 pr-3 text-ink-500">{formatoMoneda(fila.abono)}</td>
                        <td className="py-2 pr-3 font-medium text-ink-900">{formatoMoneda(fila.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Comparativo de plazos */}
            <section className="card p-6">
              <h2 className="font-display text-xl font-semibold text-ink-900">¿Qué pasa si cambio el plazo?</h2>
              <p className="mt-1 text-sm text-ink-500">
                Comparación de tu cuota mensual y el total pagado estimado a 10, 15 y 20 años.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {([10, 15, 20] as const).map((plazo) => {
                  const r = comparativo[plazo];
                  const totalPagado = r ? Number(r.cuota_mensual_estimada) * plazo * 12 : null;
                  const activo = resultado.plazo_anios === plazo;
                  return (
                    <div
                      key={plazo}
                      className={`rounded-lg border p-4 ${
                        activo ? "border-ink-800 bg-ink-50" : "border-ink-100"
                      }`}
                    >
                      <p className="text-sm font-semibold text-ink-900">{plazo} años</p>
                      {cargandoComparativo && !r ? (
                        <p className="mt-3 text-sm text-ink-400">Calculando...</p>
                      ) : r ? (
                        <div className="mt-3 space-y-2">
                          <div>
                            <p className="text-xs text-ink-400">Cuota mensual</p>
                            <p className="font-semibold text-ink-900">{formatoMoneda(r.cuota_mensual_estimada)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-ink-400">Total pagado (estimado)</p>
                            <p className="font-semibold text-ink-900">
                              {totalPagado ? formatoMoneda(totalPagado) : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-ink-400">Cuota / ingreso</p>
                            <p className="font-medium text-ink-700">
                              {formatoPorcentaje(r.relacion_cuota_ingreso)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-ink-400">No disponible</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Tips */}
            <section>
              <h2 className="font-display text-xl font-semibold text-ink-900">Consejos para mejorar tu simulación</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {TIPS.map((tip) => (
                  <div key={tip.titulo} className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
                    <p className="font-semibold text-ink-900">{tip.titulo}</p>
                    <p className="mt-1 text-sm text-ink-600">{tip.texto}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
