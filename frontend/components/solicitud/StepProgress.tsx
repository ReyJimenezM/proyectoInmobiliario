const PASOS = [
  "Datos personales",
  "Información laboral",
  "Información financiera",
  "Garantías y referencias",
  "Documentos",
  "Revisión y envío",
];

export function StepProgress({ pasoActual }: { pasoActual: number }) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between text-xs font-medium text-ink-500">
        <span>
          Paso {pasoActual} de {PASOS.length}
        </span>
        <span>{PASOS[pasoActual - 1]}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-clay-500 transition-all"
          style={{ width: `${(pasoActual / PASOS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

export const NOMBRES_PASOS = PASOS;
