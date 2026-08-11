"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, type TonoBadge } from "@/components/ui/Badge";
import { Campo } from "@/components/ui/Campo";
import { useToast } from "@/components/ui/Toast";
import { exportCSV } from "@/lib/csv";
import { TRANSACCIONES, type EstadoPago, type Transaccion } from "@/lib/demo";
import { formatoMoneda } from "@/lib/format";

const ETIQUETAS_ESTADO: Record<EstadoPago, string> = {
  aprobado: "Aprobado",
  pendiente: "Pendiente",
  fallido: "Fallido",
  reversado: "Reversado",
};

const TONOS: Record<EstadoPago, TonoBadge> = {
  aprobado: "exito",
  pendiente: "alerta",
  fallido: "error",
  reversado: "neutro",
};

interface ConfiguracionCobro {
  valor_estudio: number;
  valor_codeudor: number;
  quien_paga: "arrendatario" | "propietario";
  momento: "antes_central" | "al_enviar";
  iva_incluido: boolean;
  pasarela: string;
}

const CONFIGURACION_INICIAL: ConfiguracionCobro = {
  valor_estudio: 45000,
  valor_codeudor: 23000,
  quien_paga: "arrendatario",
  momento: "antes_central",
  iva_incluido: true,
  pasarela: "Wompi",
};

export default function PagosPage() {
  const { toast } = useToast();
  const [transacciones, setTransacciones] = useState<Transaccion[]>(TRANSACCIONES);
  const [config, setConfig] = useState<ConfiguracionCobro>(CONFIGURACION_INICIAL);
  const [filtro, setFiltro] = useState<EstadoPago | "todas">("todas");

  const visibles = useMemo(
    () => (filtro === "todas" ? transacciones : transacciones.filter((t) => t.estado === filtro)),
    [transacciones, filtro]
  );

  const recaudado = transacciones.filter((t) => t.estado === "aprobado").reduce((s, t) => s + t.valor, 0);
  const aprobadas = transacciones.filter((t) => t.estado === "aprobado").length;
  const tasaAprobacion = Math.round((aprobadas / transacciones.length) * 100);
  const sinConciliar = transacciones.filter((t) => !t.conciliado && t.estado === "aprobado").length;
  const ticket = aprobadas > 0 ? Math.round(recaudado / aprobadas) : 0;

  function conciliar(id: string) {
    setTransacciones((previas) => previas.map((t) => (t.id === id ? { ...t, conciliado: true } : t)));
    toast({ type: "success", title: "Transacción conciliada", description: `${id} quedó marcada como conciliada.` });
  }

  function exportar() {
    const encabezados = ["ID", "Referencia", "Solicitud", "Pagador", "Documento", "Concepto", "Valor", "Método", "Estado", "Fecha", "Conciliado"];
    exportCSV(
      "transacciones.csv",
      encabezados,
      visibles.map((t) => [
        t.id,
        t.referencia_pasarela,
        t.solicitud,
        t.pagador,
        t.documento,
        t.concepto,
        String(t.valor),
        t.metodo,
        ETIQUETAS_ESTADO[t.estado],
        new Date(t.fecha).toLocaleString("es-CO"),
        t.conciliado ? "Sí" : "No",
      ])
    );
    toast({ type: "success", title: "Exportación lista", description: `${visibles.length} transacciones descargadas.` });
  }

  return (
    <div>
      <PageHeader
        titulo="Pagos y facturación"
        descripcion="Cobro por transacción del estudio, conciliación con la pasarela e historial de pagos."
        acciones={
          <button type="button" onClick={exportar} className="btn-primary px-4 py-2 text-sm">
            Exportar CSV
          </button>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard etiqueta="Recaudado" valor={formatoMoneda(recaudado)} detalle={`${aprobadas} transacciones aprobadas`} />
        <StatCard etiqueta="Ticket promedio" valor={formatoMoneda(ticket)} />
        <StatCard
          etiqueta="Tasa de aprobación"
          valor={`${tasaAprobacion}%`}
          detalle="Pagos aprobados sobre intentos"
          tono={tasaAprobacion >= 80 ? "exito" : "alerta"}
        />
        <StatCard
          etiqueta="Sin conciliar"
          valor={sinConciliar}
          detalle="Aprobadas pendientes de cruce"
          tono={sinConciliar > 0 ? "alerta" : "exito"}
        />
      </div>

      {/* Configuración del cobro */}
      <section className="card mb-8 p-6">
        <h2 className="text-lg font-semibold text-ink-900">Configuración del cobro</h2>
        <p className="mt-1 text-sm text-ink-500">
          Define cuánto vale el estudio y en qué momento se cobra. El cobro debe ocurrir antes de consultar la central
          de riesgo, que es el evento que tiene costo real.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Campo id="valor_estudio" etiqueta="Valor del estudio" ayuda={formatoMoneda(config.valor_estudio)}>
            <input
              id="valor_estudio"
              type="number"
              min={0}
              step={1000}
              className="input-field"
              value={config.valor_estudio}
              onChange={(e) => setConfig({ ...config, valor_estudio: Number(e.target.value) })}
            />
          </Campo>

          <Campo id="valor_codeudor" etiqueta="Recargo por codeudor" ayuda={formatoMoneda(config.valor_codeudor)}>
            <input
              id="valor_codeudor"
              type="number"
              min={0}
              step={1000}
              className="input-field"
              value={config.valor_codeudor}
              onChange={(e) => setConfig({ ...config, valor_codeudor: Number(e.target.value) })}
            />
          </Campo>

          <Campo id="quien_paga" etiqueta="Quién paga">
            <select
              id="quien_paga"
              className="input-field"
              value={config.quien_paga}
              onChange={(e) => setConfig({ ...config, quien_paga: e.target.value as ConfiguracionCobro["quien_paga"] })}
            >
              <option value="arrendatario">El arrendatario</option>
              <option value="propietario">El propietario</option>
            </select>
          </Campo>

          <Campo id="momento" etiqueta="Momento del cobro">
            <select
              id="momento"
              className="input-field"
              value={config.momento}
              onChange={(e) => setConfig({ ...config, momento: e.target.value as ConfiguracionCobro["momento"] })}
            >
              <option value="antes_central">Antes de consultar la central de riesgo</option>
              <option value="al_enviar">Al enviar la solicitud</option>
            </select>
          </Campo>

          <Campo id="pasarela" etiqueta="Pasarela">
            <select
              id="pasarela"
              className="input-field"
              value={config.pasarela}
              onChange={(e) => setConfig({ ...config, pasarela: e.target.value })}
            >
              {["Wompi", "PayU", "Mercado Pago", "ePayco"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Campo>

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-3 text-sm text-ink-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-ink-300 text-clay-600 focus:ring-clay-500"
                checked={config.iva_incluido}
                onChange={(e) => setConfig({ ...config, iva_incluido: e.target.checked })}
              />
              El valor ya incluye IVA
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            toast({
              type: "success",
              title: "Configuración guardada",
              description: "Aplica a las solicitudes nuevas; las que están en curso mantienen su tarifa.",
            })
          }
          className="btn-primary mt-5"
        >
          Guardar configuración
        </button>
      </section>

      {/* Historial */}
      <section>
        <div className="mb-4 flex flex-wrap gap-2">
          {(["todas", "aprobado", "pendiente", "fallido", "reversado"] as const).map((clave) => (
            <button
              key={clave}
              type="button"
              onClick={() => setFiltro(clave)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filtro === clave ? "bg-ink-900 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:ring-ink-400"
              }`}
            >
              {clave === "todas" ? "Todas" : ETIQUETAS_ESTADO[clave]}
            </button>
          ))}
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Transacción</th>
                <th className="px-4 py-3 font-semibold">Solicitud</th>
                <th className="px-4 py-3 font-semibold">Pagador</th>
                <th className="px-4 py-3 font-semibold">Método</th>
                <th className="px-4 py-3 font-semibold">Valor</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Conciliación</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((t) => (
                <tr key={t.id} className="border-t border-ink-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{t.id}</p>
                    <p className="font-mono text-xs text-ink-400">{t.referencia_pasarela}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-600">{t.solicitud}</td>
                  <td className="px-4 py-3">
                    <p className="text-ink-900">{t.pagador}</p>
                    <p className="text-xs text-ink-400">{t.documento}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{t.metodo}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{formatoMoneda(t.valor)}</td>
                  <td className="px-4 py-3">
                    <Badge tono={TONOS[t.estado]}>{ETIQUETAS_ESTADO[t.estado]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-500">
                    {new Date(t.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    {t.conciliado ? (
                      <span className="text-xs font-medium text-emerald-700">Conciliada</span>
                    ) : t.estado === "aprobado" ? (
                      <button
                        type="button"
                        onClick={() => conciliar(t.id)}
                        className="text-xs font-semibold text-clay-600 hover:text-clay-700"
                      >
                        Marcar conciliada
                      </button>
                    ) : (
                      <span className="text-xs text-ink-400">No aplica</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-xs text-ink-400">
        Datos de demostración: cuando se conecte la pasarela, esta pantalla consume el historial real y la conciliación
        se cruza contra el reporte de liquidación.
      </p>
    </div>
  );
}
