"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { CANDIDATOS, INMUEBLES_PROPIETARIO } from "@/lib/demo";
import { ESTILOS_VEREDICTO, ETIQUETAS_VEREDICTO } from "@/lib/motorLocal";
import { formatoFecha } from "@/lib/format";

export default function CandidatosPropietarioPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-500">Cargando candidatos…</p>}>
      <Contenido />
    </Suspense>
  );
}

function Contenido() {
  const params = useSearchParams();
  const { toast } = useToast();
  const [inmuebleFiltro, setInmuebleFiltro] = useState(params.get("inmueble") ?? "todos");
  const [decididos, setDecididos] = useState<Record<string, "aceptado" | "descartado">>({});

  const visibles = useMemo(
    () => (inmuebleFiltro === "todos" ? CANDIDATOS : CANDIDATOS.filter((c) => c.inmueble_id === inmuebleFiltro)),
    [inmuebleFiltro]
  );

  function decidir(id: string, decision: "aceptado" | "descartado") {
    setDecididos((previo) => ({ ...previo, [id]: decision }));
    toast({
      type: decision === "aceptado" ? "success" : "info",
      title: decision === "aceptado" ? "Candidato aceptado" : "Candidato descartado",
      description:
        decision === "aceptado"
          ? "Avisamos al equipo para preparar el contrato y coordinar la firma."
          : "No se le notifica el motivo; el equipo comercial hace el cierre.",
    });
  }

  return (
    <div>
      <PageHeader
        titulo="Candidatos evaluados"
        descripcion="El resultado del estudio de cada persona que se postuló a tus inmuebles."
      />

      <div className="mb-6 rounded-xl2 border border-ink-100 bg-white p-4">
        <p className="text-sm text-ink-600">
          Ves el veredicto y los datos de convivencia. Los ingresos, el puntaje de central de riesgo y el historial
          financiero del candidato son información reservada y no se comparten.
        </p>
      </div>

      <div className="mb-6">
        <label htmlFor="inmueble" className="label-field">
          Filtrar por inmueble
        </label>
        <select
          id="inmueble"
          className="input-field sm:max-w-md"
          value={inmuebleFiltro}
          onChange={(e) => setInmuebleFiltro(e.target.value)}
        >
          <option value="todos">Todos los inmuebles</option>
          {INMUEBLES_PROPIETARIO.map((inmueble) => (
            <option key={inmueble.id} value={inmueble.id}>
              {inmueble.titulo}
            </option>
          ))}
        </select>
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          titulo="Sin candidatos evaluados"
          descripcion="Cuando alguien complete el estudio para este inmueble, verás aquí su veredicto."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibles.map((candidato) => {
            const inmueble = INMUEBLES_PROPIETARIO.find((i) => i.id === candidato.inmueble_id);
            const decision = decididos[candidato.id];
            const aprobado =
              candidato.veredicto === "aprobado" || candidato.veredicto === "aprobado_con_condiciones";

            return (
              <article key={candidato.id} className="rounded-xl2 bg-white p-5 shadow-card ring-1 ring-ink-900/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-ink-900">{candidato.nombre}</h2>
                    <p className="truncate text-xs text-ink-500">{inmueble?.titulo}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${ESTILOS_VEREDICTO[candidato.veredicto]}`}
                  >
                    {ETIQUETAS_VEREDICTO[candidato.veredicto]}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-ink-100 py-3">
                  <div>
                    <dt className="text-xs text-ink-400">Ocupantes</dt>
                    <dd className="text-sm font-semibold text-ink-800">{candidato.ocupantes || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-400">Mascotas</dt>
                    <dd className="text-sm font-semibold text-ink-800">{candidato.mascotas}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-400">Entrada deseada</dt>
                    <dd className="text-sm font-semibold text-ink-800">
                      {formatoFecha(candidato.fecha_deseada, { day: "numeric", month: "short" })}
                    </dd>
                  </div>
                </dl>

                {candidato.condiciones.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-ink-700">Condiciones exigidas por la política</p>
                    <ul className="mt-1.5 space-y-1">
                      {candidato.condiciones.map((c) => (
                        <li key={c} className="flex gap-2 text-xs text-ink-600">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-clay-500" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {decision ? (
                    <Badge tono={decision === "aceptado" ? "exito" : "neutro"}>
                      {decision === "aceptado" ? "Aceptado por ti" : "Descartado"}
                    </Badge>
                  ) : aprobado ? (
                    <>
                      <button
                        type="button"
                        onClick={() => decidir(candidato.id, "aceptado")}
                        className="rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-ink-700"
                      >
                        Aceptar candidato
                      </button>
                      <button
                        type="button"
                        onClick={() => decidir(candidato.id, "descartado")}
                        className="rounded-full border border-ink-300 px-4 py-2 text-xs font-semibold text-ink-700 transition hover:border-ink-500"
                      >
                        Descartar
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-ink-500">
                      {candidato.veredicto === "en_estudio"
                        ? "Un analista está revisando el caso; te avisamos cuando haya decisión."
                        : candidato.veredicto === "requiere_codeudor"
                          ? "El candidato debe agregar un codeudor para poder continuar."
                          : "Este candidato no cumple la política de arrendamiento."}
                    </p>
                  )}
                </div>

                <p className="mt-3 text-xs text-ink-400">
                  Evaluado el {new Date(candidato.evaluado_en).toLocaleDateString("es-CO")}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
