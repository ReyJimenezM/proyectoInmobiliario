"use client";

import { useEffect, useState } from "react";
import { crearVersionMotor, listarVersionesMotor } from "@/lib/api";
import type { MotorDecisionConfig, ReglaMotor } from "@/lib/types";

const ETIQUETAS_GRUPO: Record<string, string> = {
  capacidad: "Capacidad de pago", estabilidad: "Estabilidad", endeudamiento: "Endeudamiento",
  verificabilidad: "Verificabilidad", historial: "Historial", fraude: "Antifraude",
};
const ETIQUETAS_PARAMETRO: Record<string, string> = {
  factor_variable: "Factor de reconocimiento de ingresos variables",
  factor_otros: "Factor de reconocimiento de otros ingresos",
  cobertura_minima: "Cobertura mínima (sin codeudor)",
  umbral_preaprobado: "Umbral de preaprobación",
  umbral_requisitos: "Umbral de requisitos",
  umbral_estudio: "Umbral de estudio manual",
  fraude_rechazo: "Umbral de rechazo por fraude",
  fraude_revision: "Umbral de revisión por fraude",
  verificabilidad_minima: "Verificabilidad mínima",
};

function agruparReglas(reglas: ReglaMotor[]): Record<string, ReglaMotor[]> {
  const grupos: Record<string, ReglaMotor[]> = {};
  for (const regla of reglas) {
    (grupos[regla.grupo] ??= []).push(regla);
  }
  return grupos;
}

function EditorNuevaVersion({ base, onCreada }: { base: MotorDecisionConfig; onCreada: () => void }) {
  const [version, setVersion] = useState("");
  const [pesos, setPesos] = useState<Record<string, number>>({ ...base.pesos });
  const [parametros, setParametros] = useState<Record<string, number>>({ ...base.parametros });
  const [reglas, setReglas] = useState<ReglaMotor[]>(JSON.parse(JSON.stringify(base.reglas)));
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const sumaPesos = Object.values(pesos).reduce((a, b) => a + b, 0);

  function toggleRegla(id: string) {
    setReglas((prev) => prev.map((r) => (r.id === id ? { ...r, activa: !r.activa } : r)));
  }

  async function guardar() {
    if (Math.round(sumaPesos) !== 100) {
      setError(`Los pesos de los grupos deben sumar 100 (suman ${sumaPesos})`);
      return;
    }
    if (!version.trim() || notas.trim().length < 10) {
      setError("Indica la versión y un motivo de al menos 10 caracteres.");
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await crearVersionMotor({ version, pesos, parametros, reglas, notas });
      onCreada();
    } catch {
      setError("No pudimos publicar la nueva versión.");
    } finally {
      setGuardando(false);
    }
  }

  const grupos = agruparReglas(reglas);

  return (
    <div className="card mt-4 space-y-6 p-5">
      <h2 className="font-semibold text-ink-900">Nueva versión del motor</h2>

      <div>
        <label className="label-field">Código de versión (ej. v3.5)</label>
        <input value={version} onChange={(e) => setVersion(e.target.value)} className="input-field w-40" />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-400">Pesos por grupo</h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {Object.keys(pesos).map((grupo) => (
            <div key={grupo}>
              <label className="text-xs text-ink-500">{ETIQUETAS_GRUPO[grupo] ?? grupo}</label>
              <input
                type="number"
                value={pesos[grupo]}
                onChange={(e) => setPesos({ ...pesos, [grupo]: Number(e.target.value) })}
                className="input-field"
              />
            </div>
          ))}
        </div>
        <p className={`mt-1 text-xs font-semibold ${Math.round(sumaPesos) !== 100 ? "text-rose-600" : "text-emerald-600"}`}>
          Suma: {sumaPesos}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-400">Parámetros</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.keys(parametros).map((clave) => (
            <div key={clave}>
              <label className="text-xs text-ink-500">{ETIQUETAS_PARAMETRO[clave] ?? clave}</label>
              <input
                type="number"
                step="0.01"
                value={parametros[clave]}
                onChange={(e) => setParametros({ ...parametros, [clave]: Number(e.target.value) })}
                className="input-field"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-400">
          Reglas (desactiva las que no quieras aplicar)
        </h3>
        <div className="space-y-4">
          {Object.entries(grupos).map(([grupo, reglasGrupo]) => (
            <div key={grupo}>
              <p className="text-xs font-semibold capitalize text-ink-600">{ETIQUETAS_GRUPO[grupo] ?? grupo}</p>
              <div className="mt-1 divide-y divide-ink-100 rounded-lg border border-ink-100">
                {reglasGrupo.map((r) => (
                  <label key={r.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                    <span className={r.activa ? "text-ink-700" : "text-ink-300 line-through"}>
                      {r.nombre} ({r.tipo === "escala" ? r.puntos : (r.puntos > 0 ? "+" : "") + r.puntos} pts)
                    </span>
                    <input type="checkbox" checked={r.activa} onChange={() => toggleRegla(r.id)} className="h-4 w-4 rounded border-ink-300" />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="label-field">Motivo del cambio</label>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="input-field min-h-20" />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button type="button" onClick={guardar} disabled={guardando} className="btn-primary w-full">
        {guardando ? "Publicando..." : "Publicar nueva versión"}
      </button>
    </div>
  );
}

export default function MotorPage() {
  const [versiones, setVersiones] = useState<MotorDecisionConfig[]>([]);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    listarVersionesMotor()
      .then(setVersiones)
      .catch(() => setError("No pudimos cargar el motor de decisión."));
  }

  useEffect(cargar, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (versiones.length === 0) return <p className="text-ink-500">Cargando motor de decisión...</p>;

  const activa = versiones.find((v) => v.activa) ?? versiones[0];
  const historial = versiones.filter((v) => v.id !== activa.id);
  const grupos = agruparReglas(activa.reglas);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Motor de decisión</h1>
          <p className="mt-1 text-sm text-ink-500">
            Versión activa: <strong>{activa.version}</strong> · {activa.reglas.length} reglas · autor {activa.autor}
          </p>
        </div>
        <button type="button" onClick={() => setEditando((v) => !v)} className="btn-secondary">
          {editando ? "Cancelar" : "Nueva versión"}
        </button>
      </div>

      {editando && <EditorNuevaVersion base={activa} onCreada={() => { setEditando(false); cargar(); }} />}

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {Object.entries(activa.pesos).map(([grupo, peso]) => (
          <div key={grupo} className="card p-3 text-center">
            <p className="text-xs uppercase text-ink-400">{ETIQUETAS_GRUPO[grupo] ?? grupo}</p>
            <p className="mt-1 font-display text-xl font-semibold text-ink-900">{peso}%</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {Object.entries(grupos).map(([grupo, reglas]) => (
          <div key={grupo} className="card overflow-hidden">
            <div className="border-b border-ink-100 bg-ink-50 px-4 py-2">
              <h2 className="text-sm font-semibold capitalize text-ink-800">{ETIQUETAS_GRUPO[grupo] ?? grupo}</h2>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {reglas.map((r) => (
                  <tr key={r.id} className={`border-t border-ink-100 ${!r.activa ? "opacity-40" : ""}`}>
                    <td className="px-4 py-2 text-xs text-ink-400">{r.id}</td>
                    <td className="px-4 py-2">{r.nombre}</td>
                    <td className="px-4 py-2 text-xs text-ink-500">{r.descripcion}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right font-semibold">
                      {r.puntos > 0 && r.tipo === "ajuste" ? "+" : ""}
                      {r.puntos} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {historial.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-400">Versiones anteriores</h2>
          <ul className="space-y-1 text-sm text-ink-500">
            {historial.map((v) => (
              <li key={v.id}>
                {v.version} — {v.notas ?? "sin motivo registrado"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
