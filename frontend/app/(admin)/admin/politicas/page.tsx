"use client";

import { useEffect, useState } from "react";
import { crearVersionPolitica, listarPoliticas } from "@/lib/api";
import type { PoliticaCredito, VariablePolitica } from "@/lib/types";

function EditorNuevaVersion({
  politicaBase,
  onCreada,
}: {
  politicaBase: PoliticaCredito;
  onCreada: () => void;
}) {
  const [variables, setVariables] = useState<VariablePolitica[]>(
    JSON.parse(JSON.stringify(politicaBase.variables))
  );
  const [motivoCambio, setMotivoCambio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const sumaPesos = variables.reduce((acc, v) => acc + v.peso, 0);

  function actualizarPeso(idx: number, peso: number) {
    const copia = [...variables];
    copia[idx] = { ...copia[idx], peso };
    setVariables(copia);
  }

  function actualizarPuntajeBanda(idxVariable: number, idxBanda: number, puntaje: number) {
    const copia = [...variables];
    const bandas = [...copia[idxVariable].bandas];
    bandas[idxBanda] = { ...bandas[idxBanda], puntaje };
    copia[idxVariable] = { ...copia[idxVariable], bandas };
    setVariables(copia);
  }

  async function guardar() {
    if (Math.abs(sumaPesos - 1) > 0.001) {
      setError(`Los pesos deben sumar 1.0 (suman ${sumaPesos.toFixed(2)})`);
      return;
    }
    if (motivoCambio.trim().length < 10) {
      setError("Describe el motivo del cambio (mínimo 10 caracteres) — queda en el historial versionado.");
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await crearVersionPolitica({
        vertical: politicaBase.vertical,
        variables,
        bandas_decision: politicaBase.bandas_decision,
        motivo_cambio: motivoCambio,
      });
      onCreada();
    } catch {
      setError("No pudimos guardar la nueva versión.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="card mt-4 space-y-5 p-5">
      <h3 className="font-semibold text-ink-900">Nueva versión — {politicaBase.vertical}</h3>

      {variables.map((variable, idxVariable) => (
        <div key={variable.nombre} className="rounded-lg border border-ink-100 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold capitalize text-ink-800">{variable.nombre}</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-ink-400">Peso</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={variable.peso}
                onChange={(e) => actualizarPeso(idxVariable, Number(e.target.value))}
                className="input-field w-24"
              />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            {variable.bandas.map((banda, idxBanda) => (
              <div key={banda.etiqueta} className="flex items-center justify-between text-xs text-ink-500">
                <span>Banda {banda.etiqueta}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={banda.puntaje}
                  onChange={(e) => actualizarPuntajeBanda(idxVariable, idxBanda, Number(e.target.value))}
                  className="input-field w-20"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className={`text-sm font-semibold ${Math.abs(sumaPesos - 1) > 0.001 ? "text-rose-600" : "text-emerald-600"}`}>
        Suma de pesos: {sumaPesos.toFixed(2)}
      </p>

      <div>
        <label className="label-field">Motivo del cambio</label>
        <textarea
          value={motivoCambio}
          onChange={(e) => setMotivoCambio(e.target.value)}
          className="input-field min-h-20"
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button type="button" onClick={guardar} disabled={guardando} className="btn-primary w-full">
        {guardando ? "Guardando..." : "Publicar nueva versión"}
      </button>
    </div>
  );
}

export default function PoliticasPage() {
  const [politicas, setPoliticas] = useState<PoliticaCredito[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    listarPoliticas()
      .then(setPoliticas)
      .catch(() => setError("No pudimos cargar las políticas de crédito."));
  }

  useEffect(cargar, []);

  if (error) return <p className="text-rose-600">{error}</p>;

  const activasPorVertical = politicas.filter((p) => p.activa);
  const historial = politicas.filter((p) => !p.activa);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-ink-900">Políticas de crédito</h1>

      {activasPorVertical.map((politica) => (
        <div key={politica.id}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize text-ink-900">
              {politica.vertical} — versión {politica.version} (activa)
            </h2>
            <button
              type="button"
              onClick={() => setEditando(editando === politica.id ? null : politica.id)}
              className="btn-secondary"
            >
              {editando === politica.id ? "Cancelar" : "Nueva versión de política"}
            </button>
          </div>

          <div className="card mt-3 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-2">Variable</th>
                  <th className="px-4 py-2">Peso</th>
                  <th className="px-4 py-2">Bandas</th>
                </tr>
              </thead>
              <tbody>
                {politica.variables.map((v) => (
                  <tr key={v.nombre} className="border-t border-ink-100">
                    <td className="px-4 py-2 capitalize">{v.nombre}</td>
                    <td className="px-4 py-2">{Math.round(v.peso * 100)}%</td>
                    <td className="px-4 py-2 text-ink-500">
                      {v.bandas.map((b) => `${b.etiqueta}: ${b.puntaje}`).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editando === politica.id && (
            <EditorNuevaVersion
              politicaBase={politica}
              onCreada={() => {
                setEditando(null);
                cargar();
              }}
            />
          )}
        </div>
      ))}

      {historial.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-400">
            Historial de versiones anteriores
          </h2>
          <ul className="space-y-1 text-sm text-ink-500">
            {historial.map((p) => (
              <li key={p.id}>
                {p.vertical} v{p.version} — {p.motivo_cambio ?? "sin motivo registrado"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
