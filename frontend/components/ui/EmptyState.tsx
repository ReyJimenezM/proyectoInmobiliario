import type { ReactNode } from "react";

export function EmptyState({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="rounded-xl2 border border-dashed border-ink-200 bg-white/60 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink-800">{titulo}</p>
      {descripcion && <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-500">{descripcion}</p>}
      {accion && <div className="mt-5 flex justify-center">{accion}</div>}
    </div>
  );
}
