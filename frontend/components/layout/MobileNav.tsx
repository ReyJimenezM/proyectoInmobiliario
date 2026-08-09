"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const ITEMS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/",
    label: "Inicio",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 9.5L10 3.5L17 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 8.5V16.25C5 16.66 5.34 17 5.75 17H14.25C14.66 17 15 16.66 15 16.25V8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/portal/estado",
    label: "Solicitudes",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="4.5" y="2.75" width="11" height="14.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7.25 6.5H12.75M7.25 9.5H12.75M7.25 12.5H10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/venta/apartamento/bogota",
    label: "Propiedades",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 17V8.75L10 4L17 8.75V17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 17V12H12V17" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/simulador",
    label: "Simulador",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="4" y="2.75" width="12" height="14.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6.75 6H13.25M6.75 9.25H8.25M11.75 9.25H13.25M6.75 12.5H8.25M11.75 12.5H13.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/portal",
    label: "Más",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="4.5" cy="10" r="1.35" fill="currentColor" />
        <circle cx="10" cy="10" r="1.35" fill="currentColor" />
        <circle cx="15.5" cy="10" r="1.35" fill="currentColor" />
      </svg>
    ),
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100/70 bg-white/80 backdrop-blur-lg [@media(min-width:820px)]:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {ITEMS.map((item) => {
          const activo = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                activo ? "text-clay-600" : "text-ink-400 hover:text-ink-700"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
