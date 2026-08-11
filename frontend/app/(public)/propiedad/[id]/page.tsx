import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerPropiedad } from "@/lib/api";
import { ETIQUETAS_OPERACION, ETIQUETAS_TIPO_PROPIEDAD, formatoArea, formatoMoneda } from "@/lib/format";
import { Gallery } from "@/components/propiedad/Gallery";
import { SimuladorWidget } from "@/components/simulador/SimuladorWidget";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  try {
    const propiedad = await obtenerPropiedad(params.id);
    return {
      title: `${propiedad.titulo} | Raíz`,
      description: propiedad.descripcion.slice(0, 160),
    };
  } catch {
    return { title: "Propiedad | Raíz" };
  }
}

const CARACTERISTICAS_LABELS: Record<string, (p: Awaited<ReturnType<typeof obtenerPropiedad>>) => string | null> = {
  Área: (p) => formatoArea(p.area_m2),
  Habitaciones: (p) => String(p.habitaciones),
  Baños: (p) => String(p.banos),
  Parqueaderos: (p) => String(p.parqueaderos),
  Estrato: (p) => (p.estrato ? String(p.estrato) : null),
  Administración: (p) => (p.valor_admin ? formatoMoneda(p.valor_admin) : null),
};

export default async function PropiedadPage(props: PageProps) {
  const params = await props.params;
  let propiedad;
  try {
    propiedad = await obtenerPropiedad(params.id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-ink-500">
        {ETIQUETAS_OPERACION[propiedad.operacion]} · {ETIQUETAS_TIPO_PROPIEDAD[propiedad.tipo]} · {propiedad.ciudad}
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <Gallery imagenes={propiedad.imagenes} titulo={propiedad.titulo} />

          <div className="mt-8">
            <h1 className="text-2xl font-semibold text-ink-900 sm:text-3xl">{propiedad.titulo}</h1>
            <p className="mt-1 text-ink-500">
              {propiedad.direccion ?? propiedad.barrio}, {propiedad.ciudad}
            </p>
            <p className="mt-4 font-display text-3xl font-semibold text-ink-900">
              {formatoMoneda(propiedad.precio)}
              {propiedad.operacion === "arriendo" && <span className="text-base font-normal text-ink-500">/mes</span>}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 border-y border-ink-100 py-6 sm:grid-cols-3">
              {Object.entries(CARACTERISTICAS_LABELS).map(([label, fn]) => {
                const valor = fn(propiedad);
                if (!valor) return null;
                return (
                  <div key={label}>
                    <p className="text-xs uppercase tracking-wide text-ink-400">{label}</p>
                    <p className="mt-1 font-semibold text-ink-900">{valor}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-ink-900">Descripción</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-700">{propiedad.descripcion}</p>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-ink-900">Ubicación</h2>
              <div className="mt-3 flex h-64 items-center justify-center rounded-xl2 bg-ink-100 text-sm text-ink-400">
                Mapa simulado — {propiedad.barrio}, {propiedad.ciudad}
              </div>
            </div>

            <div className="mt-8 rounded-xl2 border border-ink-100 p-5">
              <p className="text-xs uppercase tracking-wide text-ink-400">Anunciado por</p>
              <p className="mt-1 font-semibold text-ink-900">{propiedad.anunciante.nombre}</p>
              <p className="text-sm capitalize text-ink-500">{propiedad.anunciante.tipo}</p>
              {propiedad.anunciante.telefono_contacto && (
                <a href={`tel:${propiedad.anunciante.telefono_contacto}`} className="btn-secondary mt-4 inline-flex">
                  Contactar anunciante
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          {propiedad.simulador_activo ? (
            <SimuladorWidget propiedad={propiedad} />
          ) : (
            <div className="card p-6 text-sm text-ink-500">
              Esta propiedad no tiene el simulador de crédito activado.
            </div>
          )}

          {/* Para arriendo, el simulador es el gancho gratuito y la autoconsulta es el estudio
              completo: el paso donde se cobra y se consulta la central de riesgo. */}
          {propiedad.operacion === "arriendo" && (
            <div className="card p-6">
              <h2 className="font-display text-lg font-semibold text-ink-900">¿Calificas para arrendarlo?</h2>
              <p className="mt-1.5 text-sm text-ink-500">
                Haz el estudio completo en minutos y recibe tu resultado con explicación: aprobado, aprobado con
                condiciones, en estudio o con codeudor.
              </p>
              <Link
                href={{
                  pathname: "/autoconsulta",
                  query: {
                    propiedad_id: propiedad.id,
                    titulo: propiedad.titulo,
                    canon: propiedad.precio,
                    ciudad: propiedad.ciudad,
                    tipo: ETIQUETAS_TIPO_PROPIEDAD[propiedad.tipo] ?? propiedad.tipo,
                  },
                }}
                className="btn-primary mt-4 w-full"
              >
                Consulta si calificas
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
