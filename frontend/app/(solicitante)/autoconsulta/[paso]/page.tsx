"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProgresoAutoconsulta } from "@/components/autoconsulta/ProgresoAutoconsulta";
import { PasoInicio } from "@/components/autoconsulta/PasoInicio";
import { PasoPersonales } from "@/components/autoconsulta/PasoPersonales";
import { PasoVivienda } from "@/components/autoconsulta/PasoVivienda";
import { PasoEconomica } from "@/components/autoconsulta/PasoEconomica";
import { PasoReferencias } from "@/components/autoconsulta/PasoReferencias";
import { PasoAutorizaciones } from "@/components/autoconsulta/PasoAutorizaciones";
import { PasoDocumentos } from "@/components/autoconsulta/PasoDocumentos";
import { PasoPago } from "@/components/autoconsulta/PasoPago";
import { PasoResultado } from "@/components/autoconsulta/PasoResultado";
import { useToast } from "@/components/ui/Toast";
import {
  cargarOCrear,
  guardar,
  limpiar,
  PASOS,
  pasoPorSlug,
  porcentajeCompletado,
  validarPaso,
  type ErroresPaso,
  type EstadoAutoconsulta,
} from "@/lib/autoconsulta";

const COMPONENTES = [
  PasoInicio,
  PasoPersonales,
  PasoVivienda,
  PasoEconomica,
  PasoReferencias,
  PasoAutorizaciones,
  PasoDocumentos,
  PasoPago,
  PasoResultado,
];

export default function PasoAutoconsultaPage({ params }: { params: { paso: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const definicion = pasoPorSlug(params.paso);

  /* El estado vive en localStorage, así que solo se carga en el cliente: inicializarlo durante el
     render del servidor produciría un código de solicitud distinto en cada lado. */
  const [estado, setEstado] = useState<EstadoAutoconsulta | null>(null);
  const [errores, setErrores] = useState<ErroresPaso>({});
  const [intentoEnvio, setIntentoEnvio] = useState(false);

  useEffect(() => {
    setEstado(cargarOCrear());
  }, []);

  const actualizar = useCallback((cambios: Partial<EstadoAutoconsulta>) => {
    setEstado((previo) => (previo ? guardar({ ...previo, ...cambios }) : previo));
  }, []);

  /* Revalida en vivo una vez el usuario ya intentó avanzar, para que los errores desaparezcan
     a medida que los corrige en lugar de esperar al siguiente clic. */
  useEffect(() => {
    if (!estado || !definicion || !intentoEnvio) return;
    setErrores(validarPaso(definicion.numero, estado));
  }, [estado, definicion, intentoEnvio]);

  useEffect(() => {
    setErrores({});
    setIntentoEnvio(false);
  }, [params.paso]);

  const pasoMaximo = useMemo(() => {
    if (!estado) return 0;
    const pendiente = PASOS.find((p) => p.numero < 8 && Object.keys(validarPaso(p.numero, estado)).length > 0);
    return pendiente ? pendiente.numero : 8;
  }, [estado]);

  if (!definicion) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="text-sm text-ink-600">Ese paso no existe.</p>
        <Link href="/autoconsulta" className="btn-primary mt-6">
          Volver al inicio de la autoconsulta
        </Link>
      </div>
    );
  }

  if (!estado) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-clay-500 border-t-transparent" />
        <p className="text-sm text-ink-500">Recuperando tu avance…</p>
      </div>
    );
  }

  const numero = definicion.numero;
  const Componente = COMPONENTES[numero];
  const esUltimo = numero === PASOS.length - 1;

  function continuar() {
    if (!estado) return;
    setIntentoEnvio(true);
    const encontrados = validarPaso(numero, estado);
    setErrores(encontrados);

    if (Object.keys(encontrados).length > 0) {
      toast({
        type: "error",
        title: "Faltan datos en este paso",
        description: "Revisa los campos marcados en rojo para poder continuar.",
      });
      const primero = document.getElementById(Object.keys(encontrados)[0]);
      primero?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    actualizar({ paso_maximo: Math.max(estado.paso_maximo, numero + 1) });
    router.push(`/autoconsulta/${PASOS[numero + 1].slug}`);
  }

  function empezarDeNuevo() {
    if (!window.confirm("Se borrará el avance guardado en este dispositivo. ¿Continuar?")) return;
    limpiar();
    setEstado(cargarOCrear());
    router.push("/autoconsulta/inicio");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <ProgresoAutoconsulta pasoActual={numero} pasoMaximo={pasoMaximo} />

      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-ink-900">{definicion.titulo}</h1>
        <p className="mt-1 text-sm text-ink-500">{definicion.descripcion}</p>

        <div className="mt-7">
          <Componente estado={estado} actualizar={actualizar} errores={errores} />
        </div>

        {!esUltimo && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-6">
            {numero > 0 ? (
              <button
                type="button"
                onClick={() => router.push(`/autoconsulta/${PASOS[numero - 1].slug}`)}
                className="text-sm font-medium text-ink-500 transition hover:text-ink-900"
              >
                ← Paso anterior
              </button>
            ) : (
              <span />
            )}

            <button type="button" onClick={continuar} className="btn-primary">
              {numero === 6 ? "Ir al pago" : numero === 7 ? "Ver mi resultado" : "Continuar"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-400">
        <span>
          Avance guardado · {porcentajeCompletado(estado)}% completado · código{" "}
          <span className="font-mono font-semibold text-ink-600">{estado.codigo}</span>
        </span>
        <button type="button" onClick={empezarDeNuevo} className="font-semibold text-ink-500 hover:text-rose-600">
          Empezar de nuevo
        </button>
      </div>
    </div>
  );
}
