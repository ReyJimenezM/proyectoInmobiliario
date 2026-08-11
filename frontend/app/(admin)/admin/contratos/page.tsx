"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, type TonoBadge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { CONTRATOS, type Contrato, type EstadoContrato } from "@/lib/demo";
import { formatoFecha, formatoMoneda } from "@/lib/format";

const ETIQUETAS: Record<EstadoContrato, string> = {
  borrador: "Borrador",
  en_firma: "En firma",
  firmado: "Firmado",
  activo: "Activo",
  terminado: "Terminado",
};

const TONOS: Record<EstadoContrato, TonoBadge> = {
  borrador: "neutro",
  en_firma: "alerta",
  firmado: "info",
  activo: "exito",
  terminado: "neutro",
};

const FILTROS: (EstadoContrato | "todos")[] = ["todos", "borrador", "en_firma", "activo", "terminado"];

export default function ContratosPage() {
  const { toast } = useToast();
  const [contratos, setContratos] = useState<Contrato[]>(CONTRATOS);
  const [filtro, setFiltro] = useState<EstadoContrato | "todos">("todos");
  const [abierto, setAbierto] = useState<Contrato | null>(null);

  const visibles = useMemo(
    () => (filtro === "todos" ? contratos : contratos.filter((c) => c.estado === filtro)),
    [contratos, filtro]
  );

  const activos = contratos.filter((c) => c.estado === "activo").length;
  const enFirma = contratos.filter((c) => c.estado === "en_firma").length;
  const canonAdministrado = contratos.filter((c) => c.estado === "activo").reduce((s, c) => s + c.canon, 0);

  function recordarFirma(contrato: Contrato) {
    const pendientes = contrato.firmas.filter((f) => !f.firmado);
    toast({
      type: "info",
      title: "Recordatorio enviado",
      description: `Se notificó a ${pendientes.map((f) => f.parte.toLowerCase()).join(" y ")}.`,
    });
  }

  function generarContrato(contrato: Contrato) {
    setContratos((previos) => previos.map((c) => (c.id === contrato.id ? { ...c, estado: "en_firma" } : c)));
    setAbierto((previo) => (previo && previo.id === contrato.id ? { ...previo, estado: "en_firma" } : previo));
    toast({
      type: "success",
      title: "Contrato enviado a firma",
      description: "Las tres partes reciben el enlace de firma electrónica.",
    });
  }

  return (
    <div>
      <PageHeader
        titulo="Contratos"
        descripcion="Generación del contrato de arrendamiento y seguimiento de la firma electrónica de las tres partes."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard etiqueta="Contratos activos" valor={activos} tono="exito" />
        <StatCard etiqueta="En firma" valor={enFirma} detalle="Esperando alguna parte" tono={enFirma > 0 ? "alerta" : "neutro"} />
        <StatCard etiqueta="Canon administrado" valor={formatoMoneda(canonAdministrado)} detalle="Contratos activos" />
        <StatCard etiqueta="Total histórico" valor={contratos.length} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filtro === f ? "bg-ink-900 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:ring-ink-400"
            }`}
          >
            {f === "todos" ? "Todos" : ETIQUETAS[f]}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Contrato</th>
              <th className="px-4 py-3 font-semibold">Inmueble</th>
              <th className="px-4 py-3 font-semibold">Arrendatario</th>
              <th className="px-4 py-3 font-semibold">Canon</th>
              <th className="px-4 py-3 font-semibold">Vigencia</th>
              <th className="px-4 py-3 font-semibold">Firmas</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((contrato) => {
              const firmadas = contrato.firmas.filter((f) => f.firmado).length;
              return (
                <tr key={contrato.id} className="border-t border-ink-100 transition hover:bg-sand-50">
                  <td className="px-4 py-3 font-mono text-xs text-ink-700">{contrato.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{contrato.inmueble}</p>
                    <p className="text-xs text-ink-400">{contrato.direccion}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{contrato.arrendatario}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{formatoMoneda(contrato.canon)}</td>
                  <td className="px-4 py-3 text-xs text-ink-500">
                    {formatoFecha(contrato.inicio)} — {formatoFecha(contrato.fin)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={firmadas === contrato.firmas.length ? "text-emerald-700" : "text-amber-700"}>
                      {firmadas}/{contrato.firmas.length}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tono={TONOS[contrato.estado]}>{ETIQUETAS[contrato.estado]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setAbierto(contrato)}
                      className="text-sm font-semibold text-clay-600 hover:text-clay-700"
                    >
                      Ver →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Drawer open={abierto !== null} onClose={() => setAbierto(null)} title={abierto?.id ?? ""}>
        {abierto && (
          <div className="space-y-5">
            <div>
              <Badge tono={TONOS[abierto.estado]}>{ETIQUETAS[abierto.estado]}</Badge>
              <h3 className="mt-3 text-lg font-semibold text-ink-900">{abierto.inmueble}</h3>
              <p className="text-sm text-ink-500">{abierto.direccion}</p>
            </div>

            <dl className="space-y-2.5 text-sm">
              {[
                ["Arrendatario", abierto.arrendatario],
                ["Propietario", abierto.propietario],
                ["Canon mensual", formatoMoneda(abierto.canon)],
                ["Inicio", formatoFecha(abierto.inicio)],
                ["Terminación", formatoFecha(abierto.fin)],
              ].map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex justify-between gap-4 border-b border-ink-100 pb-2">
                  <dt className="text-ink-500">{etiqueta}</dt>
                  <dd className="text-right font-medium text-ink-900">{valor}</dd>
                </div>
              ))}
            </dl>

            <div>
              <p className="label-field">Estado de las firmas</p>
              <ul className="space-y-2">
                {abierto.firmas.map((firma) => (
                  <li
                    key={firma.parte}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">{firma.nombre}</p>
                      <p className="text-xs text-ink-400">{firma.parte}</p>
                    </div>
                    {firma.firmado ? (
                      <span className="shrink-0 text-xs font-semibold text-emerald-700">
                        Firmado {firma.fecha ? new Date(firma.fecha).toLocaleDateString("es-CO") : ""}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs font-semibold text-amber-700">Pendiente</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-ink-50 p-4 text-xs text-ink-600">
              El contrato se genera con las cláusulas de la Ley 820 de 2003: término, canon, reajuste anual, depósito y
              causales de terminación.
            </div>

            <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
              {abierto.estado === "borrador" ? (
                <button type="button" onClick={() => generarContrato(abierto)} className="btn-primary px-5 py-2.5 text-sm">
                  Enviar a firma
                </button>
              ) : abierto.estado === "en_firma" ? (
                <button type="button" onClick={() => recordarFirma(abierto)} className="btn-primary px-5 py-2.5 text-sm">
                  Recordar firma pendiente
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => toast({ type: "info", title: "Descarga del PDF", description: "Disponible al conectar el proveedor de firma." })}
                className="btn-secondary px-5 py-2.5 text-sm"
              >
                Descargar PDF
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
