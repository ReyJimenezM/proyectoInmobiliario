"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function FilterSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [precioMin, setPrecioMin] = useState(searchParams.get("precio_min") ?? "");
  const [precioMax, setPrecioMax] = useState(searchParams.get("precio_max") ?? "");
  const [areaMin, setAreaMin] = useState(searchParams.get("area_min") ?? "");
  const [habitacionesMin, setHabitacionesMin] = useState(searchParams.get("habitaciones_min") ?? "");
  const [banosMin, setBanosMin] = useState(searchParams.get("banos_min") ?? "");

  function aplicarFiltros() {
    const params = new URLSearchParams(searchParams.toString());
    const asignar = (clave: string, valor: string) => {
      if (valor) params.set(clave, valor);
      else params.delete(clave);
    };
    asignar("precio_min", precioMin);
    asignar("precio_max", precioMax);
    asignar("area_min", areaMin);
    asignar("habitaciones_min", habitacionesMin);
    asignar("banos_min", banosMin);
    params.set("pagina", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <aside className="card h-fit space-y-6 p-5">
      <h2 className="font-display text-lg font-semibold text-ink-900">Filtros</h2>

      <div>
        <label className="label-field">Precio (COP)</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Mínimo"
            value={precioMin}
            onChange={(e) => setPrecioMin(e.target.value)}
            className="input-field"
          />
          <input
            type="number"
            placeholder="Máximo"
            value={precioMax}
            onChange={(e) => setPrecioMax(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label-field">Área mínima (m²)</label>
        <input
          type="number"
          value={areaMin}
          onChange={(e) => setAreaMin(e.target.value)}
          className="input-field"
        />
      </div>

      <div>
        <label className="label-field">Habitaciones (mín.)</label>
        <select
          value={habitacionesMin}
          onChange={(e) => setHabitacionesMin(e.target.value)}
          className="input-field"
        >
          <option value="">Cualquiera</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label-field">Baños (mín.)</label>
        <select value={banosMin} onChange={(e) => setBanosMin(e.target.value)} className="input-field">
          <option value="">Cualquiera</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </select>
      </div>

      <button type="button" onClick={aplicarFiltros} className="btn-primary w-full">
        Aplicar filtros
      </button>
    </aside>
  );
}
