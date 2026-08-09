"use client";

import { useState } from "react";
import { guardarGarantiasReferencias } from "@/lib/api";
import type { GarantiasReferenciasInput, SolicitudOut } from "@/lib/types";

function valorInicial(solicitud: SolicitudOut): GarantiasReferenciasInput {
  const g = solicitud.garantias_referencias as Partial<GarantiasReferenciasInput>;
  return {
    tiene_codeudor: g.tiene_codeudor ?? false,
    codeudor: g.codeudor ?? {
      nombre: "", documento: "", telefono: "", ingresos_declarados: 0, ingresos_variables: 0, cuotas_obligaciones: 0,
    },
    tiene_poliza: g.tiene_poliza ?? false,
    referencia_laboral: g.referencia_laboral ?? { nombre: "", relacion: "", telefono: "" },
    referencia_personal: g.referencia_personal ?? { nombre: "", relacion: "", telefono: "" },
    referencia_arrendador: g.referencia_arrendador ?? { nombre: "", telefono: "", tiempo_arriendo: "" },
    ha_arrendado_antes: g.ha_arrendado_antes ?? false,
    mora_en_arriendo_anterior: g.mora_en_arriendo_anterior ?? "ninguna",
    proceso_restitucion_previo: g.proceso_restitucion_previo ?? false,
  };
}

export function PasoGarantiasReferencias({
  solicitud,
  onGuardado,
}: {
  solicitud: SolicitudOut;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<GarantiasReferenciasInput>(valorInicial(solicitud));
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const esArriendo = solicitud.vertical === "arriendo";

  function actualizar<K extends keyof GarantiasReferenciasInput>(campo: K, valor: GarantiasReferenciasInput[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function continuar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const payload: GarantiasReferenciasInput = {
        ...datos,
        codeudor: datos.tiene_codeudor ? datos.codeudor : undefined,
        referencia_arrendador: esArriendo ? datos.referencia_arrendador : undefined,
      };
      await guardarGarantiasReferencias(solicitud.id, payload);
      onGuardado();
    } catch {
      setError("No pudimos guardar tus garantías y referencias.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={continuar} className="space-y-6">
      <div>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={datos.tiene_codeudor}
            onChange={(e) => actualizar("tiene_codeudor", e.target.checked)}
            className="h-4 w-4 rounded border-ink-300"
          />
          ¿Cuentas con codeudor?
        </label>

        {datos.tiene_codeudor && (
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-ink-100 p-3">
            <input
              placeholder="Nombre del codeudor"
              value={datos.codeudor?.nombre}
              onChange={(e) => actualizar("codeudor", { ...datos.codeudor!, nombre: e.target.value })}
              className="input-field"
            />
            <input
              placeholder="Documento"
              value={datos.codeudor?.documento}
              onChange={(e) => actualizar("codeudor", { ...datos.codeudor!, documento: e.target.value })}
              className="input-field"
            />
            <input
              placeholder="Teléfono"
              value={datos.codeudor?.telefono}
              onChange={(e) => actualizar("codeudor", { ...datos.codeudor!, telefono: e.target.value })}
              className="input-field"
            />
            <input
              type="number"
              placeholder="Ingresos fijos declarados"
              value={datos.codeudor?.ingresos_declarados || ""}
              onChange={(e) =>
                actualizar("codeudor", { ...datos.codeudor!, ingresos_declarados: Number(e.target.value) })
              }
              className="input-field"
            />
            <input
              type="number"
              placeholder="Ingresos variables"
              value={datos.codeudor?.ingresos_variables || ""}
              onChange={(e) =>
                actualizar("codeudor", { ...datos.codeudor!, ingresos_variables: Number(e.target.value) })
              }
              className="input-field"
            />
            <input
              type="number"
              placeholder="Cuotas de obligaciones"
              value={datos.codeudor?.cuotas_obligaciones || ""}
              onChange={(e) =>
                actualizar("codeudor", { ...datos.codeudor!, cuotas_obligaciones: Number(e.target.value) })
              }
              className="input-field"
            />
          </div>
        )}
      </div>

      {esArriendo && (
        <div>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={datos.ha_arrendado_antes}
              onChange={(e) => actualizar("ha_arrendado_antes", e.target.checked)}
              className="h-4 w-4 rounded border-ink-300"
            />
            ¿Has arrendado antes? (si es tu primer arriendo, no te penaliza — se evalúa neutral)
          </label>

          {datos.ha_arrendado_antes && (
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-ink-100 p-3">
              <div>
                <label className="label-field">¿Presentaste mora en el arriendo anterior?</label>
                <select
                  value={datos.mora_en_arriendo_anterior}
                  onChange={(e) =>
                    actualizar("mora_en_arriendo_anterior", e.target.value as GarantiasReferenciasInput["mora_en_arriendo_anterior"])
                  }
                  className="input-field"
                >
                  <option value="ninguna">No, ninguna mora</option>
                  <option value="leve">Sí, mora leve (menos de 30 días)</option>
                  <option value="grave">Sí, mora superior a 60 días</option>
                </select>
              </div>
              <label className="mt-6 flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={datos.proceso_restitucion_previo}
                  onChange={(e) => actualizar("proceso_restitucion_previo", e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300"
                />
                ¿Has tenido un proceso de restitución de inmueble?
              </label>
            </div>
          )}
        </div>
      )}

      {esArriendo && (
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={datos.tiene_poliza}
            onChange={(e) => actualizar("tiene_poliza", e.target.checked)}
            className="h-4 w-4 rounded border-ink-300"
          />
          ¿Estás dispuesto a tomar póliza de arrendamiento / seguro de cumplimiento?
        </label>
      )}

      <div>
        <p className="label-field">Referencia laboral</p>
        <div className="grid grid-cols-3 gap-2">
          <input
            placeholder="Nombre"
            required
            value={datos.referencia_laboral.nombre}
            onChange={(e) => actualizar("referencia_laboral", { ...datos.referencia_laboral, nombre: e.target.value })}
            className="input-field"
          />
          <input
            placeholder="Relación"
            value={datos.referencia_laboral.relacion}
            onChange={(e) => actualizar("referencia_laboral", { ...datos.referencia_laboral, relacion: e.target.value })}
            className="input-field"
          />
          <input
            placeholder="Teléfono"
            required
            value={datos.referencia_laboral.telefono}
            onChange={(e) => actualizar("referencia_laboral", { ...datos.referencia_laboral, telefono: e.target.value })}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <p className="label-field">Referencia personal (no familiar)</p>
        <div className="grid grid-cols-3 gap-2">
          <input
            placeholder="Nombre"
            required
            value={datos.referencia_personal.nombre}
            onChange={(e) => actualizar("referencia_personal", { ...datos.referencia_personal, nombre: e.target.value })}
            className="input-field"
          />
          <input
            placeholder="Relación"
            value={datos.referencia_personal.relacion}
            onChange={(e) => actualizar("referencia_personal", { ...datos.referencia_personal, relacion: e.target.value })}
            className="input-field"
          />
          <input
            placeholder="Teléfono"
            required
            value={datos.referencia_personal.telefono}
            onChange={(e) => actualizar("referencia_personal", { ...datos.referencia_personal, telefono: e.target.value })}
            className="input-field"
          />
        </div>
      </div>

      {esArriendo && (
        <div>
          <p className="label-field">Referencia del arrendador anterior</p>
          <div className="grid grid-cols-3 gap-2">
            <input
              placeholder="Nombre"
              value={datos.referencia_arrendador?.nombre}
              onChange={(e) =>
                actualizar("referencia_arrendador", { ...datos.referencia_arrendador!, nombre: e.target.value })
              }
              className="input-field"
            />
            <input
              placeholder="Teléfono"
              value={datos.referencia_arrendador?.telefono}
              onChange={(e) =>
                actualizar("referencia_arrendador", { ...datos.referencia_arrendador!, telefono: e.target.value })
              }
              className="input-field"
            />
            <input
              placeholder="Tiempo de arriendo anterior"
              value={datos.referencia_arrendador?.tiempo_arriendo}
              onChange={(e) =>
                actualizar("referencia_arrendador", { ...datos.referencia_arrendador!, tiempo_arriendo: e.target.value })
              }
              className="input-field"
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button type="submit" disabled={cargando} className="btn-primary w-full">
        {cargando ? "Guardando..." : "Continuar"}
      </button>
    </form>
  );
}
