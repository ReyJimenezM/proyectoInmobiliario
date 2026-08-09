"use client";

export function SlaBadge({ createdAt, slaHours }: { createdAt: string; slaHours: number }) {
  const creado = new Date(createdAt).getTime();
  const ahora = Date.now();
  const horasTranscurridas = Math.max(0, (ahora - creado) / (1000 * 60 * 60));
  const porcentaje = slaHours > 0 ? Math.min(999, Math.round((horasTranscurridas / slaHours) * 100)) : 0;

  const estilos =
    porcentaje < 60
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : porcentaje <= 90
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-rose-50 text-rose-700 ring-rose-200";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${estilos}`}>
      {porcentaje}% SLA
    </span>
  );
}
