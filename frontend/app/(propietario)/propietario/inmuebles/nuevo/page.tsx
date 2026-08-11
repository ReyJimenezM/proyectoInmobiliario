"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Campo, claseInput } from "@/components/ui/Campo";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { CIUDADES_POR_SLUG } from "@/lib/ciudades";
import { formatoMoneda } from "@/lib/format";

const PASOS = [
  { titulo: "Ubicación y tipo", descripcion: "Dónde queda y qué clase de inmueble es." },
  { titulo: "Características y canon", descripcion: "Lo que verá el interesado en la ficha." },
  { titulo: "Fotos y condiciones", descripcion: "Imágenes, reglas de convivencia y disponibilidad." },
  { titulo: "Revisión", descripcion: "Confirma antes de enviar a publicación." },
];

const TIPOS = ["Apartamento", "Casa", "Apartaestudio", "Local comercial", "Oficina", "Bodega"];

interface Formulario {
  tipo: string;
  ciudad: string;
  barrio: string;
  direccion: string;
  titulo: string;
  descripcion: string;
  area: string;
  habitaciones: string;
  banos: string;
  parqueaderos: string;
  estrato: string;
  canon: string;
  administracion: string;
  incluye_administracion: boolean;
  acepta_mascotas: boolean;
  amoblado: boolean;
  disponible_desde: string;
  fotos: string[];
}

const INICIAL: Formulario = {
  tipo: "",
  ciudad: "",
  barrio: "",
  direccion: "",
  titulo: "",
  descripcion: "",
  area: "",
  habitaciones: "",
  banos: "",
  parqueaderos: "",
  estrato: "",
  canon: "",
  administracion: "",
  incluye_administracion: false,
  acepta_mascotas: false,
  amoblado: false,
  disponible_desde: "",
  fotos: [],
};

function validar(paso: number, f: Formulario): Record<string, string> {
  const e: Record<string, string> = {};
  if (paso === 0) {
    if (!f.tipo) e.tipo = "Selecciona el tipo de inmueble.";
    if (!f.ciudad) e.ciudad = "Selecciona la ciudad.";
    if (!f.direccion.trim()) e.direccion = "Necesitamos la dirección para ubicar el inmueble.";
  }
  if (paso === 1) {
    if (!f.titulo.trim()) e.titulo = "Ponle un título al aviso.";
    if (!f.area) e.area = "Indica el área en metros cuadrados.";
    if (!f.canon) e.canon = "Indica el canon mensual.";
    if (!f.banos) e.banos = "Indica cuántos baños tiene.";
  }
  if (paso === 2) {
    if (f.fotos.length === 0) e.fotos = "Sube al menos una foto: los avisos con fotos reciben muchos más interesados.";
    if (!f.disponible_desde) e.disponible_desde = "Indica desde cuándo está disponible.";
  }
  return e;
}

export default function PublicarInmueblePage() {
  const router = useRouter();
  const { toast } = useToast();
  const inputFotos = useRef<HTMLInputElement>(null);

  const [paso, setPaso] = useState(0);
  const [f, setF] = useState<Formulario>(INICIAL);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const set = (cambios: Partial<Formulario>) => setF((previo) => ({ ...previo, ...cambios }));

  function siguiente() {
    const encontrados = validar(paso, f);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
  }

  function publicar() {
    setEnviando(true);
    // Sin endpoint de publicación todavía: se simula el envío a moderación, que es el estado
    // real en el que queda un aviso nuevo antes de salir a la vitrina.
    window.setTimeout(() => {
      toast({
        type: "success",
        title: "Inmueble enviado a revisión",
        description: "Nuestro equipo lo valida y queda publicado en menos de 24 horas hábiles.",
      });
      router.push("/propietario/inmuebles");
    }, 800);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Publicar un inmueble" descripcion="Cuatro pasos y tu aviso entra a revisión." />

      {/* Progreso */}
      <ol className="mb-8 grid grid-cols-4 gap-2">
        {PASOS.map((p, i) => (
          <li key={p.titulo}>
            <div className={`h-1.5 rounded-full ${i <= paso ? "bg-clay-500" : "bg-ink-100"}`} />
            <p className={`mt-2 text-xs font-medium ${i === paso ? "text-ink-900" : "text-ink-400"}`}>{p.titulo}</p>
          </li>
        ))}
      </ol>

      <div className="card p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-ink-900">{PASOS[paso].titulo}</h2>
        <p className="mt-1 text-sm text-ink-500">{PASOS[paso].descripcion}</p>

        <div className="mt-6 space-y-5">
          {paso === 0 && (
            <>
              <Campo id="tipo" etiqueta="Tipo de inmueble" obligatorio error={errores.tipo}>
                <div className="mt-1 grid gap-2 sm:grid-cols-3">
                  {TIPOS.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => set({ tipo })}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                        f.tipo === tipo
                          ? "border-ink-800 bg-ink-900 text-white"
                          : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </Campo>

              <div className="grid gap-5 sm:grid-cols-2">
                <Campo id="ciudad" etiqueta="Ciudad" obligatorio error={errores.ciudad}>
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

                <Campo id="barrio" etiqueta="Barrio o zona">
                  <input id="barrio" className="input-field" value={f.barrio} onChange={(e) => set({ barrio: e.target.value })} />
                </Campo>
              </div>

              <Campo
                id="direccion"
                etiqueta="Dirección"
                obligatorio
                error={errores.direccion}
                ayuda="No se muestra públicamente: solo la usamos para ubicar el inmueble en el mapa."
              >
                <input
                  id="direccion"
                  className={claseInput(errores.direccion)}
                  value={f.direccion}
                  onChange={(e) => set({ direccion: e.target.value })}
                  placeholder="Cra 76 #40-22, apto 302"
                />
              </Campo>
            </>
          )}

          {paso === 1 && (
            <>
              <Campo id="titulo" etiqueta="Título del aviso" obligatorio error={errores.titulo}>
                <input
                  id="titulo"
                  className={claseInput(errores.titulo)}
                  value={f.titulo}
                  onChange={(e) => set({ titulo: e.target.value })}
                  placeholder="Apartamento luminoso de 2 habitaciones en Laureles"
                />
              </Campo>

              <Campo id="descripcion" etiqueta="Descripción">
                <textarea
                  id="descripcion"
                  rows={4}
                  className="input-field"
                  value={f.descripcion}
                  onChange={(e) => set({ descripcion: e.target.value })}
                  placeholder="Cuenta lo que hace especial al inmueble: iluminación, cercanías, remodelaciones…"
                />
              </Campo>

              <div className="grid gap-5 sm:grid-cols-3">
                <Campo id="area" etiqueta="Área (m²)" obligatorio error={errores.area}>
                  <input id="area" type="number" min={1} className={claseInput(errores.area)} value={f.area} onChange={(e) => set({ area: e.target.value })} />
                </Campo>
                <Campo id="habitaciones" etiqueta="Habitaciones">
                  <input id="habitaciones" type="number" min={0} className="input-field" value={f.habitaciones} onChange={(e) => set({ habitaciones: e.target.value })} />
                </Campo>
                <Campo id="banos" etiqueta="Baños" obligatorio error={errores.banos}>
                  <input id="banos" type="number" min={1} className={claseInput(errores.banos)} value={f.banos} onChange={(e) => set({ banos: e.target.value })} />
                </Campo>
                <Campo id="parqueaderos" etiqueta="Parqueaderos">
                  <input id="parqueaderos" type="number" min={0} className="input-field" value={f.parqueaderos} onChange={(e) => set({ parqueaderos: e.target.value })} />
                </Campo>
                <Campo id="estrato" etiqueta="Estrato">
                  <input id="estrato" type="number" min={1} max={6} className="input-field" value={f.estrato} onChange={(e) => set({ estrato: e.target.value })} />
                </Campo>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Campo
                  id="canon"
                  etiqueta="Canon mensual"
                  obligatorio
                  error={errores.canon}
                  ayuda={f.canon ? formatoMoneda(Number(f.canon)) : undefined}
                >
                  <input id="canon" type="number" min={0} step={50000} className={claseInput(errores.canon)} value={f.canon} onChange={(e) => set({ canon: e.target.value })} />
                </Campo>
                <Campo id="administracion" etiqueta="Administración">
                  <input id="administracion" type="number" min={0} step={10000} className="input-field" value={f.administracion} onChange={(e) => set({ administracion: e.target.value })} />
                </Campo>
              </div>

              <label className="flex items-center gap-3 text-sm text-ink-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-ink-300 text-clay-600 focus:ring-clay-500"
                  checked={f.incluye_administracion}
                  onChange={(e) => set({ incluye_administracion: e.target.checked })}
                />
                El canon ya incluye la administración
              </label>
            </>
          )}

          {paso === 2 && (
            <>
              <Campo id="fotos" etiqueta="Fotos del inmueble" obligatorio error={errores.fotos}>
                <div className="mt-1 flex flex-wrap gap-3">
                  {f.fotos.map((nombre, i) => (
                    <span
                      key={`${nombre}-${i}`}
                      className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-700"
                    >
                      {nombre}
                      <button
                        type="button"
                        onClick={() => set({ fotos: f.fotos.filter((_, idx) => idx !== i) })}
                        className="text-ink-400 hover:text-rose-600"
                        aria-label={`Quitar ${nombre}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => inputFotos.current?.click()}
                    className="rounded-lg border border-dashed border-ink-300 px-4 py-2 text-xs font-semibold text-ink-600 transition hover:border-ink-500"
                  >
                    + Agregar fotos
                  </button>
                </div>
                <input
                  ref={inputFotos}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    const nombres = Array.from(e.target.files ?? []).map((archivo) => archivo.name);
                    set({ fotos: [...f.fotos, ...nombres] });
                    e.target.value = "";
                  }}
                />
              </Campo>

              <Campo id="disponible_desde" etiqueta="Disponible desde" obligatorio error={errores.disponible_desde}>
                <input
                  id="disponible_desde"
                  type="date"
                  className={claseInput(errores.disponible_desde)}
                  value={f.disponible_desde}
                  onChange={(e) => set({ disponible_desde: e.target.value })}
                />
              </Campo>

              <fieldset className="rounded-xl2 border border-ink-100 p-5">
                <legend className="px-2 text-sm font-semibold text-ink-800">Condiciones</legend>
                <p className="mb-3 text-xs text-ink-500">
                  Estas reglas filtran candidatos por convivencia, no por riesgo financiero.
                </p>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-ink-300 text-clay-600 focus:ring-clay-500"
                      checked={f.acepta_mascotas}
                      onChange={(e) => set({ acepta_mascotas: e.target.checked })}
                    />
                    Acepto mascotas
                  </label>
                  <label className="flex items-center gap-3 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-ink-300 text-clay-600 focus:ring-clay-500"
                      checked={f.amoblado}
                      onChange={(e) => set({ amoblado: e.target.checked })}
                    />
                    Se entrega amoblado
                  </label>
                </div>
              </fieldset>
            </>
          )}

          {paso === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl2 bg-sand-100 p-5">
                <Badge tono="alerta">Pendiente de revisión</Badge>
                <p className="mt-3 text-lg font-semibold text-ink-900">{f.titulo || "Sin título"}</p>
                <p className="text-sm text-ink-500">
                  {f.tipo} · {f.barrio ? `${f.barrio}, ` : ""}
                  {f.ciudad}
                </p>
                <p className="mt-3 text-2xl font-semibold text-ink-900">
                  {f.canon ? formatoMoneda(Number(f.canon)) : "—"}
                  <span className="ml-1 text-sm font-normal text-ink-400">/ mes</span>
                </p>
                {f.administracion && !f.incluye_administracion && (
                  <p className="text-xs text-ink-500">+ {formatoMoneda(Number(f.administracion))} de administración</p>
                )}
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Dirección", f.direccion || "—"],
                  ["Área", f.area ? `${f.area} m²` : "—"],
                  ["Habitaciones", f.habitaciones || "—"],
                  ["Baños", f.banos || "—"],
                  ["Parqueaderos", f.parqueaderos || "0"],
                  ["Estrato", f.estrato || "—"],
                  ["Disponible desde", f.disponible_desde || "—"],
                  ["Fotos cargadas", String(f.fotos.length)],
                  ["Mascotas", f.acepta_mascotas ? "Permitidas" : "No permitidas"],
                  ["Amoblado", f.amoblado ? "Sí" : "No"],
                ].map(([etiqueta, valor]) => (
                  <div key={etiqueta} className="flex justify-between gap-3 border-b border-ink-100 pb-2">
                    <dt className="text-sm text-ink-500">{etiqueta}</dt>
                    <dd className="text-sm font-medium text-ink-900">{valor}</dd>
                  </div>
                ))}
              </dl>

              <p className="text-xs text-ink-500">
                Al publicar aceptas que verifiquemos la titularidad del inmueble antes de sacarlo a la vitrina.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-6">
          {paso > 0 ? (
            <button
              type="button"
              onClick={() => setPaso((p) => p - 1)}
              className="text-sm font-medium text-ink-500 transition hover:text-ink-900"
            >
              ← Paso anterior
            </button>
          ) : (
            <span />
          )}

          {paso < PASOS.length - 1 ? (
            <button type="button" onClick={siguiente} className="btn-primary">
              Continuar
            </button>
          ) : (
            <button type="button" onClick={publicar} disabled={enviando} className="btn-primary">
              {enviando ? "Enviando…" : "Enviar a revisión"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
