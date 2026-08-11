"use client";

import { useId, useMemo, useState } from "react";
import { formatoMoneda } from "@/lib/format";
import { IconoFlecha } from "./Iconos";

type Control = {
  clave: "estudios" | "minutos" | "costoHora" | "automatizado";
  etiqueta: string;
  min: number;
  max: number;
  paso: number;
  formato: (valor: number) => string;
};

const CONTROLES: Control[] = [
  {
    clave: "estudios",
    etiqueta: "Estudios de arrendamiento al mes",
    min: 10,
    max: 500,
    paso: 5,
    formato: (v) => `${v}`,
  },
  {
    clave: "minutos",
    etiqueta: "Minutos que te toma hoy un estudio manual",
    min: 20,
    max: 240,
    paso: 5,
    formato: (v) => `${v} min`,
  },
  {
    clave: "costoHora",
    etiqueta: "Costo por hora del analista",
    min: 12000,
    max: 90000,
    paso: 1000,
    formato: (v) => formatoMoneda(v),
  },
  {
    clave: "automatizado",
    etiqueta: "Casos que el motor resuelve sin tocar",
    min: 30,
    max: 95,
    paso: 5,
    formato: (v) => `${v} %`,
  },
];

const INICIAL = { estudios: 80, minutos: 90, costoHora: 32000, automatizado: 70 };

export function CalculadoraAhorro() {
  const [valores, setValores] = useState(INICIAL);
  const idBase = useId();

  const resultado = useMemo(() => {
    const casosAutomaticos = (valores.estudios * valores.automatizado) / 100;
    const horasMes = (casosAutomaticos * valores.minutos) / 60;
    const ahorroMes = horasMes * valores.costoHora;
    return {
      casosAutomaticos: Math.round(casosAutomaticos),
      horasMes: Math.round(horasMes),
      diasHabiles: Math.round(horasMes / 8),
      ahorroMes: Math.round(ahorroMes),
      ahorroAnio: Math.round(ahorroMes * 12),
      revisionManual: Math.round(valores.estudios - casosAutomaticos),
    };
  }, [valores]);

  return (
    <div className="overflow-hidden rounded-xl2 border border-ink-100 bg-white shadow-card lg:grid lg:grid-cols-[1fr_0.9fr]">
      <div className="p-6 sm:p-8">
        <h3 className="font-display text-2xl font-semibold text-ink-900">Mueve tus números</h3>
        <p className="mt-2 text-sm text-ink-500">
          Ajusta los valores de tu operación y mira cuánto tiempo de analista se libera al automatizar el estudio.
        </p>

        <div className="mt-7 space-y-6">
          {CONTROLES.map((control) => {
            const id = `${idBase}-${control.clave}`;
            const valor = valores[control.clave];
            const progreso = ((valor - control.min) / (control.max - control.min)) * 100;
            return (
              <div key={control.clave}>
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor={id} className="text-sm font-medium text-ink-700">
                    {control.etiqueta}
                  </label>
                  <output htmlFor={id} className="font-display text-lg font-semibold text-ink-900">
                    {control.formato(valor)}
                  </output>
                </div>
                <input
                  id={id}
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.paso}
                  value={valor}
                  onChange={(e) =>
                    setValores((previos) => ({ ...previos, [control.clave]: Number(e.target.value) }))
                  }
                  className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-full accent-clay-500"
                  style={{
                    background: `linear-gradient(to right, #d5762f ${progreso}%, #e3e8e6 ${progreso}%)`,
                  }}
                />
              </div>
            );
          })}
        </div>

        <p className="mt-7 rounded-xl bg-sand-100 p-4 text-xs leading-relaxed text-ink-500">
          <strong className="font-semibold text-ink-700">Cómo se calcula:</strong> casos automáticos × minutos por
          estudio × costo hora. Es una estimación con tus supuestos, no una promesa de resultado — en la demo la
          corremos con tu histórico real.
        </p>
      </div>

      <div className="flex flex-col justify-between bg-ink-950 p-6 text-white sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-clay-300">Ahorro estimado</p>

          <p className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {formatoMoneda(resultado.ahorroMes)}
          </p>
          <p className="text-sm text-ink-300">al mes en horas de analista</p>

          <div className="mt-7 grid grid-cols-2 gap-4">
            {[
              { valor: `${resultado.horasMes} h`, etiqueta: "liberadas cada mes" },
              { valor: `${resultado.diasHabiles} días`, etiqueta: "hábiles de trabajo" },
              { valor: `${resultado.casosAutomaticos}`, etiqueta: "estudios sin tocar" },
              { valor: `${resultado.revisionManual}`, etiqueta: "van a revisión humana" },
            ].map((dato) => (
              <div key={dato.etiqueta} className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                <p className="font-display text-xl font-semibold">{dato.valor}</p>
                <p className="mt-0.5 text-xs text-ink-300">{dato.etiqueta}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 border-t border-white/10 pt-5 text-sm text-ink-200">
            En un año son{" "}
            <strong className="font-semibold text-clay-300">{formatoMoneda(resultado.ahorroAnio)}</strong> que hoy se
            van en revisar papeles a mano.
          </p>
        </div>

        <a
          href="#agenda"
          className="group mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-clay-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-clay-400"
        >
          Calcularlo con mi histórico real
          <IconoFlecha className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </a>
      </div>
    </div>
  );
}
