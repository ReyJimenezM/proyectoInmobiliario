"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ApiError, iniciarSesion } from "@/lib/api";
import { guardarSesion } from "@/lib/auth";

/* ------------------------------------------------------------------ */
/*  Demo users                                                         */
/* ------------------------------------------------------------------ */
const DEMO_USERS = [
  {
    label: "superadmin",
    email: "superadmin@fincaraiz-demo.co",
    password: "SuperAdmin123!",
    descripcion: "Gestiona todas las inmobiliarias de la plataforma",
  },
  {
    label: "admin",
    email: "admin@fincaraiz-demo.co",
    password: "Admin123!",
    descripcion: "Administra una inmobiliaria: motor, políticas y usuarios",
  },
  {
    label: "asesor",
    email: "asesor@fincaraiz-demo.co",
    password: "Asesor123!",
    descripcion: "Da seguimiento a solicitudes y toma decisiones de riesgo",
  },
  {
    label: "solicitante",
    email: "solicitante@fincaraiz-demo.co",
    password: "Demo123!",
    descripcion: "Aplica a un crédito o arriendo desde el portal público",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Feature items for right panel                                      */
/* ------------------------------------------------------------------ */
const FEATURES = [
  {
    title: "Motor de reglas versionado",
    description: "Cada cambio en las reglas de evaluacion queda registrado, auditable y reversible.",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    title: "Explicabilidad obligatoria",
    description: "Cada decision incluye los factores de riesgo y su peso relativo. Sin cajas negras.",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
      </svg>
    ),
  },
  {
    title: "White label real",
    description: "Logo, colores, dominio y textos legales configurables por inmobiliaria.",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
      </svg>
    ),
  },
  {
    title: "Motor de decisión con 34 reglas",
    description: "Reglas de escala y ajuste organizadas en 6 grupos: capacidad, estabilidad, endeudamiento, verificabilidad, historial y antifraude.",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    title: "Scoring de propietarios e inmuebles",
    description: "Cada anunciante y cada propiedad reciben un score de riesgo propio, con sus componentes desglosados.",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    title: "Match Risk automático",
    description: "Cruza el riesgo del solicitante con el del inmueble y el anunciante para anticipar fricciones antes de firmar.",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" />
      </svg>
    ),
  },
] as const;

/* ================================================================== */
/*  Page wrapper with Suspense                                         */
/* ================================================================== */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}

/* ================================================================== */
/*  Main login screen                                                  */
/* ================================================================== */
function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("admin@fincaraiz-demo.co");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recordarDispositivo, setRecordarDispositivo] = useState(false);
  const [avisoOlvide, setAvisoOlvide] = useState(false);

  /* ---- submit ---------------------------------------------------- */
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const respuesta = await iniciarSesion({ email, password });
      guardarSesion(respuesta.access_token, respuesta.refresh_token, respuesta.usuario);

      const destino = searchParams.get("destino");
      if (respuesta.usuario.rol === "solicitante") {
        router.push(destino || "/");
      } else {
        router.push("/admin");
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Email o contrasena incorrectos"
          : "No pudimos iniciar sesion. Intenta de nuevo."
      );
    } finally {
      setCargando(false);
    }
  }

  /* ---- demo user autofill --------------------------------------- */
  function rellenarDemo(user: (typeof DEMO_USERS)[number]) {
    setEmail(user.email);
    setPassword(user.password);
    setError(null);
  }

  /* ================================================================ */
  return (
    <div className="flex min-h-screen">
      {/* ============================================================ */}
      {/*  LEFT — form column                                          */}
      {/* ============================================================ */}
      <div className="flex w-full flex-col justify-between px-6 py-8 sm:px-12 lg:w-1/2 lg:px-20 xl:px-28">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold text-ink-900">Habitat Risk</p>
            <p className="text-xs text-ink-500">Inmobiliaria Andina S.A.S.</p>
          </div>
        </div>

        {/* Form area */}
        <div className="mx-auto w-full max-w-sm flex-1 flex flex-col justify-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">
            Hola de nuevo
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Ingresa tus credenciales para acceder al panel de gestion de riesgo inmobiliario.
          </p>

          <form onSubmit={enviar} className="mt-8 space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-700">
                Correo electronico
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-sm outline-none transition placeholder:text-ink-400 focus:border-clay-600 focus:ring-2 focus:ring-clay-600/20"
                placeholder="tu@email.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-700">
                Contrasena
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-ink-900 shadow-sm outline-none transition placeholder:text-ink-400 focus:border-clay-600 focus:ring-2 focus:ring-clay-600/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-600"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember device + forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-ink-600">
                <input
                  type="checkbox"
                  checked={recordarDispositivo}
                  onChange={(e) => setRecordarDispositivo(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300 text-clay-600 focus:ring-clay-600/30"
                />
                Recordar este dispositivo
              </label>
              <button
                type="button"
                onClick={() => setAvisoOlvide(true)}
                className="text-xs font-medium text-clay-600 hover:text-clay-700 transition"
              >
                ¿Olvidaste tu contrasena?
              </button>
            </div>

            {avisoOlvide && (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-700">
                <span>Contacta al administrador de tu inmobiliaria para restablecer tu contrasena.</span>
                <button
                  type="button"
                  onClick={() => setAvisoOlvide(false)}
                  className="shrink-0 text-sky-500 hover:text-sky-700"
                  aria-label="Cerrar aviso"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={cargando}
              className="relative flex w-full items-center justify-center rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900 disabled:opacity-60"
            >
              {cargando && (
                <svg className="absolute left-4 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {cargando ? "Ingresando..." : "Iniciar sesion"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-ink-400">o</span>
            </div>
          </div>

          {/* Client portal button */}
          <Link
            href="/"
            className="flex w-full items-center justify-center rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 shadow-sm transition hover:bg-sand-50 hover:border-ink-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-500"
          >
            Ir al portal del cliente
          </Link>
        </div>

        {/* Footer security note */}
        <p className="mt-8 text-center text-xs text-ink-400 lg:text-left">
          <svg className="mr-1 inline-block h-3.5 w-3.5 -translate-y-px text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          Todas las sesiones quedan registradas en el audit trail del sistema.
        </p>
      </div>

      {/* ============================================================ */}
      {/*  RIGHT — showcase panel (hidden on mobile)                    */}
      {/* ============================================================ */}
      <div className="relative hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between overflow-hidden rounded-l-3xl bg-gradient-to-br from-ink-900 to-clay-700 p-12 xl:p-16 text-white">
        {/* Subtle decorative circles */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/5" />

        {/* Top content */}
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-clay-600">
            Decision engine inmobiliario
          </p>
          <h2 className="font-display mt-4 text-3xl font-bold leading-tight xl:text-4xl">
            Detras de cada decision hay una familia buscando donde vivir.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            Evaluamos al arrendatario, al propietario y al inmueble en una sola pasada.
            El motor cruza historial crediticio, capacidad de pago y condiciones del
            mercado para devolver un score, un concepto y las variables que lo explican.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 mt-10 space-y-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/60">{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Demo users */}
        <div className="relative z-10 mt-10 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Usuarios de demostracion
          </p>
          <div className="mt-3 space-y-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.label}
                type="button"
                onClick={() => rellenarDemo(u)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/15 bg-white/10 px-3.5 py-2 text-left transition hover:bg-white/20 hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-white">{u.label}</span>
                  <span className="block truncate text-[11px] leading-relaxed text-white/50">{u.descripcion}</span>
                </span>
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                  usar
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-white/40">
            Haz clic en un rol para rellenar el formulario automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
