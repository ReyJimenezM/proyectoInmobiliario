"use client";

import Link from "next/link";
import { PASOS } from "@/lib/autoconsulta";

export function ProgresoAutoconsulta({
  pasoActual,
  pasoMaximo,
}: {
  pasoActual: number;
  /** Último paso desbloqueado: los siguientes se muestran, pero no son navegables. */
  pasoMaximo: number;
}) {
  const definicion = PASOS[pasoActual];
  const porcentaje = ((pasoActual + 1) / PASOS.length) * 100;

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between text-xs font-medium text-ink-500">
        <span>
          Paso {pasoActual + 1} de {PASOS.length}
        </span>
        <span className="text-ink-700">{definicion?.titulo}</span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full bg-clay-500 transition-all duration-300" style={{ width: `${porcentaje}%` }} />
      </div>

      <ol className="mt-4 hidden flex-wrap gap-x-1 gap-y-2 text-xs sm:flex">
        {PASOS.map((paso) => {
          const completado = paso.numero < pasoActual;
          const actual = paso.numero === pasoActual;
          const navegable = paso.numero <= pasoMaximo && !actual;

          const contenido = (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition ${
                actual
                  ? "bg-ink-900 font-semibold text-white"
                  : completado
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-ink-50 text-ink-400"
              }`}
            >
              <span className="tabular-nums">{paso.numero}</span>
              {paso.titulo}
            </span>
          );

          return (
            <li key={paso.slug}>
              {navegable ? (
                <Link href={`/autoconsulta/${paso.slug}`} className="hover:opacity-80">
                  {contenido}
                </Link>
              ) : (
                contenido
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
