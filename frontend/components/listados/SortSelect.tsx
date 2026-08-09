"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPCIONES = [
  { value: "relevancia", label: "Relevancia" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
  { value: "recientes", label: "Más recientes" },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ordenActual = searchParams.get("orden") ?? "relevancia";

  function cambiarOrden(valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("orden", valor);
    params.set("pagina", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={ordenActual}
      onChange={(e) => cambiarOrden(e.target.value)}
      className="input-field w-auto"
    >
      {OPCIONES.map((op) => (
        <option key={op.value} value={op.value}>
          {op.label}
        </option>
      ))}
    </select>
  );
}
