import type { ReactNode } from "react";

export function StatCard({
  etiqueta,
  valor,
  detalle,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: ReactNode;
  detalle?: string;
  tono?: "neutro" | "exito" | "alerta" | "error";
}) {
  const colorValor =
    tono === "exito"
      ? "text-emerald-700"
      : tono === "alerta"
        ? "text-amber-700"
        : tono === "error"
          ? "text-rose-700"
          : "text-ink-900";

  return (
    <div className="rounded-xl2 bg-white p-5 shadow-card ring-1 ring-ink-900/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{etiqueta}</p>
      <p className={`mt-2 text-2xl font-semibold ${colorValor}`}>{valor}</p>
      {detalle && <p className="mt-1 text-xs text-ink-500">{detalle}</p>}
    </div>
  );
}
