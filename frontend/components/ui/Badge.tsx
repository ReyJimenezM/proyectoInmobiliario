import type { ReactNode } from "react";

export type TonoBadge = "neutro" | "exito" | "alerta" | "error" | "info" | "violeta";

const TONOS: Record<TonoBadge, string> = {
  neutro: "bg-ink-50 text-ink-600 ring-ink-200",
  exito: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  alerta: "bg-amber-50 text-amber-700 ring-amber-200",
  error: "bg-rose-50 text-rose-700 ring-rose-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  violeta: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({
  children,
  tono = "neutro",
  className = "",
}: {
  children: ReactNode;
  tono?: TonoBadge;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${TONOS[tono]} ${className}`}
    >
      {children}
    </span>
  );
}
