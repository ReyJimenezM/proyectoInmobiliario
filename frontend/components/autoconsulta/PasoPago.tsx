"use client";

import { useState } from "react";
import { COBRO_ESTUDIO } from "@/lib/autoconsulta";
import { formatoMoneda } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import type { PropsPaso } from "./tipos";

const METODOS = [
  { clave: "PSE", nombre: "PSE — débito desde tu banco", detalle: "Te redirigimos al portal de tu banco." },
  { clave: "Tarjeta de crédito", nombre: "Tarjeta de crédito", detalle: "Pago procesado en el sitio seguro de la pasarela." },
  { clave: "Tarjeta débito", nombre: "Tarjeta débito", detalle: "Pago procesado en el sitio seguro de la pasarela." },
];

const BANCOS = ["Bancolombia", "Davivienda", "BBVA", "Banco de Bogotá", "Nequi", "Nu"];

export function PasoPago({ estado, actualizar, errores }: PropsPaso) {
  const [metodo, setMetodo] = useState(estado.pago.metodo || "PSE");
  const [banco, setBanco] = useState("");
  const [procesando, setProcesando] = useState(false);

  const pagado = estado.pago.estado === "pagado";

  function pagar() {
    setProcesando(true);
    // La pasarela real redirige fuera del sitio y vuelve con una referencia. Aquí simulamos ese
    // viaje de ida y vuelta: en producción, este bloque se reemplaza por la redirección y el
    // webhook de confirmación es quien marca la transacción como aprobada.
    window.setTimeout(() => {
      actualizar({
        pago: {
          estado: "pagado",
          metodo,
          referencia: `SIM-${estado.codigo}`,
          valor: COBRO_ESTUDIO.valor,
          pagado_en: new Date().toISOString(),
        },
      });
      setProcesando(false);
    }, 900);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl2 bg-ink-900 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-300">Resumen del cobro</p>
        <p className="mt-2 text-3xl font-semibold">{formatoMoneda(COBRO_ESTUDIO.valor)}</p>
        <p className="mt-1 text-sm text-ink-300">{COBRO_ESTUDIO.concepto}</p>

        <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-300">Solicitud</dt>
            <dd className="font-medium">{estado.codigo}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-300">Titular</dt>
            <dd className="truncate font-medium">
              {estado.personales.nombres} {estado.personales.apellidos}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-300">Inmueble de interés</dt>
            <dd className="truncate font-medium">
              {estado.preformulario.propiedad_titulo || `${estado.preformulario.tipo_inmueble} en ${estado.preformulario.ciudad}`}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl2 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        El pago cubre el estudio, que incluye la consulta a central de riesgo. No garantiza la aprobación: el
        resultado depende de la política de riesgo vigente.
      </div>

      {pagado ? (
        <div className="rounded-xl2 border border-emerald-200 bg-emerald-50 p-6">
          <Badge tono="exito">Pago confirmado</Badge>
          <p className="mt-3 text-sm text-emerald-900">
            Recibimos {formatoMoneda(estado.pago.valor)} por {estado.pago.metodo}. Referencia{" "}
            <span className="font-mono font-semibold">{estado.pago.referencia}</span>.
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            Ya podemos consultar la central de riesgo y entregarte el resultado.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-ink-800">¿Cómo quieres pagar?</p>

          <div className="grid gap-2">
            {METODOS.map((m) => {
              const activo = metodo === m.clave;
              return (
                <button
                  key={m.clave}
                  type="button"
                  onClick={() => setMetodo(m.clave)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    activo ? "border-ink-800 bg-ink-50" : "border-ink-200 bg-white hover:border-ink-400"
                  }`}
                >
                  <span className="block text-sm font-semibold text-ink-900">{m.nombre}</span>
                  <span className="block text-xs text-ink-500">{m.detalle}</span>
                </button>
              );
            })}
          </div>

          {metodo === "PSE" && (
            <div>
              <label htmlFor="banco" className="label-field">
                Banco
              </label>
              <select id="banco" className="input-field" value={banco} onChange={(e) => setBanco(e.target.value)}>
                <option value="">Selecciona tu banco…</option>
                {BANCOS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
          )}

          {/* Nunca se piden datos de tarjeta dentro de la plataforma: eso ocurre en el sitio de
              la pasarela, que es quien está certificada para recibirlos. */}
          {metodo !== "PSE" && (
            <p className="rounded-xl bg-ink-50 p-4 text-xs text-ink-600">
              Los datos de tu tarjeta se ingresan en el sitio seguro de la pasarela, nunca en esta pantalla.
            </p>
          )}

          {errores.pago && (
            <p role="alert" className="text-sm font-medium text-rose-600">
              {errores.pago}
            </p>
          )}

          <button
            type="button"
            onClick={pagar}
            disabled={procesando || (metodo === "PSE" && !banco)}
            className="btn-primary w-full sm:w-auto"
          >
            {procesando ? "Conectando con la pasarela…" : `Pagar ${formatoMoneda(COBRO_ESTUDIO.valor)}`}
          </button>

          <p className="text-xs text-ink-400">
            Demo sin pasarela conectada: al confirmar se genera una referencia simulada para poder continuar el flujo.
          </p>
        </div>
      )}
    </div>
  );
}
