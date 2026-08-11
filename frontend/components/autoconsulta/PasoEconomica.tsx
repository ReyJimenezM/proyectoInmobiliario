"use client";

import { Campo, claseInput } from "@/components/ui/Campo";
import { ETIQUETAS_ACTIVIDAD, type TipoActividad } from "@/lib/autoconsulta";
import { PARAMETROS_POR_DEFECTO } from "@/lib/motorLocal";
import { formatoMoneda } from "@/lib/format";
import type { PropsPaso } from "./tipos";

const ACTIVIDADES = Object.keys(ETIQUETAS_ACTIVIDAD) as TipoActividad[];

const TIPOS_CONTRATO = ["Indefinido", "Término fijo", "Obra o labor", "Prestación de servicios", "Aprendizaje"];

function esEmpleado(actividad: string) {
  return actividad === "empleado_formal" || actividad === "empleado_informal";
}

function esIndependiente(actividad: string) {
  return actividad === "independiente_formal" || actividad === "independiente_informal" || actividad === "rentista";
}

export function PasoEconomica({ estado, actualizar, errores }: PropsPaso) {
  const e = estado.economica;
  const set = (cambios: Partial<typeof e>) => actualizar({ economica: { ...e, ...cambios } });

  const canon = Number(estado.preformulario.canon_deseado) || 0;
  const ingresos = (Number(e.ingresos_mensuales) || 0) + (Number(e.otros_ingresos) || 0);
  const capacidad = ingresos - (Number(e.gastos_mensuales) || 0) - (Number(e.obligaciones_financieras) || 0);
  const rci = ingresos > 0 ? canon / ingresos : 0;

  // Tonos claros: este indicador se pinta sobre la tarjeta oscura del final del paso.
  const tonoRci =
    rci === 0
      ? "text-ink-200"
      : rci <= PARAMETROS_POR_DEFECTO.rci_maximo_verde
        ? "text-emerald-300"
        : rci <= PARAMETROS_POR_DEFECTO.rci_maximo_gris
          ? "text-amber-300"
          : "text-rose-300";

  return (
    <div className="space-y-6">
      <Campo id="tipo_actividad" etiqueta="¿A qué te dedicas?" obligatorio error={errores.tipo_actividad}>
        <div className="mt-1 grid gap-2 sm:grid-cols-3">
          {ACTIVIDADES.map((actividad) => {
            const activo = e.tipo_actividad === actividad;
            return (
              <button
                key={actividad}
                type="button"
                onClick={() => set({ tipo_actividad: actividad })}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  activo
                    ? "border-ink-800 bg-ink-900 text-white"
                    : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"
                }`}
              >
                {ETIQUETAS_ACTIVIDAD[actividad]}
              </button>
            );
          })}
        </div>
      </Campo>

      {esEmpleado(e.tipo_actividad) && (
        <fieldset className="grid gap-5 rounded-xl2 border border-ink-100 p-5 sm:grid-cols-2">
          <legend className="px-2 text-sm font-semibold text-ink-800">Datos del empleo</legend>
          <Campo id="empresa" etiqueta="Nombre de la empresa" obligatorio error={errores.empresa}>
            <input id="empresa" className={claseInput(errores.empresa)} value={e.empresa} onChange={(ev) => set({ empresa: ev.target.value })} />
          </Campo>
          <Campo id="cargo" etiqueta="Cargo" obligatorio error={errores.cargo}>
            <input id="cargo" className={claseInput(errores.cargo)} value={e.cargo} onChange={(ev) => set({ cargo: ev.target.value })} />
          </Campo>
          <Campo id="direccion_laboral" etiqueta="Dirección laboral">
            <input id="direccion_laboral" className="input-field" value={e.direccion_laboral} onChange={(ev) => set({ direccion_laboral: ev.target.value })} />
          </Campo>
          <Campo id="tipo_contrato" etiqueta="Tipo de contrato">
            <select id="tipo_contrato" className="input-field" value={e.tipo_contrato} onChange={(ev) => set({ tipo_contrato: ev.target.value })}>
              <option value="">Selecciona…</option>
              {TIPOS_CONTRATO.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Campo>
        </fieldset>
      )}

      {esIndependiente(e.tipo_actividad) && (
        <fieldset className="grid gap-5 rounded-xl2 border border-ink-100 p-5 sm:grid-cols-2">
          <legend className="px-2 text-sm font-semibold text-ink-800">Datos de tu actividad</legend>
          <Campo id="actividad_economica" etiqueta="Actividad económica" obligatorio error={errores.actividad_economica}>
            <input
              id="actividad_economica"
              className={claseInput(errores.actividad_economica)}
              value={e.actividad_economica}
              onChange={(ev) => set({ actividad_economica: ev.target.value })}
              placeholder="Comercio al por menor, consultoría…"
            />
          </Campo>
          <Campo id="nombre_negocio" etiqueta="Nombre del negocio">
            <input id="nombre_negocio" className="input-field" value={e.nombre_negocio} onChange={(ev) => set({ nombre_negocio: ev.target.value })} />
          </Campo>
          <Campo id="direccion_negocio" etiqueta="Dirección del negocio" className="sm:col-span-2">
            <input id="direccion_negocio" className="input-field" value={e.direccion_negocio} onChange={(ev) => set({ direccion_negocio: ev.target.value })} />
          </Campo>
        </fieldset>
      )}

      {e.tipo_actividad === "pensionado" && (
        <fieldset className="rounded-xl2 border border-ink-100 p-5">
          <legend className="px-2 text-sm font-semibold text-ink-800">Pensión</legend>
          <Campo id="entidad_pagadora" etiqueta="Entidad pagadora" obligatorio error={errores.entidad_pagadora}>
            <input
              id="entidad_pagadora"
              className={claseInput(errores.entidad_pagadora)}
              value={e.entidad_pagadora}
              onChange={(ev) => set({ entidad_pagadora: ev.target.value })}
              placeholder="Colpensiones, fondo privado…"
            />
          </Campo>
        </fieldset>
      )}

      {e.tipo_actividad && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            id="antiguedad_meses"
            etiqueta="Antigüedad en la actividad (meses)"
            obligatorio
            error={errores.antiguedad_meses}
            ayuda={`La política pide al menos ${PARAMETROS_POR_DEFECTO.antiguedad_minima_meses} meses.`}
          >
            <input
              id="antiguedad_meses"
              type="number"
              min={0}
              className={claseInput(errores.antiguedad_meses)}
              value={e.antiguedad_meses}
              onChange={(ev) => set({ antiguedad_meses: ev.target.value === "" ? "" : Number(ev.target.value) })}
            />
          </Campo>

          <Campo id="ingresos_mensuales" etiqueta="Ingresos mensuales" obligatorio error={errores.ingresos_mensuales}>
            <input
              id="ingresos_mensuales"
              type="number"
              min={0}
              step={50000}
              className={claseInput(errores.ingresos_mensuales)}
              value={e.ingresos_mensuales}
              onChange={(ev) => set({ ingresos_mensuales: ev.target.value === "" ? "" : Number(ev.target.value) })}
            />
          </Campo>

          <Campo id="otros_ingresos" etiqueta="Otros ingresos mensuales">
            <input
              id="otros_ingresos"
              type="number"
              min={0}
              step={50000}
              className="input-field"
              value={e.otros_ingresos}
              onChange={(ev) => set({ otros_ingresos: ev.target.value === "" ? "" : Number(ev.target.value) })}
            />
          </Campo>

          <Campo id="concepto_otros_ingresos" etiqueta="Concepto de esos otros ingresos">
            <input
              id="concepto_otros_ingresos"
              className="input-field"
              value={e.concepto_otros_ingresos}
              onChange={(ev) => set({ concepto_otros_ingresos: ev.target.value })}
              placeholder="Arriendos, honorarios, pensión alimentaria…"
            />
          </Campo>

          <Campo id="gastos_mensuales" etiqueta="Gastos personales y familiares" obligatorio error={errores.gastos_mensuales}>
            <input
              id="gastos_mensuales"
              type="number"
              min={0}
              step={50000}
              className={claseInput(errores.gastos_mensuales)}
              value={e.gastos_mensuales}
              onChange={(ev) => set({ gastos_mensuales: ev.target.value === "" ? "" : Number(ev.target.value) })}
            />
          </Campo>

          <Campo
            id="obligaciones_financieras"
            etiqueta="Cuota mensual de obligaciones financieras"
            obligatorio
            error={errores.obligaciones_financieras}
            ayuda="Créditos, tarjetas y demás obligaciones reportadas. Si no tienes, escribe 0."
          >
            <input
              id="obligaciones_financieras"
              type="number"
              min={0}
              step={50000}
              className={claseInput(errores.obligaciones_financieras)}
              value={e.obligaciones_financieras}
              onChange={(ev) => set({ obligaciones_financieras: ev.target.value === "" ? "" : Number(ev.target.value) })}
            />
          </Campo>

          <Campo id="personas_a_cargo" etiqueta="Personas a cargo">
            <input
              id="personas_a_cargo"
              type="number"
              min={0}
              className="input-field"
              value={e.personas_a_cargo}
              onChange={(ev) => set({ personas_a_cargo: ev.target.value === "" ? "" : Number(ev.target.value) })}
            />
          </Campo>
        </div>
      )}

      {/* Vista previa de los dos indicadores que gobiernan la decisión (sección 3.2). */}
      {ingresos > 0 && canon > 0 && (
        <div className="rounded-xl2 bg-ink-900 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-300">Cómo va tu evaluación</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-ink-300">Relación canon / ingreso</p>
              <p className={`text-2xl font-semibold ${tonoRci}`}>{(rci * 100).toFixed(1)}%</p>
              <p className="mt-1 text-xs text-ink-400">
                Recomendado: hasta {(PARAMETROS_POR_DEFECTO.rci_maximo_verde * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-300">Capacidad de pago disponible</p>
              <p className="text-2xl font-semibold">{formatoMoneda(Math.max(0, capacidad))}</p>
              <p className="mt-1 text-xs text-ink-400">
                Ingresos menos gastos y obligaciones. El canon de {formatoMoneda(canon)} debe caber con holgura.
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-ink-400">
            Es una estimación con lo que has escrito. El resultado final incluye tu historial en central de riesgo.
          </p>
        </div>
      )}
    </div>
  );
}
