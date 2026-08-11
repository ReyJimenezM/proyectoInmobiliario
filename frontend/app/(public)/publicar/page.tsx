"use client";

import Link from "next/link";
import { useState } from "react";
import { Campo, claseInput } from "@/components/ui/Campo";
import { useToast } from "@/components/ui/Toast";
import { CIUDADES_POR_SLUG } from "@/lib/ciudades";

const BENEFICIOS = [
  {
    titulo: "Estudiamos a cada candidato",
    detalle:
      "Consulta a central de riesgo, verificación de ingresos y referencia del arrendador anterior. Tú recibes el veredicto, no el papeleo.",
  },
  {
    titulo: "Publicación en minutos",
    detalle: "Subes fotos y datos, nuestro equipo valida la titularidad y el aviso sale a la vitrina.",
  },
  {
    titulo: "Decides tú",
    detalle: "Ves los candidatos aprobados con sus datos de convivencia y eliges con quién firmar.",
  },
  {
    titulo: "Contrato y firma electrónica",
    detalle: "Generamos el contrato conforme a la Ley 820 de 2003 y coordinamos la firma de las tres partes.",
  },
];

const PASOS = [
  { numero: "01", titulo: "Cuéntanos del inmueble", detalle: "Déjanos tus datos y te llamamos el mismo día hábil." },
  { numero: "02", titulo: "Validamos y publicamos", detalle: "Verificamos titularidad y documentos, y armamos el aviso." },
  { numero: "03", titulo: "Filtramos candidatos", detalle: "Cada interesado pasa por el estudio de arrendamiento." },
  { numero: "04", titulo: "Firmas y entregas", detalle: "Contrato, firma electrónica y entrega del inmueble." },
];

interface Formulario {
  nombre: string;
  telefono: string;
  correo: string;
  ciudad: string;
  tipo: string;
  canon: string;
  cantidad: string;
  autoriza: boolean;
}

const INICIAL: Formulario = {
  nombre: "",
  telefono: "",
  correo: "",
  ciudad: "",
  tipo: "",
  canon: "",
  cantidad: "1",
  autoriza: false,
};

export default function PublicarPage() {
  const { toast } = useToast();
  const [f, setF] = useState<Formulario>(INICIAL);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviado, setEnviado] = useState(false);

  const set = (cambios: Partial<Formulario>) => setF((previo) => ({ ...previo, ...cambios }));

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const encontrados: Record<string, string> = {};
    if (!f.nombre.trim()) encontrados.nombre = "Dinos cómo te llamas.";
    if (!/^3\d{9}$/.test(f.telefono)) encontrados.telefono = "Escribe un celular de 10 dígitos.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo)) encontrados.correo = "Revisa el formato del correo.";
    if (!f.ciudad) encontrados.ciudad = "Selecciona la ciudad del inmueble.";
    if (!f.autoriza) encontrados.autoriza = "Necesitamos tu autorización para contactarte.";

    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setEnviado(true);
    toast({
      type: "success",
      title: "Recibimos tus datos",
      description: "Un asesor te contacta hoy mismo en horario hábil.",
    });
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-ink-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-clay-200 ring-1 ring-white/15">
              Para propietarios
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-tight sm:text-5xl">
              Arrienda tu inmueble sin cargar con el riesgo
            </h1>
            <p className="mt-4 max-w-lg text-lg text-ink-200">
              Publicamos tu inmueble, estudiamos a cada candidato con central de riesgo y te presentamos solo a quienes
              pasan la política de arrendamiento.
            </p>

            <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
              <div>
                <dt className="text-xs text-ink-300">Respuesta del estudio</dt>
                <dd className="mt-1 text-2xl font-semibold">24 h</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-300">Candidatos filtrados</dt>
                <dd className="mt-1 text-2xl font-semibold">100%</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-300">Ciudades</dt>
                <dd className="mt-1 text-2xl font-semibold">{Object.keys(CIUDADES_POR_SLUG).length}</dd>
              </div>
            </dl>
          </div>

          {/* Formulario de contacto */}
          <div className="rounded-xl2 bg-white p-6 text-ink-900 shadow-card sm:p-8">
            {enviado ? (
              <div className="py-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                    <path d="M7 14.5l4.5 4.5L21 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <h2 className="mt-5 font-display text-2xl font-semibold">Gracias, {f.nombre.split(" ")[0]}</h2>
                <p className="mt-2 text-sm text-ink-500">
                  Un asesor te contacta al {f.telefono} en horario hábil para revisar los documentos del inmueble.
                </p>
                <Link href="/propietario" className="btn-primary mt-6">
                  Entrar al portal del propietario
                </Link>
              </div>
            ) : (
              <form onSubmit={enviar} noValidate>
                <h2 className="font-display text-2xl font-semibold">Cuéntanos de tu inmueble</h2>
                <p className="mt-1 text-sm text-ink-500">Te llamamos el mismo día hábil.</p>

                <div className="mt-6 space-y-4">
                  <Campo id="nombre" etiqueta="Nombre completo" obligatorio error={errores.nombre}>
                    <input
                      id="nombre"
                      className={claseInput(errores.nombre)}
                      value={f.nombre}
                      onChange={(e) => set({ nombre: e.target.value })}
                    />
                  </Campo>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Campo id="telefono" etiqueta="Celular" obligatorio error={errores.telefono}>
                      <input
                        id="telefono"
                        inputMode="tel"
                        className={claseInput(errores.telefono)}
                        value={f.telefono}
                        onChange={(e) => set({ telefono: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        placeholder="3001234567"
                      />
                    </Campo>
                    <Campo id="correo" etiqueta="Correo" obligatorio error={errores.correo}>
                      <input
                        id="correo"
                        type="email"
                        className={claseInput(errores.correo)}
                        value={f.correo}
                        onChange={(e) => set({ correo: e.target.value })}
                      />
                    </Campo>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Campo id="ciudad" etiqueta="Ciudad del inmueble" obligatorio error={errores.ciudad}>
                      <select
                        id="ciudad"
                        className={claseInput(errores.ciudad)}
                        value={f.ciudad}
                        onChange={(e) => set({ ciudad: e.target.value })}
                      >
                        <option value="">Selecciona…</option>
                        {Object.entries(CIUDADES_POR_SLUG).map(([slug, nombre]) => (
                          <option key={slug} value={nombre}>
                            {nombre}
                          </option>
                        ))}
                      </select>
                    </Campo>
                    <Campo id="tipo" etiqueta="Tipo de inmueble">
                      <select id="tipo" className="input-field" value={f.tipo} onChange={(e) => set({ tipo: e.target.value })}>
                        <option value="">Selecciona…</option>
                        {["Apartamento", "Casa", "Apartaestudio", "Local", "Oficina", "Bodega"].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </Campo>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Campo id="canon" etiqueta="Canon esperado">
                      <input
                        id="canon"
                        type="number"
                        min={0}
                        step={50000}
                        className="input-field"
                        value={f.canon}
                        onChange={(e) => set({ canon: e.target.value })}
                      />
                    </Campo>
                    <Campo id="cantidad" etiqueta="¿Cuántos inmuebles?">
                      <select id="cantidad" className="input-field" value={f.cantidad} onChange={(e) => set({ cantidad: e.target.value })}>
                        <option value="1">1</option>
                        <option value="2-5">Entre 2 y 5</option>
                        <option value="6+">Más de 5</option>
                      </select>
                    </Campo>
                  </div>

                  <div>
                    <label className="flex items-start gap-3 text-sm text-ink-600">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 rounded border-ink-300 text-clay-600 focus:ring-clay-500"
                        checked={f.autoriza}
                        onChange={(e) => set({ autoriza: e.target.checked })}
                      />
                      Autorizo el tratamiento de mis datos para ser contactado sobre este servicio (Ley 1581 de 2012).
                    </label>
                    {errores.autoriza && (
                      <p role="alert" className="mt-1 text-xs font-medium text-rose-600">
                        {errores.autoriza}
                      </p>
                    )}
                  </div>

                  <button type="submit" className="btn-primary w-full">
                    Quiero que me contacten
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold text-ink-900">Qué hacemos por ti</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {BENEFICIOS.map((beneficio) => (
            <div key={beneficio.titulo} className="rounded-xl2 bg-white p-6 shadow-card ring-1 ring-ink-900/5">
              <h3 className="text-lg font-semibold text-ink-900">{beneficio.titulo}</h3>
              <p className="mt-2 text-sm text-ink-500">{beneficio.detalle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink-900">Cómo funciona</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map((paso) => (
              <li key={paso.numero}>
                <span className="font-display text-3xl font-semibold text-clay-500">{paso.numero}</span>
                <h3 className="mt-3 text-base font-semibold text-ink-900">{paso.titulo}</h3>
                <p className="mt-1.5 text-sm text-ink-500">{paso.detalle}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
