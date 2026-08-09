import Link from "next/link";
import { AuthStatus } from "./AuthStatus";

const ENLACES_MENU = [
  { href: "/venta/apartamento/bogota", label: "Comprar" },
  { href: "/arriendo/apartamento/bogota", label: "Arrendar" },
  { href: "/proyectos", label: "Proyectos" },
  { href: "/simulador", label: "Simulador" },
  { href: "/blog", label: "Blog" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-sand-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-2xl font-semibold text-ink-900">
          Raíz<span className="text-clay-500">.</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {ENLACES_MENU.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className="text-sm font-medium text-ink-600 transition hover:text-ink-900"
            >
              {enlace.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/publicar" className="hidden text-sm font-semibold text-ink-700 hover:text-ink-900 sm:block">
            Publica tu propiedad
          </Link>
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
