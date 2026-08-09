import Image from "next/image";
import Link from "next/link";
import type { PropiedadListItem } from "@/lib/types";
import { ETIQUETAS_OPERACION, ETIQUETAS_TIPO_PROPIEDAD, formatoArea, formatoMoneda } from "@/lib/format";

export function PropertyCard({ propiedad }: { propiedad: PropiedadListItem }) {
  return (
    <div className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/propiedad/${propiedad.id}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100">
          {propiedad.imagen_principal ? (
            <Image
              src={propiedad.imagen_principal}
              alt={propiedad.titulo}
              fill
              unoptimized
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-300">Sin imagen</div>
          )}

          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink-800">
            {ETIQUETAS_OPERACION[propiedad.operacion]}
          </span>

          {propiedad.simulador_activo && (
            <span className="badge-express absolute bottom-3 left-3">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> Aprobación exprés disponible
            </span>
          )}
        </div>

        <div className="p-4">
          <p className="font-display text-lg font-semibold text-ink-900">{formatoMoneda(propiedad.precio)}</p>
          <p className="mt-1 truncate text-sm text-ink-600">
            {ETIQUETAS_TIPO_PROPIEDAD[propiedad.tipo]} en {propiedad.barrio ?? propiedad.zona}, {propiedad.ciudad}
          </p>
          <div className="mt-3 flex items-center gap-4 text-sm text-ink-500">
            <span>{formatoArea(propiedad.area_m2)}</span>
            <span>{propiedad.habitaciones} hab.</span>
            <span>{propiedad.banos} baños</span>
          </div>
        </div>
      </Link>

      <div className="border-t border-ink-100 px-4 py-3">
        <Link
          href={`/propiedad/${propiedad.id}?ir_a=simulador`}
          className="text-sm font-semibold text-clay-600 hover:text-clay-700"
        >
          Simular crédito →
        </Link>
      </div>
    </div>
  );
}
