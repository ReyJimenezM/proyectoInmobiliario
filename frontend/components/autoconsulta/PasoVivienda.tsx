"use client";

import { Campo, claseInput } from "@/components/ui/Campo";
import type { PropsPaso } from "./tipos";

const TIPOS_VIVIENDA = [
  { valor: "propia", etiqueta: "Propia" },
  { valor: "familiar", etiqueta: "Familiar" },
  { valor: "arrendada", etiqueta: "Arrendada" },
];

const TIEMPOS = ["Menos de 6 meses", "6 a 12 meses", "1 a 2 años", "2 a 5 años", "Más de 5 años"];

export function PasoVivienda({ estado, actualizar, errores }: PropsPaso) {
  const v = estado.vivienda;
  const set = (cambios: Partial<typeof v>) => actualizar({ vivienda: { ...v, ...cambios } });

  return (
    <div className="space-y-5">
      <Campo id="tipo_vivienda" etiqueta="¿Cómo es la vivienda donde vives hoy?" obligatorio error={errores.tipo_vivienda}>
        <div className="mt-1 grid gap-2 sm:grid-cols-3">
          {TIPOS_VIVIENDA.map((tipo) => {
            const activo = v.tipo_vivienda === tipo.valor;
            return (
              <button
                key={tipo.valor}
                type="button"
                onClick={() => set({ tipo_vivienda: tipo.valor })}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  activo
                    ? "border-ink-800 bg-ink-900 text-white"
                    : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"
                }`}
              >
                {tipo.etiqueta}
              </button>
            );
          })}
        </div>
      </Campo>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="tiempo_vivienda" etiqueta="Tiempo en la vivienda actual" obligatorio error={errores.tiempo_vivienda}>
          <select
            id="tiempo_vivienda"
            className={claseInput(errores.tiempo_vivienda)}
            value={v.tiempo_vivienda}
            onChange={(e) => set({ tiempo_vivienda: e.target.value })}
          >
            <option value="">Selecciona…</option>
            {TIEMPOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>

        <Campo id="numero_ocupantes" etiqueta="Personas que habitarán el inmueble" obligatorio error={errores.numero_ocupantes}>
          <input
            id="numero_ocupantes"
            type="number"
            min={1}
            className={claseInput(errores.numero_ocupantes)}
            value={v.numero_ocupantes}
            onChange={(e) => set({ numero_ocupantes: e.target.value === "" ? "" : Number(e.target.value) })}
          />
        </Campo>
      </div>

      <Campo id="motivo_mudanza" etiqueta="Motivo de la mudanza" ayuda="Nos ayuda a entender tu caso; no afecta el puntaje.">
        <textarea
          id="motivo_mudanza"
          rows={2}
          className="input-field"
          value={v.motivo_mudanza}
          onChange={(e) => set({ motivo_mudanza: e.target.value })}
          placeholder="Cambio de ciudad, crecimiento familiar, cercanía al trabajo…"
        />
      </Campo>

      {/* La referencia del arrendador es el dato diferencial de este negocio frente a un
          crédito de consumo: se pide siempre, y es obligatoria si hoy vive en arriendo. */}
      <fieldset className="rounded-xl2 border border-ink-100 bg-sand-50 p-5">
        <legend className="px-2 text-sm font-semibold text-ink-800">Referencia de arrendamiento</legend>
        <p className="mb-4 text-xs text-ink-500">
          {v.tipo_vivienda === "arrendada"
            ? "Como vives en arriendo, necesitamos poder verificar tu comportamiento de pago con tu arrendador actual."
            : "Si has arrendado antes, dinos con quién. Es opcional, pero suma a tu evaluación."}
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            id="arrendador_nombre"
            etiqueta="Nombre del arrendador actual o anterior"
            obligatorio={v.tipo_vivienda === "arrendada"}
            error={errores.arrendador_nombre}
          >
            <input
              id="arrendador_nombre"
              className={claseInput(errores.arrendador_nombre)}
              value={v.arrendador_nombre}
              onChange={(e) => set({ arrendador_nombre: e.target.value })}
            />
          </Campo>

          <Campo
            id="arrendador_telefono"
            etiqueta="Teléfono del arrendador"
            obligatorio={v.tipo_vivienda === "arrendada"}
            error={errores.arrendador_telefono}
          >
            <input
              id="arrendador_telefono"
              inputMode="tel"
              className={claseInput(errores.arrendador_telefono)}
              value={v.arrendador_telefono}
              onChange={(e) => set({ arrendador_telefono: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="rounded-xl2 border border-ink-100 p-5">
        <legend className="px-2 text-sm font-semibold text-ink-800">Mascotas</legend>
        <p className="mb-3 text-xs text-ink-500">
          Algunos propietarios lo exigen como filtro del inmueble. No entra en el cálculo de riesgo.
        </p>
        <label className="flex items-center gap-3 text-sm text-ink-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-ink-300 text-clay-600 focus:ring-clay-500"
            checked={v.tiene_mascotas}
            onChange={(e) => set({ tiene_mascotas: e.target.checked })}
          />
          Vivo con mascotas
        </label>

        {v.tiene_mascotas && (
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Campo id="mascotas_tipo" etiqueta="Tipo de mascota" obligatorio error={errores.mascotas_tipo}>
              <input
                id="mascotas_tipo"
                className={claseInput(errores.mascotas_tipo)}
                value={v.mascotas_tipo}
                onChange={(e) => set({ mascotas_tipo: e.target.value })}
                placeholder="Perro pequeño, gato…"
              />
            </Campo>
            <Campo id="mascotas_cantidad" etiqueta="Cantidad">
              <input
                id="mascotas_cantidad"
                type="number"
                min={1}
                className="input-field"
                value={v.mascotas_cantidad}
                onChange={(e) => set({ mascotas_cantidad: e.target.value === "" ? "" : Number(e.target.value) })}
              />
            </Campo>
          </div>
        )}
      </fieldset>
    </div>
  );
}
