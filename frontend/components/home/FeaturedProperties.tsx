import { listarPropiedades } from "@/lib/api";
import { PropertyCard } from "@/components/propiedad/PropertyCard";

export async function FeaturedProperties() {
  let propiedades: Awaited<ReturnType<typeof listarPropiedades>>["resultados"] = [];

  try {
    const resultado = await listarPropiedades({ orden: "relevancia", tamano_pagina: 8 });
    propiedades = resultado.resultados;
  } catch {
    propiedades = [];
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-ink-900 sm:text-4xl">Propiedades destacadas</h2>
          <p className="mt-2 text-ink-600">Con aprobación exprés disponible desde la misma ficha.</p>
        </div>
      </div>

      {propiedades.length === 0 ? (
        <p className="text-ink-500">
          No pudimos cargar propiedades en este momento. Verifica que la API esté corriendo en{" "}
          <code>NEXT_PUBLIC_API_URL</code>.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {propiedades.map((propiedad) => (
            <PropertyCard key={propiedad.id} propiedad={propiedad} />
          ))}
        </div>
      )}
    </section>
  );
}
