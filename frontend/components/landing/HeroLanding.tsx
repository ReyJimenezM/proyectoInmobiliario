"use client";

import Link from "next/link";
import { usePerfil } from "./PerfilProvider";
import { IconoCheck, IconoFlecha, IconoReloj } from "./Iconos";
import type { PerfilLead } from "@/lib/leads";

const COPIA: Record<
  PerfilLead,
  {
    etiqueta: string;
    titulo: string;
    resaltado: string;
    cola: string;
    descripcion: string;
    puntos: string[];
    cta: string;
    secundario: { texto: string; href: string };
  }
> = {
  inmobiliaria: {
    etiqueta: "Para inmobiliarias y administradores de propiedad",
    titulo: "Decide a quién le arriendas en ",
    resaltado: "minutos",
    cola: ", no en días.",
    descripcion:
      "El solicitante se autoconsulta, el motor lo califica con las reglas que tú configuras y tu equipo solo mira lo que de verdad necesita ojo humano. Menos correos, menos Excel, menos “déjame lo reviso y te aviso”.",
    puntos: [
      "Estudio automático con tus propias reglas y umbrales",
      "Cada decisión explicada y auditada, sin caja negra",
      "Del lead al contrato firmado en una sola plataforma",
    ],
    cta: "Agenda una demo de 20 minutos",
    secundario: { texto: "Ver los módulos", href: "#plataforma" },
  },
  persona: {
    etiqueta: "Para quien busca arrendar o comprar",
    titulo: "Sabe si calificas ",
    resaltado: "antes",
    cola: " de entregar un solo papel.",
    descripcion:
      "Contesta una autoconsulta guiada y recibe una respuesta clara el mismo día: preaprobado, con requisitos o qué te falta para lograrlo. Sin filas, sin llamadas, sin sorpresas al final del proceso.",
    puntos: [
      "Respuesta en minutos, no en semanas",
      "Te decimos exactamente qué documentos necesitas",
      "Si no calificas hoy, te mostramos la ruta para lograrlo",
    ],
    cta: "Quiero saber si califico",
    secundario: { texto: "Ir a la autoconsulta", href: "/autoconsulta" },
  },
};

function Selector() {
  const { perfil, setPerfil } = usePerfil();
  const opciones: { valor: PerfilLead; texto: string }[] = [
    { valor: "inmobiliaria", texto: "Soy inmobiliaria" },
    { valor: "persona", texto: "Busco vivienda" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Elige tu perfil"
      className="inline-flex rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur"
    >
      {opciones.map((opcion) => {
        const activo = perfil === opcion.valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            role="tab"
            aria-selected={activo}
            onClick={() => setPerfil(opcion.valor)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition sm:px-5 ${
              activo ? "bg-white text-ink-900 shadow-sm" : "text-ink-200 hover:text-white"
            }`}
          >
            {opcion.texto}
          </button>
        );
      })}
    </div>
  );
}

function TarjetaDecision() {
  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute -inset-6 rounded-[2rem] bg-clay-500/20 blur-3xl" aria-hidden />
      <div className="relative rounded-xl2 border border-white/10 bg-white/95 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Solicitud AC-2481</p>
            <p className="font-display text-lg font-semibold text-ink-900">Estudio de arrendamiento</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-500" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Preaprobado
          </span>
        </div>

        <div className="mt-5">
          <div className="flex items-end justify-between">
            <p className="font-display text-4xl font-semibold text-ink-900">
              812<span className="text-lg text-ink-400">/1000</span>
            </p>
            <p className="text-xs text-ink-500">Score de riesgo</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full w-[81%] rounded-full bg-gradient-to-r from-clay-400 to-emerald-500" />
          </div>
        </div>

        <ul className="mt-5 space-y-2.5 text-sm">
          {[
            ["Relación canon / ingresos", "26 %"],
            ["Estabilidad laboral", "3 a 8 meses"],
            ["Documentos verificados", "6 de 6"],
          ].map(([etiqueta, valor]) => (
            <li key={etiqueta} className="flex items-center justify-between border-b border-ink-100 pb-2">
              <span className="text-ink-500">{etiqueta}</span>
              <span className="font-semibold text-ink-900">{valor}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 flex items-center gap-2 text-xs text-ink-500">
          <IconoReloj className="h-4 w-4 text-clay-500" />
          Resuelto en <strong className="font-semibold text-ink-800">1 min 42 s</strong> · sin intervención manual
        </p>
      </div>

      <p className="relative mt-3 text-center text-[11px] text-ink-400">Ejemplo de salida del motor de decisión</p>
    </div>
  );
}

export function HeroLanding() {
  const { perfil } = usePerfil();
  const copia = COPIA[perfil];

  return (
    <section className="relative overflow-hidden bg-ink-950 pb-20 pt-14 text-white sm:pb-28 sm:pt-20">
      {/* Fondo: solo gradientes CSS, cero imágenes que descargar. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60rem 40rem at 12% -10%, rgba(213,118,47,0.28), transparent 60%), radial-gradient(50rem 35rem at 90% 0%, rgba(76,107,99,0.45), transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(70% 60% at 50% 0%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 0%, black, transparent 75%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Selector />

        <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div key={perfil} className="animate-fade-up">
            <p className="text-sm font-semibold uppercase tracking-wider text-clay-300">{copia.etiqueta}</p>

            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
              {copia.titulo}
              <span className="relative whitespace-nowrap text-clay-300">
                {copia.resaltado}
                <svg
                  className="absolute -bottom-1.5 left-0 h-2.5 w-full text-clay-500/70"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path d="M0 6 Q 25 1 50 4 T 100 3" fill="none" stroke="currentColor" strokeWidth="2.5" />
                </svg>
              </span>
              {copia.cola}
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-200">{copia.descripcion}</p>

            <ul className="mt-7 space-y-2.5">
              {copia.puntos.map((punto) => (
                <li key={punto} className="flex items-start gap-3 text-ink-100">
                  <span className="mt-0.5 rounded-full bg-clay-500/20 p-1 text-clay-300">
                    <IconoCheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[15px]">{punto}</span>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#agenda"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-clay-500 px-7 py-4 text-sm font-semibold text-white shadow-lg shadow-clay-900/30 transition hover:bg-clay-400"
              >
                {copia.cta}
                <IconoFlecha className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </a>
              <Link
                href={copia.secundario.href}
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-4 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5"
              >
                {copia.secundario.texto}
              </Link>
            </div>

            <p className="mt-5 text-sm text-ink-300">
              Sin instalar nada · Demo con tus propias reglas · Respuesta en menos de 24 horas hábiles
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <TarjetaDecision />
          </div>
        </div>
      </div>
    </section>
  );
}
