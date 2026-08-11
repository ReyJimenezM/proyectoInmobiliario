import type { Metadata } from "next";
import Link from "next/link";
import { PerfilProvider } from "@/components/landing/PerfilProvider";
import { HeroLanding } from "@/components/landing/HeroLanding";
import { CalculadoraAhorro } from "@/components/landing/CalculadoraAhorro";
import { FormularioLead } from "@/components/landing/FormularioLead";
import {
  IconoBalanza,
  IconoCampana,
  IconoCheck,
  IconoDocumento,
  IconoEngranaje,
  IconoEscudo,
  IconoFlecha,
  IconoGrafica,
  IconoLlave,
  IconoMoneda,
  IconoPersonas,
  IconoRayo,
  IconoReloj,
} from "@/components/landing/Iconos";

export const metadata: Metadata = {
  title: "Raíz | Estudio de arrendamiento automático para inmobiliarias",
  description:
    "Automatiza el estudio de arrendatarios con tus propias reglas: decisión en minutos, explicable y auditada. Agenda una demo de 20 minutos.",
  openGraph: {
    title: "Raíz | Decide a quién le arriendas en minutos, no en días",
    description:
      "Autoconsulta para el solicitante, motor de decisión parametrizable para la inmobiliaria y trazabilidad completa de cada caso.",
    type: "website",
    locale: "es_CO",
  },
  robots: { index: true, follow: true },
};

const NAVEGACION = [
  { href: "#solucion", texto: "Solución" },
  { href: "#ahorro", texto: "Ahorro" },
  { href: "#flujo", texto: "Cómo funciona" },
  { href: "#plataforma", texto: "Plataforma" },
  { href: "#personas", texto: "Para arrendatarios" },
];

const METRICAS = [
  { valor: "0 – 1000", etiqueta: "Escala del score de riesgo, con el detalle de cada variable" },
  { valor: "4 rutas", etiqueta: "Preaprobado, con requisitos, estudio manual o rechazado" },
  { valor: "< 48 h", etiqueta: "SLA objetivo por solicitud, medido y visible en el tablero" },
  { valor: "100 %", etiqueta: "De las decisiones quedan en una auditoría que no se puede editar" },
];

const PILARES = [
  {
    icono: IconoBalanza,
    titulo: "Decisión",
    resumen: "Un criterio, no veinte criterios distintos.",
    detalle:
      "El motor evalúa cada solicitud con las reglas que tú configuras: relación canon/ingresos, estabilidad laboral, historial, garantías. El resultado llega con el puntaje, las variables que pesaron y el porqué en lenguaje simple, listo para sustentárselo al propietario.",
    puntos: ["Reglas duras que nunca aprueban en automático", "Umbrales por vertical y por tipo de inmueble", "Versionado: cada cambio de política es reversible"],
  },
  {
    icono: IconoMoneda,
    titulo: "Ahorro",
    resumen: "El tiempo del analista se va en lo que sí importa.",
    detalle:
      "Los casos claros se resuelven solos y tu equipo se concentra en la zona gris. Se acaban las cadenas de correo pidiendo el mismo documento tres veces y la carpeta compartida con 40 PDF sin revisar.",
    puntos: ["Checklist de documentos que se arma según el perfil", "Cero digitación: el solicitante carga sus datos", "Menos reprocesos por información incompleta"],
  },
  {
    icono: IconoEngranaje,
    titulo: "Automatización",
    resumen: "Del lead al contrato firmado, sin saltar de herramienta.",
    detalle:
      "Autoconsulta, estudio, decisión, contrato y firma electrónica viven en la misma plataforma. Cada estado dispara la notificación que corresponde por correo, WhatsApp o SMS, con las plantillas que tú edites.",
    puntos: ["CRM de leads con pipeline y asignación de asesor", "Contrato y firma de las tres partes", "Pagos y conciliación del estudio"],
  },
];

const PASOS = [
  {
    numero: "01",
    titulo: "El interesado se autoconsulta",
    texto:
      "Un formulario guiado le pide solo lo que aplica a su perfil, con catálogos oficiales (DIVIPOLA, CIIU) y validación campo por campo. Nadie transcribe nada.",
  },
  {
    numero: "02",
    titulo: "El motor califica con tus reglas",
    texto:
      "Grupos de reglas ponderados producen un puntaje 0–1000. Los datos verificados pesan más que los declarados, y las reglas duras bloquean la aprobación automática.",
  },
  {
    numero: "03",
    titulo: "Tu equipo revisa solo la zona gris",
    texto:
      "Lo aprobado y lo rechazado sale solo. Lo demás llega a una cola con SLA, documentos a la vista, score explicado y botones de aprobar, rechazar o pedir información.",
  },
  {
    numero: "04",
    titulo: "Contrato, firma y seguimiento",
    texto:
      "Se genera el contrato de arrendamiento, se firma electrónicamente entre las tres partes y lo que pase después (pagos, moras) recalibra el motor en el siguiente ciclo.",
  },
];

const MODULOS = [
  { icono: IconoRayo, titulo: "Motor de decisión", texto: "Reglas, pesos y umbrales editables desde la interfaz, con versiones y rollback." },
  { icono: IconoDocumento, titulo: "Requisitos documentales", texto: "Qué documento se pide, a quién y bajo qué condición. Configurable sin tocar código." },
  { icono: IconoPersonas, titulo: "Leads / CRM", texto: "Pipeline de propietarios y arrendatarios, asignación de asesor y traza de cada gestión." },
  { icono: IconoLlave, titulo: "Contratos y firma", texto: "Generación del contrato y seguimiento de la firma electrónica de las tres partes." },
  { icono: IconoMoneda, titulo: "Pagos y facturación", texto: "Cobro por transacción del estudio, conciliación con la pasarela e historial." },
  { icono: IconoEscudo, titulo: "Auditoría append-only", texto: "Quién hizo qué y cuándo. La bitácora no se puede editar ni borrar, ni desde la base de datos." },
  { icono: IconoGrafica, titulo: "Reportes y SLA", texto: "Aprobación, rechazo, tiempos de evaluación y cumplimiento de SLA, exportables." },
  { icono: IconoCampana, titulo: "Notificaciones", texto: "Plantillas de correo, WhatsApp y SMS para cada estado del pipeline." },
  { icono: IconoBalanza, titulo: "Roles y permisos", texto: "Quién ve y hace qué en cada módulo, ajustable a la estructura de tu operación." },
];

const ANTES = [
  "El estudio tarda entre 3 y 8 días y nadie sabe en qué va",
  "Cada analista aplica su propio criterio",
  "Los documentos llegan por WhatsApp y correo, sin orden",
  "Sustentarle un rechazo al propietario es una conversación incómoda",
  "Si alguien se va, el conocimiento se va con esa persona",
];

const DESPUES = [
  "El interesado sabe el mismo día y tú ves el estado en el tablero",
  "El mismo criterio para todos, escrito y versionado",
  "Checklist dinámico: el sistema pide lo que falta y valida el formato",
  "El rechazo llega con las variables y el peso de cada una",
  "La política vive en la plataforma, no en la cabeza del analista",
];

const BENEFICIOS_PERSONA = [
  {
    icono: IconoReloj,
    titulo: "Respuesta el mismo día",
    texto: "Contestas la autoconsulta y sabes si calificas. Nada de esperar una semana por una llamada que no llega.",
  },
  {
    icono: IconoDocumento,
    titulo: "Solo los papeles que aplican",
    texto: "El checklist se arma según tu perfil: si eres independiente no te piden certificado laboral.",
  },
  {
    icono: IconoFlecha,
    titulo: "Si hoy no, te decimos cómo sí",
    texto: "Un rechazo viene con la ruta alterna: codeudor, póliza o qué ajustar para lograrlo.",
  },
];

const PREGUNTAS = [
  {
    pregunta: "¿Tengo que cambiar mi política de arrendamiento?",
    respuesta:
      "No. La plataforma parte de tus reglas actuales: las cargamos como versión inicial del motor y desde ahí las ajustas. Si algo no te convence, vuelves a la versión anterior en un clic.",
  },
  {
    pregunta: "¿La decisión es una caja negra?",
    respuesta:
      "No. Cada resultado muestra el puntaje, las variables que lo movieron y el peso de cada una, en lenguaje que le puedes reenviar al propietario. Además queda registrado en una auditoría que no se puede modificar.",
  },
  {
    pregunta: "¿Qué pasa con los casos que no son blanco o negro?",
    respuesta:
      "Van a una cola de estudio manual con SLA, con todo el expediente ya organizado. La automatización no reemplaza al analista: le quita de encima lo repetitivo.",
  },
  {
    pregunta: "¿Cómo se manejan los datos personales?",
    respuesta:
      "Con autorización expresa del titular antes de consultar cualquier fuente, documentos en almacenamiento privado (no público) y registro de cada acceso. La autorización de centrales de riesgo es un paso obligatorio y explícito del flujo.",
  },
  {
    pregunta: "¿Cuánto se demora la implementación?",
    respuesta:
      "Depende del volumen y de qué tan escritas estén tus políticas. En la demo revisamos tu operación y salimos con un plan concreto, no con un estimado genérico.",
  },
];

function Seccion({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24 lg:px-8 ${className}`}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

function TituloSeccion({
  etiqueta,
  titulo,
  descripcion,
  claro = false,
}: {
  etiqueta: string;
  titulo: string;
  descripcion?: string;
  claro?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p className={`text-sm font-semibold uppercase tracking-wider ${claro ? "text-clay-300" : "text-clay-600"}`}>
        {etiqueta}
      </p>
      <h2
        className={`mt-3 text-3xl font-semibold leading-tight sm:text-4xl ${claro ? "text-white" : "text-ink-900"}`}
      >
        {titulo}
      </h2>
      {descripcion && (
        <p className={`mt-4 text-lg leading-relaxed ${claro ? "text-ink-200" : "text-ink-500"}`}>{descripcion}</p>
      )}
    </div>
  );
}

function NavLanding() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-sand-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-2xl font-semibold text-ink-900">
          Raíz<span className="text-clay-500">.</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAVEGACION.map((enlace) => (
            <a
              key={enlace.href}
              href={enlace.href}
              className="text-sm font-medium text-ink-600 transition hover:text-ink-900"
            >
              {enlace.texto}
            </a>
          ))}
        </nav>

        <a
          href="#agenda"
          className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-700"
        >
          Agendar demo
        </a>
      </div>
    </header>
  );
}

export default function LandingPage() {
  return (
    <PerfilProvider>
      <NavLanding />

      <main>
        <HeroLanding />

        {/* Franja de datos duros del producto */}
        <section className="border-b border-ink-100 bg-white px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {METRICAS.map((metrica) => (
              <div key={metrica.valor} className="border-l-2 border-clay-500 pl-4">
                <p className="font-display text-2xl font-semibold text-ink-900">{metrica.valor}</p>
                <p className="mt-1 text-sm leading-snug text-ink-500">{metrica.etiqueta}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Los tres pilares */}
        <Seccion id="solucion" className="bg-sand-50">
          <TituloSeccion
            etiqueta="Para la inmobiliaria"
            titulo="Tres cosas cambian el día que el estudio deja de hacerse a mano"
            descripcion="No es un software más para llenar. Es la decisión, el costo de tomarla y el trabajo alrededor de ella."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PILARES.map((pilar) => {
              const Icono = pilar.icono;
              return (
                <article
                  key={pilar.titulo}
                  className="flex flex-col rounded-xl2 border border-ink-100 bg-white p-7 shadow-card transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900 text-clay-300">
                    <Icono className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-semibold text-ink-900">{pilar.titulo}</h3>
                  <p className="mt-1 text-sm font-medium text-clay-600">{pilar.resumen}</p>
                  <p className="mt-4 text-sm leading-relaxed text-ink-500">{pilar.detalle}</p>
                  <ul className="mt-5 space-y-2 border-t border-ink-100 pt-5">
                    {pilar.puntos.map((punto) => (
                      <li key={punto} className="flex items-start gap-2.5 text-sm text-ink-600">
                        <IconoCheck className="mt-0.5 h-4 w-4 shrink-0 text-clay-500" />
                        {punto}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </Seccion>

        {/* Calculadora */}
        <Seccion id="ahorro" className="bg-white">
          <TituloSeccion
            etiqueta="Ahorro"
            titulo="¿Cuánto te cuesta hoy revisar a mano?"
            descripcion="Mueve los controles con los números de tu operación. El cálculo se actualiza al instante."
          />
          <div className="mt-12">
            <CalculadoraAhorro />
          </div>
        </Seccion>

        {/* Cómo funciona */}
        <Seccion id="flujo" className="bg-ink-950">
          <TituloSeccion
            claro
            etiqueta="Cómo funciona"
            titulo="Cuatro pasos entre el interesado y el contrato firmado"
            descripcion="El mismo flujo para todos los casos, con el expediente armándose solo por el camino."
          />

          <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PASOS.map((paso) => (
              <li
                key={paso.numero}
                className="relative rounded-xl2 border border-white/10 bg-white/5 p-6 transition hover:border-clay-500/50 hover:bg-white/[0.08]"
              >
                <span className="font-display text-4xl font-semibold text-clay-400/60">{paso.numero}</span>
                <h3 className="mt-3 text-lg font-semibold text-white">{paso.titulo}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-300">{paso.texto}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap items-center gap-4 rounded-xl2 border border-white/10 bg-white/5 p-6">
            <p className="flex-1 text-sm text-ink-200">
              ¿Quieres verlo con un caso tuyo? En la demo cargamos una solicitud real y la corremos de punta a punta.
            </p>
            <a
              href="#agenda"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink-900 transition hover:bg-clay-300"
            >
              Agendar demo
              <IconoFlecha className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </a>
          </div>
        </Seccion>

        {/* Módulos */}
        <Seccion id="plataforma" className="bg-sand-50">
          <TituloSeccion
            etiqueta="La plataforma"
            titulo="Todo lo que la operación necesita, en un solo lugar"
            descripcion="Módulos que ya existen y se configuran desde la interfaz. Sin desarrollos a la medida para cada cambio de política."
          />

          <div className="mt-12 grid gap-px overflow-hidden rounded-xl2 border border-ink-100 bg-ink-100 sm:grid-cols-2 lg:grid-cols-3">
            {MODULOS.map((modulo) => {
              const Icono = modulo.icono;
              return (
                <div key={modulo.titulo} className="bg-white p-6 transition hover:bg-sand-50">
                  <Icono className="h-6 w-6 text-clay-500" />
                  <h3 className="mt-4 text-base font-semibold text-ink-900">{modulo.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{modulo.texto}</p>
                </div>
              );
            })}
          </div>
        </Seccion>

        {/* Antes / después */}
        <Seccion className="bg-white">
          <TituloSeccion
            etiqueta="El cambio"
            titulo="Cómo se siente la operación antes y después"
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl2 border border-ink-100 bg-sand-50 p-7">
              <h3 className="text-lg font-semibold text-ink-500">Hoy, con estudio manual</h3>
              <ul className="mt-5 space-y-4">
                {ANTES.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-ink-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl2 border border-clay-200 bg-gradient-to-br from-clay-50 to-white p-7 shadow-card">
              <h3 className="text-lg font-semibold text-ink-900">Con Raíz</h3>
              <ul className="mt-5 space-y-4">
                {DESPUES.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-medium text-ink-800">
                    <IconoCheck className="mt-0.5 h-4 w-4 shrink-0 text-clay-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Seccion>

        {/* Para el cliente final */}
        <Seccion id="personas" className="bg-sand-100">
          <TituloSeccion
            etiqueta="Para quien busca vivienda"
            titulo="Del otro lado también se siente distinto"
            descripcion="Una inmobiliaria que responde rápido y explica sus decisiones arrienda más. Por eso la experiencia del solicitante es parte del producto, no un accesorio."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {BENEFICIOS_PERSONA.map((beneficio) => {
              const Icono = beneficio.icono;
              return (
                <div key={beneficio.titulo} className="rounded-xl2 bg-white p-7 shadow-card">
                  <Icono className="h-6 w-6 text-clay-500" />
                  <h3 className="mt-4 text-lg font-semibold text-ink-900">{beneficio.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{beneficio.texto}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/autoconsulta"
              className="group inline-flex items-center gap-2 rounded-full bg-ink-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-700"
            >
              Consulta si calificas
              <IconoFlecha className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link href="/simulador" className="text-sm font-semibold text-ink-700 underline hover:text-ink-900">
              O simula tu crédito primero
            </Link>
          </div>
        </Seccion>

        {/* Preguntas frecuentes */}
        <Seccion className="bg-white">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <TituloSeccion etiqueta="Preguntas frecuentes" titulo="Lo que siempre nos preguntan primero" />

            <div className="divide-y divide-ink-100 border-y border-ink-100">
              {PREGUNTAS.map((item) => (
                <details key={item.pregunta} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink-900">
                    {item.pregunta}
                    <span className="shrink-0 text-clay-500 transition group-open:rotate-45" aria-hidden>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-500">{item.respuesta}</p>
                </details>
              ))}
            </div>
          </div>
        </Seccion>

        {/* Formulario + Calendly */}
        <Seccion id="agenda" className="bg-ink-950">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
            <div>
              <TituloSeccion
                claro
                etiqueta="Agenda"
                titulo="20 minutos para ver si esto le sirve a tu operación"
                descripcion="Sin presentación genérica: entramos a la plataforma, cargamos un caso parecido a los tuyos y lo corremos delante de ti."
              />

              <ul className="mt-8 space-y-4">
                {[
                  "Revisamos tu política actual y cómo quedaría configurada",
                  "Corremos una solicitud real de punta a punta",
                  "Calculamos el ahorro con tu volumen y tus tiempos",
                  "Sales con un plan de implementación concreto",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-ink-100">
                    <span className="mt-0.5 rounded-full bg-clay-500/20 p-1 text-clay-300">
                      <IconoCheck className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[15px]">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 rounded-xl2 border border-white/10 bg-white/5 p-6">
                <p className="text-sm leading-relaxed text-ink-200">
                  ¿Prefieres explorar por tu cuenta primero? Recorre la{" "}
                  <Link href="/" className="font-semibold text-clay-300 underline">
                    vitrina de propiedades
                  </Link>{" "}
                  o haz la{" "}
                  <Link href="/autoconsulta" className="font-semibold text-clay-300 underline">
                    autoconsulta
                  </Link>{" "}
                  como lo haría un arrendatario.
                </p>
              </div>
            </div>

            <FormularioLead />
          </div>
        </Seccion>
      </main>

      <footer className="bg-ink-950 px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-8 text-sm text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-display text-lg font-semibold text-white">
              Raíz<span className="text-clay-400">.</span>
            </span>{" "}
            © {new Date().getFullYear()} — Demo funcional, no es un producto de producción final.
          </p>
          <div className="flex flex-wrap gap-5">
            <Link href="/legal/politica-datos" className="hover:text-white">
              Tratamiento de datos
            </Link>
            <Link href="/legal/terminos" className="hover:text-white">
              Términos
            </Link>
            <Link href="/" className="hover:text-white">
              Ir al sitio
            </Link>
          </div>
        </div>
      </footer>

      {/* CTA fijo en móvil: el botón siempre a un pulgar de distancia. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 p-3 backdrop-blur lg:hidden">
        <a
          href="#agenda"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-clay-500 px-6 py-3.5 text-sm font-semibold text-white"
        >
          Agenda tu demo gratis
          <IconoFlecha className="h-4 w-4" />
        </a>
      </div>
      <div className="h-20 lg:hidden" aria-hidden />
    </PerfilProvider>
  );
}
