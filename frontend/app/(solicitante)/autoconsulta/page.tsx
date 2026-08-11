"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { cargarOCrear, guardar, PASOS, validarPaso } from "@/lib/autoconsulta";

/**
 * Punto de entrada de la autoconsulta. Siembra el preformulario cuando el usuario llega desde la
 * ficha de una propiedad y lo manda al primer paso que le falte por completar.
 */
export default function AutoconsultaEntradaPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <Redireccion />
    </Suspense>
  );
}

function Cargando() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-clay-500 border-t-transparent" />
      <p className="text-sm text-ink-500">Preparando tu autoconsulta…</p>
    </div>
  );
}

function Redireccion() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    let estado = cargarOCrear();

    const propiedadId = params.get("propiedad_id");
    const titulo = params.get("titulo");
    const canon = params.get("canon");
    const ciudad = params.get("ciudad");
    const tipo = params.get("tipo");

    if (propiedadId || titulo || canon || ciudad || tipo) {
      estado = guardar({
        ...estado,
        preformulario: {
          ...estado.preformulario,
          propiedad_id: propiedadId ?? estado.preformulario.propiedad_id,
          propiedad_titulo: titulo ?? estado.preformulario.propiedad_titulo,
          canon_deseado: canon ? Number(canon) : estado.preformulario.canon_deseado,
          ciudad: ciudad ?? estado.preformulario.ciudad,
          tipo_inmueble: tipo ?? estado.preformulario.tipo_inmueble,
        },
      });
    } else {
      estado = guardar(estado);
    }

    const pendiente = PASOS.find(
      (paso) => paso.numero < 8 && Object.keys(validarPaso(paso.numero, estado)).length > 0
    );
    router.replace(`/autoconsulta/${(pendiente ?? PASOS[PASOS.length - 1]).slug}`);
  }, [params, router]);

  return <Cargando />;
}
