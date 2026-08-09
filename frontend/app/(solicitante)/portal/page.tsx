"use client";

import Link from "next/link";

const ACCIONES = [
  {
    href: "/venta/apartamento/bogota",
    titulo: "Empezar mi solicitud",
    descripcion: "Elige una propiedad y arranca tu solicitud de crédito en minutos.",
    cta: "Buscar propiedades",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <path d="M4 21V11.4L13 4.5L22 11.4V21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.5 21V15h5v6" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/portal/retomar",
    titulo: "Continuar donde iba",
    descripcion: "Retoma tu solicitud en curso con el código que te dimos.",
    cta: "Retomar solicitud",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <path d="M5 13a8 8 0 1 1 2.34 5.66" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M5 13V8.5M5 13H9.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/portal/estado",
    titulo: "Ver cómo va mi estudio",
    descripcion: "Consulta el estado de tu solicitud y qué falta por hacer.",
    cta: "Consultar estado",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <circle cx="13" cy="13" r="9" stroke="currentColor" strokeWidth="1.75" />
        <path d="M13 8v5.5l4 2.25" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const CONFIANZA = [
  {
    label: "Cuidamos tus datos",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2.75L16.5 5.25V9.5C16.5 13.6 13.8 16.9 10 18C6.2 16.9 3.5 13.6 3.5 9.5V5.25L10 2.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Todo viaja cifrado",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="4.5" y="9" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6.75 9V6.5a3.25 3.25 0 0 1 6.5 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Guardamos tu avance",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 6v4l2.75 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Te explicamos cada decisión",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5.5 5.25h9M5.5 5.25v9.5c0 .55.45 1 1 1h4.7l3.3-3.3V5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 7.5v9.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function PortalHomePage() {
  return (
    <div className="bg-sand-50">
      <section className="border-b border-ink-100 bg-ink-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-clay-200 ring-1 ring-white/15">
            La mayoría recibe respuesta el mismo día
          </span>
          <h1 className="mx-auto mt-6 max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Tu próxima casa empieza aquí
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-200">
            Te acompañamos en cada paso de tu solicitud de crédito: fácil de llenar, fácil de retomar y con
            respuestas claras sobre tu evaluación.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {ACCIONES.map((accion) => (
            <Link
              key={accion.href}
              href={accion.href}
              className="group flex flex-col rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-50 text-clay-600">
                {accion.icon}
              </span>
              <h2 className="mt-5 font-display text-xl font-semibold text-ink-900">{accion.titulo}</h2>
              <p className="mt-2 flex-1 text-sm text-ink-500">{accion.descripcion}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-clay-600">
                {accion.cta}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="transition group-hover:translate-x-1">
                  <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CONFIANZA.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-ink-700 ring-1 ring-ink-900/5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600">
                {item.icon}
              </span>
              {item.label}
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-8 rounded-2xl bg-white p-8 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink-900">Ten a mano</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" />
                Documento de identidad vigente
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" />
                Certificado laboral o soporte de ingresos
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" />
                Últimos extractos bancarios
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" />
                Datos de tu codeudor, si aplica
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-ink-900">Cómo te evaluamos</h3>
            <p className="mt-3 text-sm text-ink-600">
              Analizamos tus ingresos, tu historial financiero y la propiedad que elegiste con un modelo
              transparente. Cada resultado viene con una explicación de qué pesó a favor y qué puedes mejorar
              si la respuesta no es la que esperabas.
            </p>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-ink-900">¿Te ayudamos?</h3>
            <p className="mt-3 text-sm text-ink-600">
              Escríbenos a{" "}
              <a href="mailto:hola@raiz.com" className="font-semibold text-clay-600">
                hola@raiz.com
              </a>{" "}
              o llámanos al{" "}
              <a href="tel:+576014567890" className="font-semibold text-clay-600">
                (601) 456 7890
              </a>
              . Atendemos de lunes a sábado, de 8 a.m. a 6 p.m.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
