"use client";

import { useEffect, useId, useState } from "react";
import {
  INTERESES_PERSONA,
  RANGOS_INMUEBLES,
  erroresDesdeZod,
  leadSchema,
  type ErroresLead,
  type LeadInput,
} from "@/lib/leads";
import { usePerfil } from "./PerfilProvider";
import { CALENDLY_URL, CalendlyEmbed } from "./CalendlyEmbed";
import { IconoCalendario, IconoCheck, IconoFlecha } from "./Iconos";

const WHATSAPP = process.env.NEXT_PUBLIC_CONTACTO_WHATSAPP ?? "";
const CORREO_CONTACTO = process.env.NEXT_PUBLIC_CONTACTO_EMAIL ?? "";

type Campos = {
  nombre: string;
  correo: string;
  telefono: string;
  empresa: string;
  ciudad: string;
  inmuebles: string;
  interes: string;
  mensaje: string;
  acepta_datos: boolean;
  sitio_web: string;
};

const VACIO: Campos = {
  nombre: "",
  correo: "",
  telefono: "",
  empresa: "",
  ciudad: "",
  inmuebles: "",
  interes: "",
  mensaje: "",
  acepta_datos: false,
  sitio_web: "",
};

function Etiqueta({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-700">
      {children}
    </label>
  );
}

function MensajeError({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
      {mensaje}
    </p>
  );
}

export function FormularioLead() {
  const { perfil, setPerfil } = usePerfil();
  const [campos, setCampos] = useState<Campos>(VACIO);
  const [errores, setErrores] = useState<ErroresLead>({});
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [agendado, setAgendado] = useState(false);
  const [utm, setUtm] = useState<Pick<LeadInput, "utm_source" | "utm_medium" | "utm_campaign" | "pagina">>({});
  const idBase = useId();

  // Las UTM llegan en la URL de la campaña; se guardan con el lead para saber qué anuncio
  // lo trajo. Se leen en el cliente para que la página siga siendo estática.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUtm({
      utm_source: params.get("utm_source") ?? undefined,
      utm_medium: params.get("utm_medium") ?? undefined,
      utm_campaign: params.get("utm_campaign") ?? undefined,
      pagina: window.location.pathname,
    });
  }, []);

  const esInmobiliaria = perfil === "inmobiliaria";
  const id = (campo: string) => `${idBase}-${campo}`;

  function actualizar<C extends keyof Campos>(campo: C, valor: Campos[C]) {
    setCampos((previos) => ({ ...previos, [campo]: valor }));
    setErrores((previos) => (previos[campo as keyof ErroresLead] ? { ...previos, [campo]: undefined } : previos));
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorGeneral(null);

    const payload = {
      ...campos,
      perfil,
      inmuebles: esInmobiliaria && campos.inmuebles ? campos.inmuebles : undefined,
      origen: `landing-${perfil}`,
      ...utm,
    };

    const validado = leadSchema.safeParse(payload);
    if (!validado.success) {
      setErrores(erroresDesdeZod(validado.error));
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validado.data),
      });
      const cuerpo = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        error?: string;
        errores?: ErroresLead;
      };

      if (!res.ok || !cuerpo.ok) {
        if (cuerpo.errores) setErrores(cuerpo.errores);
        setErrorGeneral(cuerpo.error ?? "No pudimos enviar tus datos. Vuelve a intentarlo en un momento.");
        return;
      }

      setLeadId(cuerpo.id ?? "");
    } catch {
      setErrorGeneral("Se cayó la conexión antes de enviar. Revisa tu internet e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function marcarAgendado() {
    setAgendado(true);
    if (!leadId) return;
    // Best-effort: si falla, la reunión ya quedó en Calendly de todas formas.
    void fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: leadId, evento: "agendado" }),
    }).catch(() => undefined);
  }

  if (leadId !== null) {
    return (
      <div className="animate-fade-up rounded-xl2 bg-white p-6 shadow-card sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <IconoCheck className="h-4 w-4" />
          {agendado ? "Reunión confirmada" : "Datos recibidos"}
        </span>

        <h3 className="mt-4 font-display text-2xl font-semibold text-ink-900">
          {agendado
            ? "Listo, quedamos agendados."
            : CALENDLY_URL
              ? "Ahora elige el horario que te sirva"
              : "Gracias, ya tenemos tus datos"}
        </h3>

        <p className="mt-2 text-sm text-ink-500">
          {agendado ? (
            <>Te llega la invitación al correo con el enlace de la reunión. Tu radicado es <strong>{leadId}</strong>.</>
          ) : CALENDLY_URL ? (
            <>
              Son 20 minutos: te mostramos la plataforma con un caso real de tu operación. Tu radicado es{" "}
              <strong>{leadId}</strong>.
            </>
          ) : (
            <>
              Un asesor te contacta en menos de 24 horas hábiles. Tu radicado es <strong>{leadId}</strong>.
            </>
          )}
        </p>

        {CALENDLY_URL && !agendado && (
          <div className="mt-6">
            <CalendlyEmbed
              nombre={campos.nombre}
              correo={campos.correo}
              telefono={campos.telefono}
              onAgendado={marcarAgendado}
            />
          </div>
        )}

        {(!CALENDLY_URL || agendado) && (WHATSAPP || CORREO_CONTACTO) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {WHATSAPP && (
              <a
                href={`https://wa.me/${WHATSAPP}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary px-5 py-2.5 text-sm"
              >
                Escríbenos por WhatsApp
              </a>
            )}
            {CORREO_CONTACTO && (
              <a href={`mailto:${CORREO_CONTACTO}`} className="btn-secondary px-5 py-2.5 text-sm">
                {CORREO_CONTACTO}
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="rounded-xl2 bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-2xl font-semibold text-ink-900">
          {esInmobiliaria ? "Agenda tu demo" : "Déjanos tus datos"}
        </h3>
        {CALENDLY_URL && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1 text-xs font-medium text-ink-600">
            <IconoCalendario className="h-3.5 w-3.5" />
            Eliges el horario al enviar
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-ink-500">
        {esInmobiliaria
          ? "Cuéntanos cómo es tu operación y te mostramos la plataforma configurada con tus reglas."
          : "Te contactamos para acompañarte en el proceso y decirte qué necesitas para calificar."}
      </p>

      {/* Selector de perfil: cambia los campos que se piden. */}
      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-ink-700">¿Quién eres?</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { valor: "inmobiliaria" as const, texto: "Inmobiliaria" },
            { valor: "persona" as const, texto: "Persona natural" },
          ].map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={perfil === opcion.valor}
              onClick={() => setPerfil(opcion.valor)}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                perfil === opcion.valor
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 bg-white text-ink-600 hover:border-ink-400"
              }`}
            >
              {opcion.texto}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Etiqueta htmlFor={id("nombre")}>Nombre completo</Etiqueta>
          <input
            id={id("nombre")}
            className="input-field"
            autoComplete="name"
            value={campos.nombre}
            onChange={(e) => actualizar("nombre", e.target.value)}
            aria-invalid={Boolean(errores.nombre)}
          />
          <MensajeError mensaje={errores.nombre} />
        </div>

        <div>
          <Etiqueta htmlFor={id("correo")}>Correo</Etiqueta>
          <input
            id={id("correo")}
            type="email"
            inputMode="email"
            autoComplete="email"
            className="input-field"
            value={campos.correo}
            onChange={(e) => actualizar("correo", e.target.value)}
            aria-invalid={Boolean(errores.correo)}
          />
          <MensajeError mensaje={errores.correo} />
        </div>

        <div>
          <Etiqueta htmlFor={id("telefono")}>Celular</Etiqueta>
          <input
            id={id("telefono")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="300 123 4567"
            className="input-field"
            value={campos.telefono}
            onChange={(e) => actualizar("telefono", e.target.value)}
            aria-invalid={Boolean(errores.telefono)}
          />
          <MensajeError mensaje={errores.telefono} />
        </div>

        {esInmobiliaria ? (
          <>
            <div>
              <Etiqueta htmlFor={id("empresa")}>Inmobiliaria</Etiqueta>
              <input
                id={id("empresa")}
                className="input-field"
                autoComplete="organization"
                value={campos.empresa}
                onChange={(e) => actualizar("empresa", e.target.value)}
              />
            </div>

            <div>
              <Etiqueta htmlFor={id("inmuebles")}>Inmuebles que administras</Etiqueta>
              <select
                id={id("inmuebles")}
                className="input-field"
                value={campos.inmuebles}
                onChange={(e) => actualizar("inmuebles", e.target.value)}
              >
                <option value="">Selecciona…</option>
                {RANGOS_INMUEBLES.map((rango) => (
                  <option key={rango} value={rango}>
                    {rango}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className="sm:col-span-2">
            <Etiqueta htmlFor={id("interes")}>¿Qué necesitas?</Etiqueta>
            <select
              id={id("interes")}
              className="input-field"
              value={campos.interes}
              onChange={(e) => actualizar("interes", e.target.value)}
            >
              <option value="">Selecciona…</option>
              {INTERESES_PERSONA.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={esInmobiliaria ? "sm:col-span-2" : ""}>
          <Etiqueta htmlFor={id("ciudad")}>Ciudad</Etiqueta>
          <input
            id={id("ciudad")}
            className="input-field"
            autoComplete="address-level2"
            value={campos.ciudad}
            onChange={(e) => actualizar("ciudad", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <Etiqueta htmlFor={id("mensaje")}>
            {esInmobiliaria ? "¿Qué te está costando más hoy? (opcional)" : "Cuéntanos tu caso (opcional)"}
          </Etiqueta>
          <textarea
            id={id("mensaje")}
            rows={3}
            className="input-field"
            value={campos.mensaje}
            onChange={(e) => actualizar("mensaje", e.target.value)}
          />
        </div>
      </div>

      {/* Honeypot: invisible para personas, irresistible para bots. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={id("sitio_web")}>No llenar</label>
        <input
          id={id("sitio_web")}
          tabIndex={-1}
          autoComplete="off"
          value={campos.sitio_web}
          onChange={(e) => actualizar("sitio_web", e.target.value)}
        />
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink-600">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-clay-500"
          checked={campos.acepta_datos}
          onChange={(e) => actualizar("acepta_datos", e.target.checked)}
          aria-invalid={Boolean(errores.acepta_datos)}
        />
        <span>
          Autorizo el tratamiento de mis datos para ser contactado, según la{" "}
          <a href="/legal/politica-datos" className="font-medium text-ink-900 underline">
            política de tratamiento de datos
          </a>
          .
        </span>
      </label>
      <MensajeError mensaje={errores.acepta_datos} />

      {errorGeneral && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
          {errorGeneral}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-clay-500 px-7 py-4 text-sm font-semibold text-white transition hover:bg-clay-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Enviando…" : esInmobiliaria ? "Enviar y elegir horario" : "Enviar mis datos"}
        {!enviando && <IconoFlecha className="h-4 w-4 transition group-hover:translate-x-0.5" />}
      </button>

      <p className="mt-3 text-center text-xs text-ink-400">
        Sin costo y sin compromiso. No compartimos tus datos con terceros.
      </p>
    </form>
  );
}
