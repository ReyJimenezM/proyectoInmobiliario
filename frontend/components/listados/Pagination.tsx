import Link from "next/link";

export function Pagination({
  pathname,
  searchParams,
  paginaActual,
  totalPaginas,
}: {
  pathname: string;
  searchParams: Record<string, string | undefined>;
  paginaActual: number;
  totalPaginas: number;
}) {
  if (totalPaginas <= 1) return null;

  function construirHref(pagina: number): string {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([clave, valor]) => {
      if (valor) params.set(clave, valor);
    });
    params.set("pagina", String(pagina));
    return `${pathname}?${params.toString()}`;
  }

  const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 1
  );

  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Paginación de resultados">
      {paginas.map((pagina, idx) => (
        <span key={pagina} className="flex items-center gap-2">
          {idx > 0 && paginas[idx - 1] !== pagina - 1 && <span className="text-ink-300">…</span>}
          <Link
            href={construirHref(pagina)}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition ${
              pagina === paginaActual ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100"
            }`}
          >
            {pagina}
          </Link>
        </span>
      ))}
    </nav>
  );
}
