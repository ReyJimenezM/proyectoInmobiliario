import type { ReactNode } from "react";

export function PageHeader({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-3xl text-sm text-ink-500">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}
