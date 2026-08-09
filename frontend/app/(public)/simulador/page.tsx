"use client";

import { useState } from "react";
import { SimuladorCompra } from "@/components/simulador/SimuladorCompra";
import { SimuladorArriendo } from "@/components/simulador/SimuladorArriendo";

export default function SimuladorPage() {
  const [vertical, setVertical] = useState<"compra" | "arriendo">("compra");

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
      <h1 className="text-center text-3xl font-semibold text-ink-900">Simula tu aprobación de crédito</h1>
      <p className="mx-auto mt-2 max-w-lg text-center text-ink-600">
        Este simulador es un espejo honesto del motor de decisión real: usa los mismos umbrales
        que verá tu solicitud formal.
      </p>

      <div className="card mt-10 p-6">
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
          <SimuladorCompra precioInicial={300000000} />
        ) : (
          <SimuladorArriendo canonInicial={1800000} />
        )}
      </div>
    </div>
  );
}
