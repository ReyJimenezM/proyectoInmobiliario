import type { Metadata } from "next";
import { listarPropiedades } from "@/lib/api";
import { nombreCiudadDesdeSlug } from "@/lib/ciudades";
import { ETIQUETAS_OPERACION, ETIQUETAS_TIPO_PROPIEDAD } from "@/lib/format";
import { PropertyCard } from "@/components/propiedad/PropertyCard";
import { FilterSidebar } from "@/components/listados/FilterSidebar";
import { SortSelect } from "@/components/listados/SortSelect";
import { Pagination } from "@/components/listados/Pagination";
import type { Operacion, TipoPropiedad } from "@/lib/types";

interface PageProps {
  params: { operacion: string; tipo: string; ciudad: string; barrio?: string[] };
  searchParams: Record<string, string | undefined>;
}

export function generateMetadata({ params }: PageProps): Metadata {
  const ciudad = nombreCiudadDesdeSlug(params.ciudad);
  const tipo = ETIQUETAS_TIPO_PROPIEDAD[params.tipo] ?? params.tipo;
  const operacion = ETIQUETAS_OPERACION[params.operacion] ?? params.operacion;
  return {
    title: `${tipo} en ${operacion.toLowerCase()} en ${ciudad} | Raíz`,
    description: `Encuentra ${tipo.toLowerCase()}s en ${operacion.toLowerCase()} en ${ciudad}, con simulador de crédito integrado.`,
  };
}

export default async function ListadoPage({ params, searchParams }: PageProps) {
  const ciudad = nombreCiudadDesdeSlug(params.ciudad);
  const barrio = params.barrio?.[0];
  const pagina = Number(searchParams.pagina ?? "1");

  const resultado = await listarPropiedades({
    operacion: params.operacion as Operacion,
    tipo: params.tipo as TipoPropiedad,
    ciudad,
    barrio,
    precio_min: searchParams.precio_min ? Number(searchParams.precio_min) : undefined,
    precio_max: searchParams.precio_max ? Number(searchParams.precio_max) : undefined,
    area_min: searchParams.area_min ? Number(searchParams.area_min) : undefined,
    habitaciones_min: searchParams.habitaciones_min ? Number(searchParams.habitaciones_min) : undefined,
    banos_min: searchParams.banos_min ? Number(searchParams.banos_min) : undefined,
    orden: (searchParams.orden as any) ?? "relevancia",
    pagina,
    tamano_pagina: 12,
  });

  const pathname = `/${params.operacion}/${params.tipo}/${params.ciudad}${barrio ? `/${barrio}` : ""}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 sm:text-3xl">
          {ETIQUETAS_TIPO_PROPIEDAD[params.tipo] ?? "Propiedades"} en{" "}
          {ETIQUETAS_OPERACION[params.operacion]?.toLowerCase() ?? params.operacion} en {ciudad}
        </h1>
        <p className="mt-1 text-sm text-ink-500">{resultado.total} resultados</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <FilterSidebar />

        <div>
          <div className="mb-6 flex items-center justify-end">
            <SortSelect />
          </div>

          {resultado.resultados.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-ink-500">
              No encontramos propiedades con esos filtros. Intenta ampliar el rango de precio o área.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {resultado.resultados.map((propiedad) => (
                <PropertyCard key={propiedad.id} propiedad={propiedad} />
              ))}
            </div>
          )}

          <Pagination
            pathname={pathname}
            searchParams={searchParams}
            paginaActual={resultado.pagina}
            totalPaginas={resultado.total_paginas}
          />
        </div>
      </div>
    </div>
  );
}
