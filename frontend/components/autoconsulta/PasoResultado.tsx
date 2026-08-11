"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Campo, claseInput } from "@/components/ui/Campo";
import { Badge } from "@/components/ui/Badge";
import { construirEntradaMotor, ETIQUETAS_ACTIVIDAD, type TipoActividad } from "@/lib/autoconsulta";
import { ESTILOS_VEREDICTO, ETIQUETAS_VEREDICTO, evaluar } from "@/lib/motorLocal";
import { formatoMoneda } from "@/lib/format";
import type { PropsPaso } from "./tipos";

const PUNTOS_TRAZA = {
  ok: { tono: "bg-emerald-500", etiqueta: "Cumple" },
  alerta: { tono: "bg-amber-500", etiqueta: "Con reparos" },
  falla: { tono: "bg-rose-500", etiqueta: "No cumple" },
} as const;

function FormularioCodeudor({ estado, actualizar }: Pick<PropsPaso, "estado" | "actualizar">) {
  const c = estado.codeudor;
  const set = (cambios: Partial<typeof c>) => actualizar({ codeudor: { ...c, ...cambios } });

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <Campo id="cod_nombres" etiqueta="Nombres del codeudor" obligatorio>
        <input id="cod_nombres" className="input-field" value={c.nombres} onChange={(e) => set({ nombres: e.target.value })} />
      </Campo>
      <Campo id="cod_apellidos" etiqueta="Apellidos" obligatorio>
        <input id="cod_apellidos" className="input-field" value={c.apellidos} onChange={(e) => set({ apellidos: e.target.value })} />
      </Campo>
      <Campo id="cod_documento" etiqueta="Número de documento" obligatorio>
        <input
          id="cod_documento"
          inputMode="numeric"
          className="input-field"
          value={c.numero_documento}
          onChange={(e) => set({ numero_documento: e.target.value.replace(/\D/g, "") })}
        />
      </Campo>
      <Campo id="cod_parentesco" etiqueta="Relación contigo">
        <input
          id="cod_parentesco"
          className="input-field"
          value={c.parentesco}
          onChange={(e) => set({ parentesco: e.target.value })}
          placeholder="Padre, hermana, socio…"
        />
      </Campo>
      <Campo id="cod_celular" etiqueta="Celular" obligatorio>
        <input
          id="cod_celular"
          inputMode="tel"
          className="input-field"
          value={c.celular}
          onChange={(e) => set({ celular: e.target.value.replace(/\D/g, "").slice(0, 10) })}
        />
      </Campo>
      <Campo id="cod_correo" etiqueta="Correo electrónico">
        <input id="cod_correo" type="email" className="input-field" value={c.correo} onChange={(e) => set({ correo: e.target.value })} />
      </Campo>
      <Campo id="cod_actividad" etiqueta="Actividad económica">
        <select
          id="cod_actividad"
          className="input-field"
          value={c.tipo_actividad}
          onChange={(e) => set({ tipo_actividad: e.target.value as TipoActividad })}
        >
          <option value="">Selecciona…</option>
          {(Object.keys(ETIQUETAS_ACTIVIDAD) as TipoActividad[]).map((a) => (
            <option key={a} value={a}>
              {ETIQUETAS_ACTIVIDAD[a]}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="cod_ingresos" etiqueta="Ingresos mensuales" obligatorio>
        <input
          id="cod_ingresos"
          type="number"
          min={0}
          step={50000}
          className={claseInput()}
          value={c.ingresos_mensuales}
          onChange={(e) => set({ ingresos_mensuales: e.target.value === "" ? "" : Number(e.target.value) })}
        />
      </Campo>
      <Campo id="cod_obligaciones" etiqueta="Cuota de obligaciones financieras" className="sm:col-span-2">
        <input
          id="cod_obligaciones"
          type="number"
          min={0}
          step={50000}
          className="input-field"
          value={c.obligaciones_financieras}
          onChange={(e) => set({ obligaciones_financieras: e.target.value === "" ? "" : Number(e.target.value) })}
        />
      </Campo>
      <p className="text-xs text-ink-500 sm:col-span-2">
        Al continuar, el codeudor recibirá un enlace para completar sus documentos y firmar su propia autorización de
        consulta en centrales de riesgo.
      </p>
    </div>
  );
}

export function PasoResultado({ estado, actualizar }: PropsPaso) {
  const [consultando, setConsultando] = useState(false);
  const [mostrarFormCodeudor, setMostrarFormCodeudor] = useState(estado.ruta === "con_codeudor");
  const resultado = estado.resultado;

  /* Primera ejecución: se dispara sola apenas el pago queda confirmado. */
  useEffect(() => {
    if (resultado || estado.pago.estado !== "pagado") return;
    setConsultando(true);
    const temporizador = window.setTimeout(() => {
      actualizar({ resultado: evaluar(construirEntradaMotor(estado)) });
      setConsultando(false);
    }, 1200);
    return () => window.clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado, estado.pago.estado]);

  function reevaluar(ruta: "con_codeudor" | "sin_codeudor") {
    const siguiente = { ...estado, ruta };
    actualizar({ ruta, resultado: evaluar(construirEntradaMotor(siguiente)) });
  }

  if (consultando || !resultado) {
    return (
      <div className="py-14 text-center">
        <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-2 border-clay-500 border-t-transparent" />
        <p className="text-sm font-semibold text-ink-800">Consultando central de riesgo…</p>
        <p className="mt-1 text-sm text-ink-500">Estamos calculando tu relación canon/ingreso y tu capacidad de pago.</p>
      </div>
    );
  }

  const { indicadores: ind } = resultado;

  return (
    <div className="space-y-6">
      {/* Veredicto */}
      <div className={`rounded-xl2 p-6 ring-1 ${ESTILOS_VEREDICTO[resultado.veredicto]}`}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Resultado de tu estudio</p>
        <p className="mt-1 text-3xl font-semibold">{ETIQUETAS_VEREDICTO[resultado.veredicto]}</p>
        <p className="mt-2 text-sm">{resultado.motivo}</p>
        {estado.ruta !== "sin_definir" && (
          <p className="mt-3 text-xs font-medium uppercase tracking-wide opacity-70">
            Ruta evaluada: {estado.ruta === "con_codeudor" ? "con codeudor" : "sin codeudor"}
          </p>
        )}
      </div>

      {/* Condiciones */}
      {resultado.condiciones.length > 0 && (
        <div className="rounded-xl2 border border-sky-200 bg-sky-50 p-5">
          <p className="text-sm font-semibold text-sky-900">Condiciones para firmar</p>
          <ul className="mt-2 space-y-1.5 text-sm text-sky-800">
            {resultado.condiciones.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl2 bg-white p-5 shadow-card ring-1 ring-ink-900/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Canon / ingreso</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">{(ind.rci * 100).toFixed(1)}%</p>
          <p className="mt-1 text-xs text-ink-500">
            Máximo recomendado {(resultado.parametros.rci_maximo_verde * 100).toFixed(0)}%
          </p>
        </div>
        <div className="rounded-xl2 bg-white p-5 shadow-card ring-1 ring-ink-900/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Capacidad disponible</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">{formatoMoneda(Math.max(0, ind.capacidad_disponible))}</p>
          <p className="mt-1 text-xs text-ink-500">Después de gastos y obligaciones</p>
        </div>
        <div className="rounded-xl2 bg-white p-5 shadow-card ring-1 ring-ink-900/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Banda de puntaje</p>
          <p className="mt-1 text-2xl font-semibold capitalize text-ink-900">{ind.banda_puntaje}</p>
          <p className="mt-1 text-xs text-ink-500">Central de riesgo</p>
        </div>
      </div>

      {/* Ruta de refuerzo (sección 3.3, punto 4) */}
      {resultado.ofrece_ruta_codeudor && (
        <div className="rounded-xl2 border border-ink-200 bg-white p-6">
          <p className="text-sm font-semibold text-ink-900">¿Cómo quieres continuar?</p>
          <p className="mt-1 text-sm text-ink-500">
            Puedes reforzar la solicitud con un codeudor o seguir solo, cumpliendo un puntaje más exigente y
            condiciones adicionales.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMostrarFormCodeudor(true);
                actualizar({ ruta: "con_codeudor" });
              }}
              className={`rounded-xl border p-4 text-left transition ${
                estado.ruta === "con_codeudor" ? "border-ink-800 bg-ink-50" : "border-ink-200 hover:border-ink-400"
              }`}
            >
              <span className="block text-sm font-semibold text-ink-900">Agregar un codeudor</span>
              <span className="mt-1 block text-xs text-ink-500">
                Sumamos sus ingresos a los tuyos y volvemos a evaluar. Es la ruta con mayor probabilidad de aprobación.
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMostrarFormCodeudor(false);
                reevaluar("sin_codeudor");
              }}
              className={`rounded-xl border p-4 text-left transition ${
                estado.ruta === "sin_codeudor" ? "border-ink-800 bg-ink-50" : "border-ink-200 hover:border-ink-400"
              }`}
            >
              <span className="block text-sm font-semibold text-ink-900">Continuar sin codeudor</span>
              <span className="mt-1 block text-xs text-ink-500">
                Exige un puntaje mínimo de {resultado.parametros.puntaje_minimo_sin_codeudor} y puede requerir depósito
                o póliza.
              </span>
            </button>
          </div>

          {mostrarFormCodeudor && (
            <div className="mt-5 border-t border-ink-100 pt-5">
              <p className="text-sm font-semibold text-ink-900">Datos del codeudor</p>
              <FormularioCodeudor estado={estado} actualizar={actualizar} />
              <button
                type="button"
                onClick={() => reevaluar("con_codeudor")}
                disabled={!estado.codeudor.ingresos_mensuales || !estado.codeudor.numero_documento}
                className="btn-primary mt-4"
              >
                Volver a evaluar con el codeudor
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sugerencias */}
      {resultado.sugerencias.length > 0 && (
        <div className="rounded-xl2 bg-sand-100 p-5">
          <p className="text-sm font-semibold text-ink-900">Qué puedes mejorar</p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-600">
            {resultado.sugerencias.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Traza auditable */}
      <details className="rounded-xl2 border border-ink-100 bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold text-ink-900">
          Cómo llegamos a este resultado
        </summary>
        <ol className="mt-4 space-y-3">
          {resultado.traza.map((nodo, i) => (
            <li key={`${nodo.paso}-${i}`} className="flex gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PUNTOS_TRAZA[nodo.resultado].tono}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">
                  <span className="mr-1.5 text-ink-400">{nodo.paso}.</span>
                  {nodo.titulo}
                </p>
                <p className="text-sm text-ink-500">{nodo.detalle}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-400">
          Evaluado el {new Date(resultado.evaluado_en).toLocaleString("es-CO")} · guardamos este detalle para poder
          explicarte la decisión si la reclamas.
        </p>
      </details>

      {/* Siguientes pasos */}
      <div className="flex flex-wrap gap-3">
        {(resultado.veredicto === "aprobado" || resultado.veredicto === "aprobado_con_condiciones") && (
          <Link href="/portal/estado" className="btn-primary">
            Ir a la firma del contrato
          </Link>
        )}
        <Link href="/portal/estado" className="btn-secondary">
          Ver el estado de mi solicitud
        </Link>
        <Link href="/arriendo/apartamento/bogota" className="btn-secondary">
          Seguir viendo inmuebles
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
        <Badge tono="neutro">Solicitud {estado.codigo}</Badge>
        <span>Guarda este código: con él puedes retomar o consultar tu estudio.</span>
      </div>
    </div>
  );
}
