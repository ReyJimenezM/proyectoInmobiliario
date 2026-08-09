"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CIUDADES = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena"];
const TIPOS: { value: string; label: string }[] = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "apartaestudio", label: "Apartaestudio" },
  { value: "oficina", label: "Oficina" },
  { value: "local", label: "Local" },
  { value: "lote", label: "Lote" },
  { value: "bodega", label: "Bodega" },
];

function normalizarCiudad(ciudad: string): string {
  return ciudad
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-");
}

export function SearchHero() {
  const router = useRouter();
  const [operacion, setOperacion] = useState<"venta" | "arriendo">("venta");
  const [tipo, setTipo] = useState("apartamento");
  const [ciudad, setCiudad] = useState(CIUDADES[0]);

  function buscar() {
    router.push(`/${operacion}/${tipo}/${normalizarCiudad(ciudad)}`);
  }

  return (
    <div className="card mx-auto w-full max-w-3xl p-3 sm:p-4">
      <div className="mb-3 flex gap-2">
        {(["venta", "arriendo"] as const).map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => setOperacion(op)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              operacion === op ? "bg-ink-900 text-white" : "bg-ink-50 text-ink-600 hover:bg-ink-100"
            }`}
          >
            {op === "venta" ? "Comprar" : "Arrendar"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_1fr_auto]">
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input-field">
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="input-field">
          {CIUDADES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button type="button" onClick={buscar} className="btn-primary">
          Buscar
        </button>
      </div>
    </div>
  );
}
