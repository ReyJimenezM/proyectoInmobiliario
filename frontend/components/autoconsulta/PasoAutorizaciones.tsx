"use client";

import type { Autorizaciones } from "@/lib/autoconsulta";
import type { PropsPaso } from "./tipos";

interface DefinicionAutorizacion {
  clave: keyof Autorizaciones;
  titulo: string;
  resumen: string;
  referencia: string;
  texto: string;
}

/**
 * La autorización de consulta a centrales va separada de la general a propósito: la Ley 1266 de
 * 2008 exige consentimiento expreso y específico, no implícito en los términos generales.
 * Los textos son un borrador de trabajo y deben pasar por revisión legal antes de salir a producción.
 */
const AUTORIZACIONES: DefinicionAutorizacion[] = [
  {
    clave: "habeas_data_general",
    titulo: "Autorizo el tratamiento de mis datos personales",
    resumen: "Para estudiar la solicitud, contactarme y administrar la relación contractual.",
    referencia: "Ley 1581 de 2012 · Decreto 1377 de 2013",
    texto:
      "Autorizo de manera previa, expresa e informada a la arrendadora para recolectar, almacenar, usar, circular y suprimir mis datos personales con la finalidad de evaluar mi solicitud de arrendamiento, verificar la información suministrada, contactarme por cualquier canal y administrar la eventual relación contractual. Conozco que puedo conocer, actualizar, rectificar y suprimir mis datos, y revocar esta autorización, escribiendo al correo de contacto de la política de privacidad.",
  },
  {
    clave: "consulta_centrales",
    titulo: "Autorizo la consulta y reporte en centrales de riesgo",
    resumen: "Es la consulta que permite conocer mi puntaje y mis reportes vigentes.",
    referencia: "Ley 1266 de 2008 (Habeas Data financiero)",
    texto:
      "Autorizo de manera expresa, específica e irrevocable durante la vigencia de esta solicitud a consultar, reportar, procesar y divulgar ante operadores de información financiera, crediticia y comercial (Datacrédito, TransUnion u otros) toda la información referida a mi comportamiento crediticio y de pago. Entiendo que esta consulta se ejecuta siempre, con o sin codeudor, y que queda registrada en mi historial como consulta autorizada.",
  },
  {
    clave: "terminos_condiciones",
    titulo: "Acepto los términos y condiciones de la plataforma",
    resumen: "Reglas de uso del servicio y del cobro por el estudio.",
    referencia: "Términos de servicio",
    texto:
      "Declaro que la información que suministro es veraz y verificable, que el pago del estudio corresponde al servicio de evaluación y no garantiza la aprobación, y que la decisión final se toma con base en la política de riesgo vigente al momento de la solicitud.",
  },
  {
    clave: "politica_arrendamiento",
    titulo: "Acepto la política de arrendamiento",
    resumen: "Criterios de evaluación, garantías y causales de rechazo.",
    referencia: "Ley 820 de 2003 · Política interna",
    texto:
      "Conozco que la evaluación considera la relación entre el canon y mis ingresos, mi capacidad de pago disponible, mi historial en centrales de riesgo y mis referencias, y que el resultado puede exigir codeudor, depósito de garantía o póliza de arrendamiento según la política vigente.",
  },
];

export function PasoAutorizaciones({ estado, actualizar, errores }: PropsPaso) {
  const a = estado.autorizaciones;
  const set = (clave: keyof Autorizaciones, valor: boolean) =>
    actualizar({ autorizaciones: { ...a, [clave]: valor } });

  const todas = AUTORIZACIONES.every((def) => a[def.clave]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500">
        Sin estas autorizaciones no podemos ejecutar el estudio. Cada una es independiente y puedes leer el texto
        completo antes de marcarla.
      </p>

      <button
        type="button"
        onClick={() => {
          const valor = !todas;
          actualizar({
            autorizaciones: {
              habeas_data_general: valor,
              consulta_centrales: valor,
              terminos_condiciones: valor,
              politica_arrendamiento: valor,
            },
          });
        }}
        className="text-sm font-semibold text-clay-600 hover:text-clay-700"
      >
        {todas ? "Desmarcar todas" : "Marcar todas"}
      </button>

      {AUTORIZACIONES.map((def) => {
        const marcada = a[def.clave];
        const error = errores[def.clave];
        return (
          <div
            key={def.clave}
            className={`rounded-xl2 border p-5 transition ${
              error ? "border-rose-300 bg-rose-50/40" : marcada ? "border-emerald-200 bg-emerald-50/40" : "border-ink-100 bg-white"
            }`}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 rounded border-ink-300 text-clay-600 focus:ring-clay-500"
                checked={marcada}
                onChange={(e) => set(def.clave, e.target.checked)}
                aria-describedby={`${def.clave}-resumen`}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink-900">{def.titulo}</span>
                <span id={`${def.clave}-resumen`} className="mt-0.5 block text-sm text-ink-500">
                  {def.resumen}
                </span>
                <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-ink-400">
                  {def.referencia}
                </span>
              </span>
            </label>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-ink-600 hover:text-ink-900">
                Leer el texto completo
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-ink-600">{def.texto}</p>
            </details>

            {error && (
              <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
