"use client";

import { Campo, claseInput } from "@/components/ui/Campo";
import { CIUDADES_POR_SLUG } from "@/lib/ciudades";
import { formatoMoneda } from "@/lib/format";
import type { PropsPaso } from "./tipos";

const TIPOS_INMUEBLE = ["Apartamento", "Casa", "Apartaestudio", "Local", "Oficina", "Bodega"];

export function PasoInicio({ estado, actualizar, errores }: PropsPaso) {
  const p = estado.preformulario;
  const set = (cambios: Partial<typeof p>) => actualizar({ preformulario: { ...p, ...cambios } });

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-500">
        Con estos tres datos ya podemos calcular tu relación canon/ingreso. Toma menos de un minuto.
      </p>

      {p.propiedad_titulo && (
        <div className="rounded-xl2 border border-ink-100 bg-sand-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Inmueble de interés</p>
          <p className="mt-1 text-sm font-medium text-ink-900">{p.propiedad_titulo}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="ciudad" etiqueta="Ciudad o municipio" obligatorio error={errores.ciudad}>
          <select
            id="ciudad"
            className={claseInput(errores.ciudad)}
            value={p.ciudad}
            onChange={(e) => set({ ciudad: e.target.value })}
          >
            <option value="">Selecciona…</option>
            {Object.entries(CIUDADES_POR_SLUG).map(([slug, nombre]) => (
              <option key={slug} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="tipo_inmueble" etiqueta="Tipo de inmueble" obligatorio error={errores.tipo_inmueble}>
          <select
            id="tipo_inmueble"
            className={claseInput(errores.tipo_inmueble)}
            value={p.tipo_inmueble}
            onChange={(e) => set({ tipo_inmueble: e.target.value })}
          >
            <option value="">Selecciona…</option>
            {TIPOS_INMUEBLE.map((tipo) => (
              <option key={tipo}>{tipo}</option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo
        id="canon_deseado"
        etiqueta="Canon mensual que buscas"
        obligatorio
        error={errores.canon_deseado}
        ayuda={p.canon_deseado ? formatoMoneda(Number(p.canon_deseado)) : "Sin incluir administración."}
      >
        <input
          id="canon_deseado"
          type="number"
          min={0}
          step={50000}
          className={claseInput(errores.canon_deseado)}
          value={p.canon_deseado}
          onChange={(e) => set({ canon_deseado: e.target.value === "" ? "" : Number(e.target.value) })}
          placeholder="2000000"
        />
      </Campo>

      <div className="rounded-xl2 bg-ink-50 p-4 text-xs text-ink-600">
        Guardamos tu avance en este dispositivo. Si cierras el navegador, puedes volver con el código{" "}
        <span className="font-mono font-semibold text-ink-900">{estado.codigo}</span>.
      </div>
    </div>
  );
}
