"use client";

import { useState } from "react";
import { guardarDatosFinancieros } from "@/lib/api";
import type { DatosFinancierosInput, SolicitudOut } from "@/lib/types";

function valorInicial(solicitud: SolicitudOut): DatosFinancierosInput {
  const g = solicitud.datos_financieros as Partial<DatosFinancierosInput>;
  return {
    ingresos_mensuales_fijos: g.ingresos_mensuales_fijos ?? 0,
    ingresos_variables: g.ingresos_variables ?? 0,
    ingresos_otros: g.ingresos_otros ?? 0,
    descripcion_ingresos_variables: g.descripcion_ingresos_variables ?? "",
    deducciones_nomina: g.deducciones_nomina ?? 0,
    ingreso_no_verificable: g.ingreso_no_verificable ?? 0,
    gastos_mensuales_fijos: g.gastos_mensuales_fijos ?? 0,
    tiene_otros_creditos: g.tiene_otros_creditos ?? false,
    otros_creditos: g.otros_creditos ?? [],
    tiene_ahorros: g.tiene_ahorros ?? false,
    monto_ahorros: g.monto_ahorros ?? 0,
    patrimonio_activos: g.patrimonio_activos ?? [],
    patrimonio_pasivos: g.patrimonio_pasivos ?? [],
    autorizacion_centrales_riesgo: g.autorizacion_centrales_riesgo ?? false,
  };
}

export function PasoDatosFinancieros({
  solicitud,
  onGuardado,
}: {
  solicitud: SolicitudOut;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<DatosFinancierosInput>(valorInicial(solicitud));
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function actualizar<K extends keyof DatosFinancierosInput>(campo: K, valor: DatosFinancierosInput[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  function agregarCredito() {
    actualizar("otros_creditos", [
      ...datos.otros_creditos,
      { entidad: "", saldo_aproximado: 0, cuota_mensual: 0, en_mora: false },
    ]);
  }

  function actualizarCredito(
    idx: number,
    campo: "entidad" | "saldo_aproximado" | "cuota_mensual" | "en_mora",
    valor: string | number | boolean
  ) {
    const copia = [...datos.otros_creditos];
    copia[idx] = { ...copia[idx], [campo]: valor };
    actualizar("otros_creditos", copia);
  }

  function agregarPatrimonio(tipo: "patrimonio_activos" | "patrimonio_pasivos") {
    actualizar(tipo, [...datos[tipo], 0]);
  }

  function actualizarPatrimonio(tipo: "patrimonio_activos" | "patrimonio_pasivos", idx: number, valor: number) {
    const copia = [...datos[tipo]];
    copia[idx] = valor;
    actualizar(tipo, copia);
  }

  async function continuar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!datos.autorizacion_centrales_riesgo) {
      setError("Debes autorizar la consulta en centrales de riesgo para continuar.");
      return;
    }

    setCargando(true);
    try {
      await guardarDatosFinancieros(solicitud.id, datos);
      onGuardado();
    } catch {
      setError("No pudimos guardar tu información financiera.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={continuar} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">Ingresos mensuales fijos</label>
          <input
            type="number"
            required
            min={0}
            value={datos.ingresos_mensuales_fijos || ""}
            onChange={(e) => actualizar("ingresos_mensuales_fijos", Number(e.target.value))}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">Ingresos variables/adicionales</label>
          <input
            type="number"
            min={0}
            value={datos.ingresos_variables || ""}
            onChange={(e) => actualizar("ingresos_variables", Number(e.target.value))}
            className="input-field"
          />
        </div>
      </div>

      {datos.ingresos_variables > 0 && (
        <div>
          <label className="label-field">Origen de los ingresos variables</label>
          <input
            value={datos.descripcion_ingresos_variables}
            onChange={(e) => actualizar("descripcion_ingresos_variables", e.target.value)}
            className="input-field"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label-field">Otros ingresos (arriendos, rentas)</label>
          <input
            type="number"
            min={0}
            value={datos.ingresos_otros || ""}
            onChange={(e) => actualizar("ingresos_otros", Number(e.target.value))}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">Deducciones de nómina</label>
          <input
            type="number"
            min={0}
            value={datos.deducciones_nomina || ""}
            onChange={(e) => actualizar("deducciones_nomina", Number(e.target.value))}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">De lo anterior, ¿cuánto NO es verificable con documentos?</label>
          <input
            type="number"
            min={0}
            value={datos.ingreso_no_verificable || ""}
            onChange={(e) => actualizar("ingreso_no_verificable", Number(e.target.value))}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label-field">Gastos mensuales fijos declarados</label>
        <input
          type="number"
          min={0}
          value={datos.gastos_mensuales_fijos || ""}
          onChange={(e) => actualizar("gastos_mensuales_fijos", Number(e.target.value))}
          className="input-field"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={datos.tiene_otros_creditos}
          onChange={(e) => actualizar("tiene_otros_creditos", e.target.checked)}
          className="h-4 w-4 rounded border-ink-300"
        />
        ¿Tienes otros créditos activos?
      </label>

      {datos.tiene_otros_creditos && (
        <div className="space-y-3 rounded-lg border border-ink-100 p-3">
          {datos.otros_creditos.map((credito, idx) => (
            <div key={idx} className="grid grid-cols-4 items-center gap-2">
              <input
                placeholder="Entidad"
                value={credito.entidad}
                onChange={(e) => actualizarCredito(idx, "entidad", e.target.value)}
                className="input-field"
              />
              <input
                type="number"
                placeholder="Saldo aprox."
                value={credito.saldo_aproximado || ""}
                onChange={(e) => actualizarCredito(idx, "saldo_aproximado", Number(e.target.value))}
                className="input-field"
              />
              <input
                type="number"
                placeholder="Cuota mensual"
                value={credito.cuota_mensual || ""}
                onChange={(e) => actualizarCredito(idx, "cuota_mensual", Number(e.target.value))}
                className="input-field"
              />
              <label className="flex items-center gap-1.5 text-xs text-ink-600">
                <input
                  type="checkbox"
                  checked={credito.en_mora}
                  onChange={(e) => actualizarCredito(idx, "en_mora", e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300"
                />
                En mora
              </label>
            </div>
          ))}
          <button type="button" onClick={agregarCredito} className="text-sm font-semibold text-clay-600">
            + Agregar crédito
          </button>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={datos.tiene_ahorros}
          onChange={(e) => actualizar("tiene_ahorros", e.target.checked)}
          className="h-4 w-4 rounded border-ink-300"
        />
        ¿Tienes ahorros o capacidad de depósito adicional?
      </label>

      {datos.tiene_ahorros && (
        <div>
          <label className="label-field">Monto aproximado</label>
          <input
            type="number"
            min={0}
            value={datos.monto_ahorros || ""}
            onChange={(e) => actualizar("monto_ahorros", Number(e.target.value))}
            className="input-field"
          />
        </div>
      )}

      <div>
        <p className="label-field">Patrimonio (opcional) — un respaldo patrimonial puede mejorar tu evaluación</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 rounded-lg border border-ink-100 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-500">Activos</span>
              <button type="button" onClick={() => agregarPatrimonio("patrimonio_activos")} className="text-xs font-semibold text-clay-600">
                + Agregar
              </button>
            </div>
            {datos.patrimonio_activos.map((valor, idx) => (
              <input
                key={idx}
                type="number"
                min={0}
                placeholder="Valor del activo"
                value={valor || ""}
                onChange={(e) => actualizarPatrimonio("patrimonio_activos", idx, Number(e.target.value))}
                className="input-field"
              />
            ))}
          </div>
          <div className="space-y-2 rounded-lg border border-ink-100 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-500">Pasivos</span>
              <button type="button" onClick={() => agregarPatrimonio("patrimonio_pasivos")} className="text-xs font-semibold text-clay-600">
                + Agregar
              </button>
            </div>
            {datos.patrimonio_pasivos.map((valor, idx) => (
              <input
                key={idx}
                type="number"
                min={0}
                placeholder="Valor del pasivo"
                value={valor || ""}
                onChange={(e) => actualizarPatrimonio("patrimonio_pasivos", idx, Number(e.target.value))}
                className="input-field"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
        <label className="flex items-start gap-3 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={datos.autorizacion_centrales_riesgo}
            onChange={(e) => actualizar("autorizacion_centrales_riesgo", e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink-300"
          />
          <span>
            Autorizo de manera expresa e irrevocable a Raíz y a la entidad evaluadora del crédito a
            consultar, reportar y procesar mi información financiera y crediticia ante las centrales
            de riesgo autorizadas, con el fin de evaluar mi solicitud de crédito o arrendamiento, de
            acuerdo con la Ley 1581 de 2012 y demás normas vigentes en Colombia.
          </span>
        </label>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button type="submit" disabled={cargando} className="btn-primary w-full">
        {cargando ? "Guardando..." : "Continuar"}
      </button>
    </form>
  );
}
