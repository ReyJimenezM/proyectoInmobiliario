"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/propietario", label: "Resumen" },
  { href: "/propietario/inmuebles", label: "Mis inmuebles" },
  { href: "/propietario/leads", label: "Interesados" },
  { href: "/propietario/candidatos", label: "Candidatos evaluados" },
];

export function NavPropietario() {
  const pathname = usePathname();

  const activo = (href: string) =>
    href === "/propietario" ? pathname === "/propietario" : pathname.startsWith(href);

  return (
    <div className="border-b border-ink-100 bg-white">
      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {ENLACES.map((enlace) => (
          <Link
            key={enlace.href}
            href={enlace.href}
            className={`shrink-0 border-b-2 px-4 py-3.5 text-sm font-medium transition ${
              activo(enlace.href)
                ? "border-clay-500 text-ink-900"
                : "border-transparent text-ink-500 hover:border-ink-200 hover:text-ink-800"
            }`}
          >
            {enlace.label}
          </Link>
        ))}
        <Link
          href="/propietario/inmuebles/nuevo"
          className="ml-auto shrink-0 self-center rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-ink-700"
        >
          Publicar inmueble
        </Link>
      </nav>
    </div>
  );
}
