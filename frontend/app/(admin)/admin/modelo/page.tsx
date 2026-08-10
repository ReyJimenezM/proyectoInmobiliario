"use client";

import { useEffect, useMemo, useState } from "react";
import { listarSolicitudesAdmin, listarVersionesMotor } from "@/lib/api";
import type { MotorDecisionConfig, SolicitudOut } from "@/lib/types";

/* ============================================================================
   Modelo y datos · gobernanza y transparencia del sistema de decisión
   ========================================================================== */

const ETIQUETAS_GRUPO: Record<string, string> = {
  capacidad: "Capacidad de pago",
  estabilidad: "Estabilidad",
  endeudamiento: "Endeudamiento",
  verificabilidad: "Verificabilidad",
  historial: "Historial",
  fraude: "Antifraude",
};

const ETIQUETAS_UMBRAL: Record<string, string> = {
  umbral_preaprobado: "Preaprobado",
  umbral_requisitos: "Con requisitos",
  umbral_estudio: "Estudio manual",
};

const TABS = [
  "Arquitectura",
  "Dataset de entrenamiento",
  "Modelo y versiones",
  "Outcomes",
  "Proveedores",
] as const;

/* ---------------------------------- Static content ---------------------------------- */

interface FeatureFila {
  variable: string;
  tipo: string;
  fuente: string;
  completitud: number;
}

const FEATURES_DATASET: FeatureFila[] = [
  { variable: "ingresosVerificados", tipo: "numérica", fuente: "Documentos", completitud: 94 },
  { variable: "ingresosDeclarados", tipo: "numérica", fuente: "Formulario", completitud: 100 },
  { variable: "coberturaCanon", tipo: "numérica", fuente: "Motor (derivada)", completitud: 100 },
  { variable: "ratioEndeudamiento", tipo: "numérica", fuente: "Formulario + centrales", completitud: 91 },
  { variable: "flujoPostArriendo", tipo: "numérica", fuente: "Motor (derivada)", completitud: 100 },
  { variable: "tipoOcupacion", tipo: "categórica", fuente: "Formulario", completitud: 100 },
  { variable: "antiguedadLaboralMeses", tipo: "numérica", fuente: "Certificación laboral", completitud: 88 },
  { variable: "actividadCiiu", tipo: "categórica", fuente: "Catálogo CIIU", completitud: 76 },
  { variable: "ciudadResidencia", tipo: "categórica", fuente: "Catálogo DIVIPOLA", completitud: 100 },
  { variable: "edadSolicitante", tipo: "numérica", fuente: "Formulario (derivada)", completitud: 100 },
  { variable: "historialArriendo", tipo: "categórica", fuente: "Referencias", completitud: 82 },
  { variable: "tieneCodeudor", tipo: "booleana", fuente: "Formulario", completitud: 100 },
  { variable: "verificabilidadGlobal", tipo: "numérica", fuente: "Motor de validación", completitud: 100 },
  { variable: "documentosRechazados", tipo: "numérica", fuente: "Revisión analista", completitud: 97 },
  { variable: "scoreRiesgoInmueble", tipo: "numérica", fuente: "Property risk", completitud: 89 },
];

const CATEGORIAS_OUTCOME = [
  {
    nombre: "Pago puntual",
    color: "bg-emerald-500",
    aprende: "Refuerza los perfiles con alta cobertura e ingresos verificados: sus pesos suben en el reentrenamiento.",
  },
  {
    nombre: "Mora leve (<30 días)",
    color: "bg-amber-500",
    aprende: "Ajusta las bandas intermedias: señales de flujo justo post-arriendo ganan peso predictivo.",
  },
  {
    nombre: "Mora grave (>60 días)",
    color: "bg-rose-500",
    aprende: "Endurece los umbrales para combinaciones de baja verificabilidad y endeudamiento alto.",
  },
  {
    nombre: "Restitución",
    color: "bg-rose-700",
    aprende: "Casos etiquetados como default definitivo: la variable objetivo del modelo probabilístico.",
  },
];

const PROVEEDORES = [
  {
    nombre: "Centrales de riesgo",
    entidades: "TransUnion · Datacrédito",
    valida: "Historial crediticio, obligaciones vigentes, comportamiento de pago y consultas recientes.",
    campos: ["ratioEndeudamiento", "historialCrediticio", "scoreExterno"],
    requiere: "Autorización expresa del titular con finalidad específica.",
  },
  {
    nombre: "Verificación de identidad",
    entidades: "Registraduría Nacional",
    valida: "Validación documental, biometría facial y prueba de vida contra la base oficial.",
    campos: ["identidadVerificada", "documentoValido"],
    requiere: "Consentimiento de tratamiento de datos biométricos.",
  },
  {
    nombre: "Información bancaria",
    entidades: "Open banking",
    valida: "Ingresos efectivamente consignados: promedio, mínimo y estabilidad de los extractos.",
    campos: ["ingresosVerificados", "verificabilidadGlobal"],
    requiere: "Autorización del titular por cada consulta.",
  },
  {
    nombre: "Catastro y registro",
    entidades: "VUR · SNR",
    valida: "Titularidad, gravámenes y limitaciones del inmueble vía certificado de tradición y libertad.",
    campos: ["scoreRiesgoInmueble", "titularidadVerificada"],
    requiere: "Solicitud a nombre de la inmobiliaria.",
  },
  {
    nombre: "Listas restrictivas",
    entidades: "OFAC · ONU · PEP",
    valida: "Coincidencias en listas vinculantes de lavado de activos y personas expuestas políticamente.",
    campos: ["alertaListas", "hardStopFraude"],
    requiere: "Verificación obligatoria previa a cualquier aprobación.",
  },
];

const PASOS_LINEAGE = [
  { titulo: "Formulario", detalle: "$4.800.000 declarados", estado: "Declarado", peso: "0.55" },
  { titulo: "Extractos bancarios", detalle: "$4.520.000 promedio 3 meses", estado: "Con soporte", peso: "0.8" },
  { titulo: "Validación analista", detalle: "Cruce certificación + extractos", estado: "Verificado", peso: "1.0" },
  { titulo: "Motor de decisión", detalle: "Entra al cálculo con factor 1.0", estado: "Usado", peso: "—" },
];

/* ---------------------------------- UI atoms ---------------------------------- */

function KPI({ titulo, valor, subtitulo, color }: { titulo: string; valor: string; subtitulo?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wider text-ink-500">{titulo}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${color ?? "text-ink-900"}`}>{valor}</p>
      {subtitulo && <p className="mt-1 text-xs text-ink-400">{subtitulo}</p>}
    </div>
  );
}

function BadgeSimulado() {
  return (
    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
      Simulado en el demo
    </span>
  );
}

function FlechaAbajo() {
  return (
    <div className="flex justify-center py-1">
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-300" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 4v14m0 0l-5-5m5 5l5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ---------------------------------- Tab: Arquitectura ---------------------------------- */

function CapaCard({
  numero,
  titulo,
  descripcion,
  metricas,
}: {
  numero: number;
  titulo: string;
  descripcion: string;
  metricas: { label: string; valor: string }[];
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-500 text-sm font-bold text-white">
          {numero}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink-900">{titulo}</h3>
          <p className="mt-1 text-sm text-ink-500">{descripcion}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {metricas.map((m) => (
              <span key={m.label} className="rounded-lg bg-sand-50 px-3 py-1.5 text-xs">
                <span className="text-ink-400">{m.label}: </span>
                <span className="font-semibold text-ink-800">{m.valor}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabArquitectura({ configActiva }: { configActiva: MotorDecisionConfig | null }) {
  const numGrupos = configActiva ? Object.keys(configActiva.pesos).length : 6;
  const numReglas = configActiva ? configActiva.reglas.length : 37;
  const reglasActivas = configActiva ? configActiva.reglas.filter((r) => r.activa).length : 37;
  const umbrales = configActiva
    ? Object.entries(configActiva.parametros).filter(([k]) => k.startsWith("umbral_"))
    : [];

  return (
    <div className="space-y-1">
      <p className="mb-4 rounded-xl border border-ink-100 bg-sand-50 p-4 text-sm text-ink-600">
        Cada capa responde una pregunta distinta y puede fallar por separado. La decisión final combina todas las capas,
        no solo el puntaje del motor.
      </p>

      <CapaCard
        numero={1}
        titulo="Captura y validación"
        descripcion="El formulario guiado captura los datos con catálogos oficiales (DIVIPOLA, CIIU) y valida tipo, formato, rango y dependencias de cada campo antes de aceptarlo."
        metricas={[
          { label: "Fuentes", valor: "Formulario + catálogos oficiales" },
          { label: "Capas de validación", valor: "3" },
          { label: "Cobertura", valor: "Todos los campos del wizard" },
        ]}
      />
      <FlechaAbajo />
      <CapaCard
        numero={2}
        titulo="Calidad del dato"
        descripcion="Cada dato tiene un estado de confianza que determina cuánto pesa en la decisión: lo declarado vale menos que lo soportado con documentos, y esto menos que lo verificado por un analista."
        metricas={[
          { label: "Declarado", valor: "peso 0.55" },
          { label: "Con soporte", valor: "peso 0.8" },
          { label: "Verificado", valor: "peso 1.0" },
        ]}
      />
      <FlechaAbajo />
      <CapaCard
        numero={3}
        titulo="Motor de reglas"
        descripcion="Reglas parametrizables organizadas en grupos ponderados producen un puntaje de riesgo en escala 0–1000. Cada versión del motor queda auditada y es reversible."
        metricas={[
          { label: "Grupos ponderados", valor: String(numGrupos) },
          { label: "Reglas", valor: `${reglasActivas} activas de ${numReglas}` },
          { label: "Escala", valor: "0–1000" },
          ...(configActiva ? [{ label: "Versión activa", valor: configActiva.version }] : []),
        ]}
      />
      <FlechaAbajo />
      <CapaCard
        numero={4}
        titulo="Decisión y umbrales"
        descripcion="El puntaje se traduce a una decisión mediante umbrales configurables: Preaprobado, Con requisitos, Estudio manual o Rechazado. Las reglas duras (identidad, fraude) impiden aprobar en automático aunque el puntaje sea alto."
        metricas={
          umbrales.length > 0
            ? umbrales.map(([k, v]) => ({ label: ETIQUETAS_UMBRAL[k] ?? k, valor: `≥ ${v}` }))
            : [
                { label: "Preaprobado", valor: "≥ 750" },
                { label: "Con requisitos", valor: "≥ 600" },
                { label: "Estudio manual", valor: "≥ 450" },
                { label: "Rechazado", valor: "< 450" },
              ]
        }
      />
      <FlechaAbajo />
      <CapaCard
        numero={5}
        titulo="Aprendizaje"
        descripcion="Los outcomes reales de los contratos (pagos, moras, restituciones) alimentan el dataset de reentrenamiento. Lo que realmente pasó recalibra los pesos del motor en cada ciclo trimestral."
        metricas={[
          { label: "Fuente", valor: "Outcomes de contratos" },
          { label: "Destino", valor: "Dataset de reentrenamiento" },
          { label: "Frecuencia", valor: "Trimestral" },
        ]}
      />
    </div>
  );
}

/* ---------------------------------- Tab: Dataset ---------------------------------- */

function TabDataset({ solicitudes }: { solicitudes: SolicitudOut[] }) {
  const aprobadas = solicitudes.filter((s) => s.estado === "aprobada").length;
  const rechazadas = solicitudes.filter((s) => s.estado === "rechazada").length;
  const registros = aprobadas + rechazadas;
  const pctAprobadas = registros > 0 ? Math.round((aprobadas / registros) * 100) : 0;

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-ink-100 bg-sand-50 p-4 text-sm text-ink-600">
        El dataset de entrenamiento se construye con las solicitudes ya resueltas (aprobadas y rechazadas): sus variables
        de entrada al momento de decidir, la decisión tomada y los resultados observados después. Las variables
        posteriores a la decisión nunca entran como predictoras, solo como variable objetivo.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI titulo="Registros" valor={String(registros)} subtitulo="Solicitudes resueltas (aprobadas + rechazadas)" />
        <KPI titulo="Variables por registro" valor="≈ 42" subtitulo="Features al momento de la decisión" />
        <KPI titulo="Ventana temporal" valor="12 meses" subtitulo="Particionado por fecha de decisión" />
        <KPI
          titulo="Balance"
          valor={registros > 0 ? `${pctAprobadas}% / ${100 - pctAprobadas}%` : "—"}
          subtitulo="Aprobadas / rechazadas"
          color="text-clay-600"
        />
      </div>

      {/* Features table */}
      <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
        <div className="border-b border-ink-100 px-5 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Variables del dataset</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2">Variable</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Fuente</th>
                <th className="px-4 py-2">Completitud</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES_DATASET.map((f) => (
                <tr key={f.variable} className="border-t border-ink-100">
                  <td className="px-4 py-2 font-mono text-xs font-medium text-ink-800">{f.variable}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs text-ink-600">{f.tipo}</span>
                  </td>
                  <td className="px-4 py-2 text-ink-500">{f.fuente}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className={`h-full rounded-full ${f.completitud >= 90 ? "bg-emerald-500" : f.completitud >= 80 ? "bg-amber-500" : "bg-rose-500"}`}
                          style={{ width: `${f.completitud}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-ink-700">{f.completitud}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lineage */}
      <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Lineage de un dato</h2>
        <p className="mt-1 text-sm text-ink-500">
          Ejemplo con <span className="font-mono text-xs font-semibold text-ink-800">ingresosMensuales</span>: la cadena
          que permite responder en auditoría de dónde salió cada dato y por qué se usó ese valor.
        </p>
        <div className="mt-5 flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
          {PASOS_LINEAGE.map((p, i) => (
            <div key={p.titulo} className="flex flex-1 items-center gap-2">
              <div className="flex-1 rounded-xl border border-ink-100 bg-sand-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{p.estado}</p>
                <p className="mt-1 font-semibold text-ink-900">{p.titulo}</p>
                <p className="mt-1 text-xs text-ink-500">{p.detalle}</p>
                <p className="mt-2 text-xs font-semibold text-clay-600">Peso: {p.peso}</p>
              </div>
              {i < PASOS_LINEAGE.length - 1 && (
                <svg
                  viewBox="0 0 24 24"
                  className="hidden h-5 w-5 shrink-0 text-ink-300 lg:block"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M4 12h14m0 0l-5-5m5 5l-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Tab: Modelo y versiones ---------------------------------- */

function TabModelo({ versiones }: { versiones: MotorDecisionConfig[] }) {
  const activa = versiones.find((v) => v.activa) ?? versiones[0] ?? null;
  const maxPeso = activa ? Math.max(1, ...Object.values(activa.pesos)) : 1;

  if (!activa) {
    return <p className="text-sm text-ink-400">No hay versiones del motor registradas.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Versión activa */}
      <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Versión activa del motor</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-ink-900">{activa.version}</p>
            <p className="mt-1 text-sm text-ink-500">
              Publicada por {activa.autor} · {new Date(activa.creado_en).toLocaleDateString("es-CO")} ·{" "}
              {activa.reglas.filter((r) => r.activa).length} reglas activas de {activa.reglas.length}
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
            Activa
          </span>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-400">Pesos por grupo</h3>
          <div className="space-y-3">
            {Object.entries(activa.pesos).map(([grupo, peso]) => (
              <div key={grupo}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-600">{ETIQUETAS_GRUPO[grupo] ?? grupo}</span>
                  <span className="font-semibold text-ink-800">{peso}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-clay-500 transition-all duration-700"
                    style={{ width: `${(peso / maxPeso) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historial */}
      <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
        <div className="border-b border-ink-100 px-5 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Historial de versiones</h2>
        </div>
        <div className="divide-y divide-ink-100">
          {versiones.map((v) => (
            <div key={v.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">
                  {v.version}
                  {v.activa && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase text-emerald-700">
                      Activa
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {v.autor} · {new Date(v.creado_en).toLocaleDateString("es-CO")}
                </p>
                {v.notas && <p className="mt-1 text-sm text-ink-600">{v.notas}</p>}
              </div>
              <span className="shrink-0 text-xs text-ink-400">
                {v.reglas.filter((r) => r.activa).length}/{v.reglas.length} reglas
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Gobernanza */}
      <div className="rounded-xl border border-ink-100 bg-sand-50 p-5">
        <div className="flex items-start gap-3">
          <svg
            viewBox="0 0 24 24"
            className="mt-0.5 h-5 w-5 shrink-0 text-clay-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <p className="font-semibold text-ink-900">Gobernanza del motor</p>
            <p className="mt-1 text-sm text-ink-600">
              Toda versión queda auditada, es reversible y aplica solo a solicitudes nuevas. Las decisiones ya tomadas
              conservan la versión del motor con la que fueron evaluadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Tab: Outcomes ---------------------------------- */

function TabOutcomes() {
  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-ink-100 bg-sand-50 p-4 text-sm text-ink-600">
        El circuito de aprendizaje: después de aprobar, el sistema registra lo que realmente pasó con cada contrato.
        Esos resultados observados son la materia prima con la que se contrasta el score y se recalibra el motor.
      </p>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <b className="font-semibold">Todavía no hay outcomes registrados.</b> Estos indicadores aparecerán cuando
        empiecen a cargarse resultados reales de contratos. Publicar una precisión o una tasa de mora antes de
        tenerlas medidas sería inventar estadística: por eso se muestran vacíos y no con cifras de ejemplo.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPI titulo="Contratos con seguimiento" valor="—" subtitulo="Sin eventos post-decisión registrados" />
        <KPI titulo="Tasa de mora observada" valor="—" subtitulo="Requiere contratos iniciados" />
        <KPI titulo="Precisión del score" valor="—" subtitulo="Requiere outcomes para contrastar" />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
        <div className="border-b border-ink-100 px-5 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Categorías de outcome</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2">Qué aprende el modelo</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIAS_OUTCOME.map((c) => (
                <tr key={c.nombre} className="border-t border-ink-100">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-medium text-ink-800">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.color}`} />
                      {c.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-500">{c.aprende}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-ink-100 bg-sand-50 p-5 text-sm text-ink-600">
        <span className="font-semibold text-ink-900">Nota: </span>
        Los outcomes reales recalibran los pesos en cada reentrenamiento trimestral. Los eventos posteriores a la
        decisión se marcan como POST_DECISION y nunca entran como variables predictoras.
      </div>
    </div>
  );
}

/* ---------------------------------- Tab: Proveedores ---------------------------------- */

function TabProveedores() {
  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-ink-100 bg-sand-50 p-4 text-sm text-ink-600">
        Integraciones externas que alimentan la verificación de datos. En el demo todas están simuladas: los contratos
        de datos ya están definidos para poder conectarlas sin reconstruir el sistema.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {PROVEEDORES.map((p) => (
          <div key={p.nombre} className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink-900">{p.nombre}</h3>
                <p className="text-xs text-ink-400">{p.entidades}</p>
              </div>
              <BadgeSimulado />
            </div>
            <p className="mt-3 text-sm text-ink-600">{p.valida}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.campos.map((c) => (
                <span key={c} className="rounded-full bg-sand-100 px-2 py-0.5 font-mono text-[11px] text-ink-600">
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-400">
              <span className="font-semibold text-ink-500">Requiere: </span>
              {p.requiere}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export default function ModeloAdminPage() {
  const [tab, setTab] = useState(0);
  const [versiones, setVersiones] = useState<MotorDecisionConfig[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudOut[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listarVersionesMotor(), listarSolicitudesAdmin()])
      .then(([v, s]) => {
        setVersiones(v);
        setSolicitudes(s);
      })
      .catch(() => setError("No pudimos cargar la información del modelo."))
      .finally(() => setCargando(false));
  }, []);

  const configActiva = useMemo(() => versiones.find((v) => v.activa) ?? versiones[0] ?? null, [versiones]);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (cargando) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-ink-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Modelo y datos</h1>
        <p className="mt-1 text-sm text-ink-500">
          Cómo decide el sistema, con qué datos se entrena y cómo aprende de los resultados reales.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-ink-100">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(i)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
              tab === i
                ? "border-b-2 border-clay-500 text-ink-900"
                : "text-ink-400 hover:bg-sand-50 hover:text-ink-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <TabArquitectura configActiva={configActiva} />}
      {tab === 1 && <TabDataset solicitudes={solicitudes} />}
      {tab === 2 && <TabModelo versiones={versiones} />}
      {tab === 3 && <TabOutcomes />}
      {tab === 4 && <TabProveedores />}
    </div>
  );
}
