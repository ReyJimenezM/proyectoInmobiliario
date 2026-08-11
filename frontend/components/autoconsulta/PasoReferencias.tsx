"use client";

import { Campo, claseInput } from "@/components/ui/Campo";
import type { Referencia } from "@/lib/autoconsulta";
import type { PropsPaso } from "./tipos";

function esIndependiente(actividad: string) {
  return actividad === "independiente_formal" || actividad === "independiente_informal";
}

function BloqueReferencia({
  prefijo,
  indice,
  titulo,
  referencia,
  conParentesco,
  errores,
  onChange,
}: {
  prefijo: string;
  indice: number;
  titulo: string;
  referencia: Referencia;
  conParentesco: boolean;
  errores: Record<string, string>;
  onChange: (cambios: Partial<Referencia>) => void;
}) {
  const idNombre = `${prefijo}_${indice}_nombre`;
  const idTelefono = `${prefijo}_${indice}_telefono`;
  const idParentesco = `${prefijo}_${indice}_parentesco`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <p className="sm:col-span-2 text-sm font-medium text-ink-700">{titulo}</p>

      <Campo id={idNombre} etiqueta="Nombre completo" obligatorio error={errores[idNombre]}>
        <input
          id={idNombre}
          className={claseInput(errores[idNombre])}
          value={referencia.nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
        />
      </Campo>

      <Campo id={idTelefono} etiqueta="Teléfono" obligatorio error={errores[idTelefono]}>
        <input
          id={idTelefono}
          inputMode="tel"
          className={claseInput(errores[idTelefono])}
          value={referencia.telefono}
          onChange={(e) => onChange({ telefono: e.target.value.replace(/\D/g, "").slice(0, 10) })}
        />
      </Campo>

      {conParentesco && (
        <Campo id={idParentesco} etiqueta="Parentesco" obligatorio error={errores[idParentesco]} className="sm:col-span-2">
          <input
            id={idParentesco}
            className={claseInput(errores[idParentesco])}
            value={referencia.parentesco ?? ""}
            onChange={(e) => onChange({ parentesco: e.target.value })}
            placeholder="Madre, hermano, tío…"
          />
        </Campo>
      )}
    </div>
  );
}

export function PasoReferencias({ estado, actualizar, errores }: PropsPaso) {
  const r = estado.referencias;

  function actualizarLista(clave: "personales" | "familiares", indice: number, cambios: Partial<Referencia>) {
    const lista = r[clave].map((ref, i) => (i === indice ? { ...ref, ...cambios } : ref));
    actualizar({ referencias: { ...r, [clave]: lista } });
  }

  const pideComercial = esIndependiente(estado.economica.tipo_actividad);

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">
        Llamamos a tus referencias solo para confirmar que te conocen y verificar los datos que nos diste.
      </p>

      <fieldset className="space-y-6 rounded-xl2 border border-ink-100 p-5">
        <legend className="px-2 text-sm font-semibold text-ink-800">Referencias personales</legend>
        {r.personales.map((ref, i) => (
          <BloqueReferencia
            key={`personal-${i}`}
            prefijo="personal"
            indice={i}
            titulo={`Referencia personal ${i + 1}`}
            referencia={ref}
            conParentesco={false}
            errores={errores}
            onChange={(cambios) => actualizarLista("personales", i, cambios)}
          />
        ))}
      </fieldset>

      <fieldset className="space-y-6 rounded-xl2 border border-ink-100 p-5">
        <legend className="px-2 text-sm font-semibold text-ink-800">Referencias familiares</legend>
        {r.familiares.map((ref, i) => (
          <BloqueReferencia
            key={`familiar-${i}`}
            prefijo="familiar"
            indice={i}
            titulo={`Referencia familiar ${i + 1}`}
            referencia={ref}
            conParentesco
            errores={errores}
            onChange={(cambios) => actualizarLista("familiares", i, cambios)}
          />
        ))}
      </fieldset>

      {pideComercial && (
        <fieldset className="grid gap-4 rounded-xl2 border border-ink-100 p-5 sm:grid-cols-2">
          <legend className="px-2 text-sm font-semibold text-ink-800">Referencia comercial</legend>
          <p className="text-xs text-ink-500 sm:col-span-2">
            Como trabajas de forma independiente, pedimos un proveedor o cliente que pueda dar fe de tu actividad.
          </p>
          <Campo id="comercial_nombre" etiqueta="Nombre o razón social" obligatorio error={errores.comercial_nombre}>
            <input
              id="comercial_nombre"
              className={claseInput(errores.comercial_nombre)}
              value={r.comercial.nombre}
              onChange={(e) => actualizar({ referencias: { ...r, comercial: { ...r.comercial, nombre: e.target.value } } })}
            />
          </Campo>
          <Campo id="comercial_telefono" etiqueta="Teléfono">
            <input
              id="comercial_telefono"
              inputMode="tel"
              className="input-field"
              value={r.comercial.telefono}
              onChange={(e) =>
                actualizar({
                  referencias: { ...r, comercial: { ...r.comercial, telefono: e.target.value.replace(/\D/g, "").slice(0, 10) } },
                })
              }
            />
          </Campo>
        </fieldset>
      )}

      {/* La referencia del arrendador se captura en el paso 2; aquí solo se recuerda. */}
      <div className="rounded-xl2 bg-sand-100 p-5">
        <p className="text-sm font-semibold text-ink-800">Referencia del arrendador anterior</p>
        {estado.vivienda.arrendador_nombre ? (
          <p className="mt-1 text-sm text-ink-600">
            {estado.vivienda.arrendador_nombre}
            {estado.vivienda.arrendador_telefono ? ` · ${estado.vivienda.arrendador_telefono}` : ""}
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-500">
            No registraste una. Puedes volver al paso de vivienda actual y agregarla: suma bastante a tu evaluación.
          </p>
        )}
      </div>
    </div>
  );
}
