import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const esUltimo = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="text-ink-300" aria-hidden="true">
                  ›
                </span>
              )}
              {esUltimo || !item.href ? (
                <span className="font-semibold text-ink-900" aria-current={esUltimo ? "page" : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="text-ink-500 transition hover:text-ink-900">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
