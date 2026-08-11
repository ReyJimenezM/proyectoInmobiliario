"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { CANDIDATOS, ETIQUETAS_ESTADO_INMUEBLE, INMUEBLES_PROPIETARIO, LEADS } from "@/lib/demo";
import { ESTILOS_VEREDICTO, ETIQUETAS_VEREDICTO } from "@/lib/motorLocal";
import { formatoMoneda } from "@/lib/format";

export default function ResumenPropietarioPage() {
  const inmuebles = INMUEBLES_PROPIETARIO;
  const arrendados = inmuebles.filter((i) => i.estado === "arrendado").length;
  const disponibles = inmuebles.filter((i) => i.estado === "disponible").length;
  const ocupacion = inmuebles.length > 0 ? Math.round((arrendados / inmuebles.length) * 100) : 0;
  const ingresoMensual = inmuebles
    .filter((i) => i.estado === "arrendado" || i.estado === "reservado")
    .reduce((suma, i) => suma + i.canon, 0);

  const leadsRecientes = LEADS.filter((l) => l.tipo === "arrendatario").slice(0, 4);
  const candidatosRecientes = [...CANDIDATOS]
    .sort((a, b) => b.evaluado_en.localeCompare(a.evaluado_en))
    .slice(0, 4);

  return (
    <div>
      <PageHeader
        titulo="Tu portafolio"
        descripcion="Cómo van tus inmuebles publicados, quién está interesado y qué candidatos ya pasaron el estudio."
        acciones={
          <Link href="/propietario/inmuebles/nuevo" className="btn-primary">
            Publicar un inmueble
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard etiqueta="Inmuebles publicados" valor={inmuebles.length} detalle={`${disponibles} disponibles`} />
        <StatCard etiqueta="Ocupación" valor={`${ocupacion}%`} detalle={`${arrendados} arrendados`} tono={ocupacion >= 60 ? "exito" : "alerta"} />
        <StatCard
          etiqueta="Canon comprometido"
          valor={formatoMoneda(ingresoMensual)}
          detalle="Arrendados y reservados"
        />
        <StatCard
          etiqueta="Interesados activos"
          valor={inmuebles.reduce((s, i) => s + i.leads, 0)}
          detalle="Acumulado del último mes"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Estado del portafolio */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900">Estado de tus inmuebles</h2>
            <Link href="/propietario/inmuebles" className="text-sm font-semibold text-clay-600 hover:text-clay-700">
              Ver todos
            </Link>
          </div>

          <div className="space-y-3">
            {inmuebles.map((inmueble) => (
              <div
                key={inmueble.id}
                className="flex flex-wrap items-center gap-4 rounded-xl2 bg-white p-4 shadow-card ring-1 ring-ink-900/5"
              >
                <div
                  className="h-14 w-20 shrink-0 rounded-lg bg-ink-100 bg-cover bg-center"
                  style={{ backgroundImage: `url(${inmueble.imagen})` }}
                  role="presentation"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{inmueble.titulo}</p>
                  <p className="truncate text-xs text-ink-500">
                    {inmueble.direccion} · {inmueble.ciudad}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink-900">{formatoMoneda(inmueble.canon)}</p>
                  <p className="text-xs text-ink-400">{inmueble.leads} interesados</p>
                </div>
                <Badge
                  tono={
                    inmueble.estado === "arrendado"
                      ? "exito"
                      : inmueble.estado === "reservado"
                        ? "info"
                        : inmueble.estado === "en_revision"
                          ? "alerta"
                          : "neutro"
                  }
                >
                  {ETIQUETAS_ESTADO_INMUEBLE[inmueble.estado]}
                </Badge>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          {/* Candidatos evaluados */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">Últimos candidatos</h2>
              <Link href="/propietario/candidatos" className="text-sm font-semibold text-clay-600 hover:text-clay-700">
                Ver todos
              </Link>
            </div>
            <div className="space-y-2">
              {candidatosRecientes.map((candidato) => (
                <div key={candidato.id} className="rounded-xl2 bg-white p-4 shadow-card ring-1 ring-ink-900/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">{candidato.nombre}</p>
                      <p className="truncate text-xs text-ink-500">
                        {INMUEBLES_PROPIETARIO.find((i) => i.id === candidato.inmueble_id)?.titulo}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${ESTILOS_VEREDICTO[candidato.veredicto]}`}
                    >
                      {ETIQUETAS_VEREDICTO[candidato.veredicto]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Interesados */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">Interesados recientes</h2>
              <Link href="/propietario/leads" className="text-sm font-semibold text-clay-600 hover:text-clay-700">
                Ver todos
              </Link>
            </div>
            <div className="space-y-2">
              {leadsRecientes.map((lead) => (
                <div key={lead.id} className="rounded-xl2 bg-white p-4 shadow-card ring-1 ring-ink-900/5">
                  <p className="text-sm font-semibold text-ink-900">{lead.nombre}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{lead.interes}</p>
                  <p className="mt-1 text-xs text-ink-400">
                    Busca hasta {formatoMoneda(lead.canon_objetivo)} · {lead.ciudad}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <p className="mt-8 text-xs text-ink-400">
        Por política de privacidad no compartimos ingresos, puntaje ni historial financiero de los candidatos: solo el
        veredicto del estudio y los datos de convivencia relevantes para tu inmueble.
      </p>
    </div>
  );
}
