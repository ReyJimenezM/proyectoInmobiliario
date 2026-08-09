"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import { obtenerInmobiliariaPublica } from "@/lib/api";
import { estaAutenticado, obtenerUsuarioSesion, type UsuarioSesion } from "@/lib/auth";
import type { Inmobiliaria } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Icon components (inline SVG, stroke-based, 20x20)                 */
/* ------------------------------------------------------------------ */

function IconGrid() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
    </svg>
  );
}

function IconInbox() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h4l1.5 2h3L13 10h4" />
      <path d="M4.5 5.5l-1.5 4.5v5a1 1 0 001 1h12a1 1 0 001-1v-5l-1.5-4.5a1 1 0 00-.95-.5H5.45a1 1 0 00-.95.5z" />
    </svg>
  );
}

function IconCpu() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="10" height="10" rx="1" />
      <rect x="7.5" y="7.5" width="5" height="5" rx="0.5" />
      <line x1="10" y1="2" x2="10" y2="5" />
      <line x1="10" y1="15" x2="10" y2="18" />
      <line x1="2" y1="10" x2="5" y2="10" />
      <line x1="15" y1="10" x2="18" y2="10" />
    </svg>
  );
}

function IconScales() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="3" x2="10" y2="17" />
      <line x1="4" y1="6" x2="16" y2="6" />
      <path d="M4 6l-1.5 5h5L6 6" />
      <path d="M16 6l-1.5 5h5L18 6" />
      <line x1="7" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="12" height="14" rx="1" />
      <line x1="7" y1="7" x2="9" y2="7" />
      <line x1="11" y1="7" x2="13" y2="7" />
      <line x1="7" y1="10" x2="9" y2="10" />
      <line x1="11" y1="10" x2="13" y2="10" />
      <rect x="8" y="13" width="4" height="4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="2.5" />
      <path d="M2.5 16.5v-1a4 4 0 014-4h1a4 4 0 014 4v1" />
      <circle cx="14" cy="6" r="2" />
      <path d="M14 11.5a4 4 0 013.5 4v1" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="7" r="3" />
      <path d="M4 17v-1a5 5 0 0110 0v1" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <polyline points="10 6 10 10 13 12" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2.5l6 2.5v4c0 4-2.5 6.5-6 8.5-3.5-2-6-4.5-6-8.5V5z" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17V3" />
      <path d="M3 17h14" />
      <rect x="6" y="10" width="2.5" height="7" />
      <rect x="10.5" y="6" width="2.5" height="11" />
      <rect x="15" y="12" width="2.5" height="5" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="5" x2="17" y2="5" />
      <line x1="7" y1="10" x2="17" y2="10" />
      <line x1="7" y1="15" x2="17" y2="15" />
      <circle cx="3.5" cy="5" r="1" />
      <circle cx="3.5" cy="10" r="1" />
      <circle cx="3.5" cy="15" r="1" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M16.2 12.2a1.2 1.2 0 00.24 1.32l.04.04a1.44 1.44 0 11-2.04 2.04l-.04-.04a1.2 1.2 0 00-1.32-.24 1.2 1.2 0 00-.72 1.08v.12a1.44 1.44 0 11-2.88 0v-.06a1.2 1.2 0 00-.78-1.08 1.2 1.2 0 00-1.32.24l-.04.04a1.44 1.44 0 11-2.04-2.04l.04-.04a1.2 1.2 0 00.24-1.32 1.2 1.2 0 00-1.08-.72H4.44a1.44 1.44 0 110-2.88h.06a1.2 1.2 0 001.08-.78 1.2 1.2 0 00-.24-1.32l-.04-.04a1.44 1.44 0 112.04-2.04l.04.04a1.2 1.2 0 001.32.24h.06a1.2 1.2 0 00.72-1.08V4.44a1.44 1.44 0 112.88 0v.06a1.2 1.2 0 00.72 1.08 1.2 1.2 0 001.32-.24l.04-.04a1.44 1.44 0 112.04 2.04l-.04.04a1.2 1.2 0 00-.24 1.32v.06a1.2 1.2 0 001.08.72h.12a1.44 1.44 0 110 2.88h-.06a1.2 1.2 0 00-1.08.72z" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 7a5 5 0 00-10 0c0 5-2 7-2 7h14s-2-2-2-7" />
      <path d="M8.5 16a1.5 1.5 0 003 0" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3" />
      <polyline points="11 14 15 10 11 6" />
      <line x1="15" y1="10" x2="7" y2="10" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 3 9 7 5 11" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Nav structure                                                      */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  label: string;
  icon: () => ReactNode;
  roles: readonly string[] | null;
}

interface NavSection {
  header: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    header: "Operación",
    items: [
      { href: "/admin", label: "Dashboard", icon: IconGrid, roles: null },
      { href: "/admin/pipeline", label: "Pipeline", icon: IconInbox, roles: null },
      { href: "/admin/propietarios", label: "Propietarios", icon: IconBuilding, roles: null },
      { href: "/admin/reportes", label: "Reportes", icon: IconChart, roles: null },
    ],
  },
  {
    header: "Catálogos",
    items: [
      { href: "/admin/propiedades", label: "Propiedades", icon: IconBuilding, roles: null },
      { href: "/admin/anunciantes", label: "Anunciantes", icon: IconUsers, roles: null },
    ],
  },
  {
    header: "Riesgo",
    items: [
      { href: "/admin/motor", label: "Motor de decisión", icon: IconCpu, roles: null },
      { href: "/admin/politicas", label: "Políticas de crédito (5C)", icon: IconScales, roles: null },
    ],
  },
  {
    header: "Gobierno",
    items: [
      { href: "/admin/usuarios", label: "Usuarios", icon: IconUser, roles: ["admin", "super_admin"] },
      { href: "/admin/auditoria", label: "Auditoría", icon: IconClock, roles: null },
      { href: "/admin/inmobiliarias", label: "Inmobiliarias", icon: IconShield, roles: ["super_admin"] },
      { href: "/admin/configuracion", label: "Configuración de marca", icon: IconGear, roles: ["admin", "super_admin"] },
      { href: "/admin/catalogos", label: "Catálogos", icon: IconList, roles: null },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Breadcrumb helper                                                  */
/* ------------------------------------------------------------------ */

const LABEL_MAP: Record<string, string> = {
  admin: "Inicio",
  pipeline: "Pipeline",
  motor: "Motor de decisión",
  politicas: "Políticas de crédito",
  propiedades: "Propiedades",
  anunciantes: "Anunciantes",
  usuarios: "Usuarios",
  auditoria: "Auditoría",
  inmobiliarias: "Inmobiliarias",
  configuracion: "Configuración",
  propietarios: "Propietarios",
  reportes: "Reportes",
  catalogos: "Catálogos",
};

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const href = "/" + segments.slice(0, i + 1).join("/");
    crumbs.push({ label: LABEL_MAP[seg] ?? seg, href });
  }
  return crumbs;
}

/* ------------------------------------------------------------------ */
/*  Layout component                                                   */
/* ------------------------------------------------------------------ */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [verificado, setVerificado] = useState(false);
  const [marca, setMarca] = useState<Inmobiliaria | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* Auth gate */
  useEffect(() => {
    if (!estaAutenticado()) {
      router.push(`/login?destino=${encodeURIComponent(pathname)}`);
      return;
    }
    const sesion = obtenerUsuarioSesion();
    if (!sesion || sesion.rol === "solicitante") {
      router.push("/");
      return;
    }
    setUsuario(sesion);
    setVerificado(true);
    if (sesion.inmobiliaria_id) {
      obtenerInmobiliariaPublica(sesion.inmobiliaria_id).then(setMarca).catch(() => {});
    }
  }, [pathname, router]);

  /* Close drawer on route change */
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  /* Close drawer on Escape */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cerrarSesion = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
    }
    router.push("/login");
  }, [router]);

  if (!verificado || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#FAF9F7" }}>
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: marca?.color_primario ?? "#78716c", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "#78716c" }}>Verificando acceso...</p>
        </div>
      </div>
    );
  }

  const colorPrimario = marca?.color_primario ?? "#A16207";
  const breadcrumbs = buildBreadcrumbs(pathname);
  const iniciales = usuario.nombre_completo
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");

  /* ---- Sidebar content (shared between fixed sidebar and drawer) ---- */
  const sidebarContent = (
    <div className="flex h-full flex-col" style={{ backgroundColor: "#1F1B18" }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        {marca?.logo_url ? (
          <Image
            src={marca.logo_url}
            alt={marca.nombre_comercial}
            width={36}
            height={36}
            unoptimized
            className="rounded-lg object-contain"
          />
        ) : (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: colorPrimario }}
          >
            {(marca?.nombre_comercial ?? "H")[0]}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" style={{ color: "#F5F0EB" }}>
            {marca?.nombre_comercial ?? "Panel"}
          </p>
          <p className="text-xs" style={{ color: "#8C8279" }}>
            Habitat Risk
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t" style={{ borderColor: "#2E2924" }} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#3D3730 transparent" }}>
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || (item.roles as readonly string[]).includes(usuario.rol)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.header} className="mb-5">
              <p
                className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "#6B6057" }}
              >
                {section.header}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150"
                      style={
                        active
                          ? { backgroundColor: colorPrimario, color: "#FFFFFF" }
                          : { color: "#B0A99F" }
                      }
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = "#2E2924";
                          e.currentTarget.style.color = "#F5F0EB";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#B0A99F";
                        }
                      }}
                    >
                      <span className="shrink-0 opacity-80">{item.icon()}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t" style={{ borderColor: "#2E2924" }} />

      {/* User section */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: colorPrimario }}
          >
            {iniciales}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: "#F5F0EB" }}>
              {usuario.nombre_completo}
            </p>
            <p className="text-xs capitalize" style={{ color: "#8C8279" }}>
              {usuario.rol.replace("_", " ")}
            </p>
          </div>
          <button
            onClick={cerrarSesion}
            title="Cerrar sesión"
            className="shrink-0 rounded-lg p-1.5 transition-colors duration-150"
            style={{ color: "#6B6057" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#F5F0EB"; e.currentTarget.style.backgroundColor = "#2E2924"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#6B6057"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <IconLogout />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF9F7" }}>
      {/* ---------- Fixed sidebar (desktop) ---------- */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col min-[820px]:flex"
        style={{ backgroundColor: "#1F1B18" }}
      >
        {sidebarContent}
      </aside>

      {/* ---------- Mobile drawer overlay ---------- */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 min-[820px]:hidden"
          onClick={() => setDrawerOpen(false)}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        />
      )}

      {/* ---------- Mobile drawer ---------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-300 ease-in-out min-[820px]:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "#1F1B18" }}
      >
        {/* Close button */}
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute right-3 top-4 rounded-lg p-1 transition-colors duration-150"
          style={{ color: "#8C8279" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#F5F0EB"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#8C8279"; }}
        >
          <IconClose />
        </button>
        {sidebarContent}
      </aside>

      {/* ---------- Main content area ---------- */}
      <div className="min-[820px]:pl-[260px]">
        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b px-4 backdrop-blur-sm min-[820px]:px-8"
          style={{ backgroundColor: "rgba(250,249,247,0.85)", borderColor: "#E7E1DB" }}
        >
          {/* Mobile menu button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="shrink-0 rounded-lg p-1.5 transition-colors duration-150 min-[820px]:hidden"
            style={{ color: "#57534e" }}
          >
            <IconMenu />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex min-w-0 items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1">
                {i > 0 && (
                  <span style={{ color: "#A8A29E" }}>
                    <IconChevronRight />
                  </span>
                )}
                {i === breadcrumbs.length - 1 ? (
                  <span className="truncate font-medium" style={{ color: "#292524" }}>
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="truncate transition-colors duration-150"
                    style={{ color: "#78716C" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#292524"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#78716C"; }}
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {/* Demo badge */}
            <span
              className="hidden rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide sm:inline-flex"
              style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
            >
              Datos demo
            </span>

            {/* Notifications */}
            <button
              className="relative rounded-lg p-2 transition-colors duration-150"
              style={{ color: "#78716C" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#F0ECE7"; e.currentTarget.style.color = "#292524"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#78716C"; }}
              title="Notificaciones"
            >
              <IconBell />
              <span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                style={{ backgroundColor: colorPrimario }}
              />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-[1560px] px-4 py-6 min-[820px]:px-8 min-[820px]:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
