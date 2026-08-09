const ESTILOS: Record<string, { bg: string; dot: string; texto: string }> = {
  verde: { bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500", texto: "text-emerald-800" },
  amarillo: { bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500", texto: "text-amber-800" },
  rojo: { bg: "bg-rose-50 border-rose-200", dot: "bg-rose-500", texto: "text-rose-800" },
};

export function Semaforo({ estado, mensaje }: { estado: "verde" | "amarillo" | "rojo"; mensaje: string }) {
  const estilo = ESTILOS[estado];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${estilo.bg}`}>
      <span className={`mt-1.5 h-3 w-3 flex-shrink-0 rounded-full ${estilo.dot}`} />
      <p className={`text-sm font-medium ${estilo.texto}`}>{mensaje}</p>
    </div>
  );
}
