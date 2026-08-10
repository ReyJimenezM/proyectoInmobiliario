"use client";

import { useEffect, useMemo, useState } from "react";
import {
  abrirDocumento,
  agregarComentarioAdmin,
  asignarAnalistaAdmin,
  enviarSolicitud,
  listarAuditoria,
  listarComentariosAdmin,
  listarDocumentos,
  listarUsuariosInmobiliaria,
  listarVersionesMotor,
  obtenerPropiedad,
  obtenerResultadoSolicitud,
  obtenerSolicitud,
  revisarDocumentoAdmin,
  tomarDecisionManual,
  validarSolicitudAdmin,
} from "@/lib/api";
import type { ValidacionSolicitudOut } from "@/lib/api";
import { obtenerUsuarioSesion } from "@/lib/auth";
import { formatoMoneda } from "@/lib/format";
import type {
  AuditoriaEntrada,
  DocumentoOut,
  MotorDecisionConfig,
  PropiedadDetail,
  ResultadoSolicitudOut,
  SolicitudOut,
  UsuarioStaff,
} from "@/lib/types";

interface PageProps {
  params: { id: string };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TABS = ["Resumen", "Documentos", "Calidad de datos", "Motor", "Auditoría"] as const;
type Tab = (typeof TABS)[number];

const ETIQUETAS_ESTADO_DOC: Record<string, { label: string; dot: string; badge: string }> = {
  aprobado: { label: "Aprobado", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  cargado: { label: "Cargado", dot: "bg-sky-500", badge: "bg-sky-50 text-sky-700" },
  rechazado: { label: "Rechazado", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700" },
  pendiente: { label: "Pendiente", dot: "bg-ink-300", badge: "bg-ink-100 text-ink-500" },
};

const BADGE_ESTADO_DATO: Record<string, string> = {
  verificado: "bg-emerald-50 text-emerald-700",
  con_soporte: "bg-sky-50 text-sky-700",
  declarado: "bg-ink-100 text-ink-600",
  sin_verificar: "bg-amber-50 text-amber-700",
  inconsistente: "bg-rose-50 text-rose-700",
  rechazado: "bg-rose-50 text-rose-700",
};

function estiloHallazgo(severidad: number): { borde: string; fondo: string; badge: string } {
  if (severidad >= 3) return { borde: "border-rose-200", fondo: "bg-rose-50/60", badge: "bg-rose-100 text-rose-800" };
  if (severidad === 2) return { borde: "border-amber-200", fondo: "bg-amber-50/60", badge: "bg-amber-100 text-amber-800" };
  return { borde: "border-sky-200", fondo: "bg-sky-50/60", badge: "bg-sky-100 text-sky-800" };
}

function colorVerificabilidad(valor: number): { texto: string; barra: string } {
  if (valor >= 80) return { texto: "text-emerald-700", barra: "#15803D" };
  if (valor >= 60) return { texto: "text-amber-700", barra: "#B45309" };
  return { texto: "text-rose-700", barra: "#BC2C22" };
}

const ETIQUETAS_GRUPO: Record<string, string> = {
  capacidad: "Capacidad de pago",
  estabilidad: "Estabilidad",
  endeudamiento: "Endeudamiento",
  verificabilidad: "Verificabilidad",
  historial: "Historial",
  fraude: "Antifraude",
  otros: "Otros factores",
};

function inferirGrupo(nombreVariable: string, mapaVariables: Record<string, string>): string {
  const clave = nombreVariable.toLowerCase();
  if (mapaVariables[clave]) return mapaVariables[clave];
  if (clave.includes("ingres") || clave.includes("capacidad") || clave.includes("cobertura")) return "capacidad";
  if (clave.includes("antigu") || clave.includes("estabilidad") || clave.includes("laboral") || clave.includes("ocupacion")) return "estabilidad";
  if (clave.includes("deuda") || clave.includes("endeudamiento") || clave.includes("cuota")) return "endeudamiento";
  if (clave.includes("verificab") || clave.includes("documento")) return "verificabilidad";
  if (clave.includes("historial") || clave.includes("mora") || clave.includes("arriendo")) return "historial";
  if (clave.includes("fraude") || clave.includes("alerta")) return "fraude";
  return "otros";
}

function colorPorScore(score: number | null | undefined): { stroke: string; text: string; bg: string; label: string } {
  if (score == null) return { stroke: "#A8A29E", text: "text-ink-500", bg: "bg-ink-100", label: "Sin score" };
  if (score >= 780) return { stroke: "#15803D", text: "text-emerald-700", bg: "bg-emerald-50", label: "Excelente" };
  if (score >= 680) return { stroke: "#B45309", text: "text-clay-700", bg: "bg-clay-50", label: "Bueno" };
  if (score >= 560) return { stroke: "#B45309", text: "text-amber-700", bg: "bg-amber-50", label: "Aceptable" };
  return { stroke: "#BC2C22", text: "text-rose-700", bg: "bg-rose-50", label: "Riesgo alto" };
}

function colorPorDecision(decision: string | null | undefined): { bg: string; text: string; label: string } {
  const d = (decision ?? "").toLowerCase();
  if (d.includes("aprobad") && d.includes("condicion")) return { bg: "bg-amber-100", text: "text-amber-800", label: "Aprobada condicionada" };
  if (d.includes("aprobad")) return { bg: "bg-emerald-100", text: "text-emerald-800", label: "Aprobada" };
  if (d.includes("rechaz")) return { bg: "bg-rose-100", text: "text-rose-800", label: "Rechazada" };
  if (d.includes("ruta")) return { bg: "bg-sky-100", text: "text-sky-800", label: "Ruta alterna" };
  if (!d) return { bg: "bg-ink-100", text: "text-ink-600", label: "Sin decisión" };
  return { bg: "bg-ink-100", text: "text-ink-700", label: decision ?? "" };
}

function enmascararDocumento(numero: string | undefined): string {
  if (!numero) return "—";
  const limpio = numero.replace(/\s+/g, "");
  if (limpio.length <= 4) return `••• ${limpio}`;
  return `••• ${limpio.slice(-4)}`;
}

function num(valor: unknown): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function sum(valores: unknown): number {
  return Array.isArray(valores) ? valores.reduce((acc: number, v) => acc + num(v), 0) : 0;
}

/* ------------------------------------------------------------------ */
/*  Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

function ScoreGauge({ score, escalaMaxima }: { score: number | null | undefined; escalaMaxima: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const frac = score != null ? Math.min(1, Math.max(0, score / escalaMaxima)) : 0;
  const { stroke, text, label } = colorPorScore(score != null ? (score / escalaMaxima) * 1000 : null);

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="#EFEAE4" strokeWidth="16" />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="-mt-[120px] flex flex-col items-center">
        <span className="text-4xl font-bold tracking-tight text-ink-900">{score != null ? Math.round(score) : "—"}</span>
        <span className="text-xs text-ink-400">/ {escalaMaxima}</span>
        <span className={`mt-1 text-xs font-semibold ${text}`}>{label}</span>
      </div>
    </div>
  );
}

function MiniMetric({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-3 text-center shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink-900">{valor}</p>
    </div>
  );
}

function StatLine({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-50 py-1.5 text-sm last:border-0">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-800">{valor}</span>
    </div>
  );
}

function BloqueDatos({ titulo, datos }: { titulo: string; datos: Record<string, unknown> }) {
  const entradas = Object.entries(datos).filter(([, v]) => v !== null && v !== "" && v !== undefined);
  return (
    <div className="card p-5">
      <h3 className="mb-3 font-semibold text-ink-900">{titulo}</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {entradas.map(([clave, valor]) => (
          <div key={clave} className="contents">
            <dt className="capitalize text-ink-400">{clave.replace(/_/g, " ")}</dt>
            <dd className="truncate text-ink-800">{typeof valor === "object" ? JSON.stringify(valor) : String(valor)}</dd>
          </div>
        ))}
        {entradas.length === 0 && <p className="col-span-2 text-ink-400">Sin datos.</p>}
      </dl>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */

export default function DetalleSolicitudAdminPage({ params }: PageProps) {
  const [solicitud, setSolicitud] = useState<SolicitudOut | null>(null);
  const [resultado, setResultado] = useState<ResultadoSolicitudOut | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoOut[]>([]);
  const [propiedad, setPropiedad] = useState<PropiedadDetail | null>(null);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [staff, setStaff] = useState<UsuarioStaff[]>([]);
  const [motorActivo, setMotorActivo] = useState<MotorDecisionConfig | null>(null);
  const [auditoria, setAuditoria] = useState<AuditoriaEntrada[]>([]);

  const [tab, setTab] = useState<Tab>("Resumen");
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Decisión manual
  const [decisionSeleccionada, setDecisionSeleccionada] = useState<"aprobada" | "rechazada" | "solicitar_info">("aprobada");
  const [comentarioDecision, setComentarioDecision] = useState("");
  const [enviandoDecision, setEnviandoDecision] = useState(false);

  // Asignación
  const [analistaId, setAnalistaId] = useState("");
  const [asignando, setAsignando] = useState(false);

  // Comentarios
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Documentos: revisión
  const [docEnRevision, setDocEnRevision] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState<Record<string, string>>({});
  const [procesandoDoc, setProcesandoDoc] = useState<string | null>(null);

  // Motor
  const [reejecutando, setReejecutando] = useState(false);

  // Calidad de datos
  const [validacion, setValidacion] = useState<ValidacionSolicitudOut | null>(null);
  const [cargandoValidacion, setCargandoValidacion] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [validacionSolicitada, setValidacionSolicitada] = useState(false);

  const usuarioSesion = useMemo(() => obtenerUsuarioSesion(), []);

  async function cargarTodo() {
    try {
      const [s, r, docs] = await Promise.all([
        obtenerSolicitud(params.id),
        obtenerResultadoSolicitud(params.id).catch(() => null),
        listarDocumentos(params.id),
      ]);
      setSolicitud(s);
      setResultado(r);
      setDocumentos(docs);

      obtenerPropiedad(s.propiedad_id).then(setPropiedad).catch(() => {});
      listarComentariosAdmin(params.id).then(setComentarios).catch(() => setComentarios([]));
      listarVersionesMotor().then((vs) => setMotorActivo(vs.find((v) => v.activa) ?? vs[0] ?? null)).catch(() => {});
      listarAuditoria({ entidad_tipo: "solicitud", pagina: 1 })
        .then((res) => setAuditoria(res.resultados.filter((e) => e.entidad_id === params.id)))
        .catch(() => setAuditoria([]));
      if (usuarioSesion?.inmobiliaria_id) {
        listarUsuariosInmobiliaria(usuarioSesion.inmobiliaria_id)
          .then((u) => setStaff(u.filter((x) => ["analista", "admin"].includes(x.rol))))
          .catch(() => setStaff([]));
      }
    } catch {
      setError("No pudimos cargar esta solicitud.");
    }
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function decidir() {
    if (comentarioDecision.trim().length < 10) {
      setError("El comentario debe tener al menos 10 caracteres — queda en el log de auditoría.");
      return;
    }
    setError(null);
    setEnviandoDecision(true);
    try {
      await tomarDecisionManual(params.id, { decision_final: decisionSeleccionada, comentario: comentarioDecision });
      setMensajeExito("Decisión registrada correctamente.");
      setComentarioDecision("");
      cargarTodo();
    } catch {
      setError("No pudimos registrar la decisión.");
    } finally {
      setEnviandoDecision(false);
    }
  }

  async function asignar() {
    if (!analistaId) return;
    setAsignando(true);
    try {
      await asignarAnalistaAdmin(params.id, analistaId);
      setMensajeExito("Analista asignado.");
    } catch {
      setError("No pudimos asignar el analista.");
    } finally {
      setAsignando(false);
    }
  }

  async function enviarComentario() {
    if (nuevoComentario.trim().length < 2) return;
    setEnviandoComentario(true);
    try {
      await agregarComentarioAdmin(params.id, nuevoComentario.trim());
      setNuevoComentario("");
      const c = await listarComentariosAdmin(params.id);
      setComentarios(c);
    } catch {
      setError("No pudimos guardar el comentario.");
    } finally {
      setEnviandoComentario(false);
    }
  }

  async function revisarDocumento(docId: string, estado: "aprobado" | "rechazado") {
    setProcesandoDoc(docId);
    try {
      await revisarDocumentoAdmin(params.id, docId, {
        estado,
        comentario: estado === "rechazado" ? motivoRechazo[docId] ?? "" : undefined,
      });
      const docs = await listarDocumentos(params.id);
      setDocumentos(docs);
      setDocEnRevision(null);
    } catch {
      setError("No pudimos actualizar el estado del documento.");
    } finally {
      setProcesandoDoc(null);
    }
  }

  async function cargarValidacion() {
    setCargandoValidacion(true);
    setErrorValidacion(null);
    try {
      const v = await validarSolicitudAdmin(params.id);
      setValidacion(v);
    } catch {
      setErrorValidacion("No pudimos ejecutar la validación de calidad de datos.");
    } finally {
      setCargandoValidacion(false);
    }
  }

  useEffect(() => {
    if (tab === "Calidad de datos" && !validacionSolicitada) {
      setValidacionSolicitada(true);
      cargarValidacion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, validacionSolicitada]);

  async function reejecutarMotor() {
    setReejecutando(true);
    try {
      const r = await enviarSolicitud(params.id, true);
      setResultado(r);
      setMensajeExito("El motor se re-ejecutó correctamente.");
    } catch {
      setError("No pudimos re-ejecutar el motor para esta solicitud.");
    } finally {
      setReejecutando(false);
    }
  }

  if (error && !solicitud) return <p className="text-rose-600">{error}</p>;
  if (!solicitud) return <p className="text-ink-500">Cargando solicitud...</p>;

  const datosPersonales = solicitud.datos_personales as Record<string, any>;
  const datosLaborales = solicitud.datos_laborales as Record<string, any>;
  const datosFinancieros = solicitud.datos_financieros as Record<string, any>;

  const nombre = datosPersonales?.nombres_apellidos ?? "Solicitud";

  // --- Resumen financiero derivado ---
  const ingresoBruto = num(datosFinancieros?.ingresos_mensuales_fijos) + num(datosFinancieros?.ingresos_variables) + num(datosFinancieros?.ingresos_otros);
  const ingresoNoVerificable = num(datosFinancieros?.ingreso_no_verificable);
  const ingresoVerificable = Math.max(0, ingresoBruto - ingresoNoVerificable);
  const cuotasFinancieras = Array.isArray(datosFinancieros?.otros_creditos)
    ? datosFinancieros.otros_creditos.reduce((acc: number, c: any) => acc + num(c?.cuota_mensual), 0)
    : 0;
  const canon = propiedad ? num(propiedad.precio) : 0;
  const flujoPostArriendo = ingresoBruto - cuotasFinancieras - canon;
  const patrimonioNeto = sum(datosFinancieros?.patrimonio_activos) - sum(datosFinancieros?.patrimonio_pasivos);
  const cobertura = canon > 0 ? ingresoBruto / canon : null;
  const ratioEndeudamiento = ingresoBruto > 0 ? cuotasFinancieras / ingresoBruto : null;
  const verificabilidad = ingresoBruto > 0 ? ingresoVerificable / ingresoBruto : null;

  const score = resultado?.score ?? null;
  const escalaMaxima = resultado?.escala_maxima ?? 1000;
  const decisionInfo = colorPorDecision(resultado?.decision);

  // --- Agrupación por grupo del motor para el tab "Motor" ---
  const mapaVariableGrupo: Record<string, string> = {};
  motorActivo?.reglas.forEach((r) => {
    mapaVariableGrupo[r.variable.toLowerCase()] = r.grupo;
  });
  const variablesPorGrupo = new Map<string, { puntos: number; items: ResultadoSolicitudOut["variables_evaluadas"] }>();
  (resultado?.variables_evaluadas ?? []).forEach((v) => {
    const grupo = inferirGrupo(v.nombre, mapaVariableGrupo);
    const actual = variablesPorGrupo.get(grupo) ?? { puntos: 0, items: [] };
    actual.puntos += v.puntaje_ponderado;
    actual.items.push(v);
    variablesPorGrupo.set(grupo, actual);
  });
  const maxPuntosGrupo = Math.max(1, ...Array.from(variablesPorGrupo.values()).map((g) => g.puntos), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{nombre}</h1>
          <p className="mt-1 text-sm capitalize text-ink-500">
            {solicitud.vertical} · estado: {solicitud.estado.replace(/_/g, " ")} · creada el{" "}
            {new Date(solicitud.creado_en).toLocaleDateString("es-CO")}
          </p>
        </div>
      </div>

      {(error || mensajeExito) && (
        <div className="space-y-2">
          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}
          {mensajeExito && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">{mensajeExito}</p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t ? "border-clay-600 text-clay-600" : "border-transparent text-ink-400 hover:text-ink-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ------------------------------------------------------------ */}
        {/*  Main column                                                  */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-6 lg:col-span-2">
          {tab === "Resumen" && (
            <div className="space-y-6">
              <div className="card grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
                <div className="flex flex-col items-center justify-center">
                  <ScoreGauge score={score} escalaMaxima={escalaMaxima} />
                </div>
                <div className="flex flex-col justify-center gap-3">
                  <span className={`inline-flex w-fit items-center rounded-full px-4 py-1.5 text-sm font-bold ${decisionInfo.bg} ${decisionInfo.text}`}>
                    {decisionInfo.label}
                  </span>
                  {resultado?.explicacion && <p className="text-sm text-ink-600">{resultado.explicacion}</p>}
                  {resultado?.ruta_alterna_disponible && (
                    <p className="text-xs font-semibold text-sky-700">
                      Ruta alterna disponible: {resultado.ruta_alterna_sugerencias.join(", ")}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniMetric label="Cobertura" valor={cobertura != null ? `${cobertura.toFixed(1)}x` : "—"} />
                <MiniMetric label="Endeudamiento" valor={ratioEndeudamiento != null ? `${(ratioEndeudamiento * 100).toFixed(0)}%` : "—"} />
                <MiniMetric label="Verificabilidad" valor={verificabilidad != null ? `${(verificabilidad * 100).toFixed(0)}%` : "—"} />
                <MiniMetric label="Ingreso verificable" valor={formatoMoneda(ingresoVerificable)} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <BloqueDatos
                  titulo="Solicitante"
                  datos={{
                    nombre: datosPersonales?.nombres_apellidos,
                    documento: enmascararDocumento(datosPersonales?.numero_documento),
                    email: datosPersonales?.email,
                    telefono: datosPersonales?.telefono,
                    ciudad: datosPersonales?.ciudad_residencia,
                  }}
                />
                <div className="card p-5">
                  <h3 className="mb-3 font-semibold text-ink-900">Inmueble</h3>
                  {propiedad ? (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                      <dt className="text-ink-400">Dirección</dt>
                      <dd className="truncate text-ink-800">{propiedad.direccion ?? "—"}</dd>
                      <dt className="text-ink-400">Ciudad</dt>
                      <dd className="text-ink-800">{propiedad.ciudad}</dd>
                      <dt className="text-ink-400">Tipo</dt>
                      <dd className="capitalize text-ink-800">{propiedad.tipo}</dd>
                      <dt className="text-ink-400">Canon / precio</dt>
                      <dd className="text-ink-800">{formatoMoneda(propiedad.precio)}</dd>
                      <dt className="text-ink-400">Área</dt>
                      <dd className="text-ink-800">{propiedad.area_m2} m²</dd>
                    </dl>
                  ) : (
                    <p className="text-sm text-ink-400">Cargando inmueble...</p>
                  )}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="mb-2 font-semibold text-ink-900">Resumen financiero</h3>
                <div>
                  <StatLine label="Ingreso bruto" valor={formatoMoneda(ingresoBruto)} />
                  <StatLine label="Ingreso mensual verificable ajustado (IMVA)" valor={formatoMoneda(ingresoVerificable)} />
                  <StatLine label="Cuotas financieras" valor={formatoMoneda(cuotasFinancieras)} />
                  <StatLine label="Flujo post-arriendo" valor={formatoMoneda(flujoPostArriendo)} />
                  <StatLine label="Patrimonio neto" valor={formatoMoneda(patrimonioNeto)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <BloqueDatos titulo="Información laboral" datos={datosLaborales} />
                <BloqueDatos titulo="Garantías y referencias" datos={solicitud.garantias_referencias} />
              </div>
            </div>
          )}

          {tab === "Documentos" && (
            <div className="card divide-y divide-ink-100 p-0">
              {documentos.map((doc) => {
                const info = ETIQUETAS_ESTADO_DOC[doc.estado] ?? ETIQUETAS_ESTADO_DOC.pendiente;
                return (
                  <div key={doc.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${info.dot}`} />
                        <div>
                          <p className="text-sm font-semibold capitalize text-ink-800">{doc.tipo_documento.replace(/_/g, " ")}</p>
                          <p className="text-xs text-ink-400">
                            {doc.cargado_en ? new Date(doc.cargado_en).toLocaleDateString("es-CO") : "Sin fecha"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${info.badge}`}>{info.label}</span>
                        <button
                          type="button"
                          onClick={() => abrirDocumento(params.id, doc.id)}
                          className="text-xs font-semibold text-clay-600 hover:text-clay-700"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          disabled={procesandoDoc === doc.id}
                          onClick={() => revisarDocumento(doc.id, "aprobado")}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocEnRevision(docEnRevision === doc.id ? null : doc.id)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                    {docEnRevision === doc.id && (
                      <div className="mt-3 space-y-2 rounded-lg bg-ink-50 p-3">
                        <textarea
                          value={motivoRechazo[doc.id] ?? ""}
                          onChange={(e) => setMotivoRechazo({ ...motivoRechazo, [doc.id]: e.target.value })}
                          placeholder="Motivo del rechazo"
                          className="input-field min-h-16 text-sm"
                        />
                        <button
                          type="button"
                          disabled={procesandoDoc === doc.id}
                          onClick={() => revisarDocumento(doc.id, "rechazado")}
                          className="rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                        >
                          Confirmar rechazo
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {documentos.length === 0 && <p className="p-5 text-sm text-ink-400">Sin documentos cargados.</p>}
            </div>
          )}

          {tab === "Calidad de datos" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink-900">Calidad y verificabilidad del expediente</h3>
                <button
                  type="button"
                  disabled={cargandoValidacion}
                  onClick={cargarValidacion}
                  className="btn-secondary text-xs"
                >
                  {cargandoValidacion ? "Validando..." : "Reejecutar validación"}
                </button>
              </div>

              {cargandoValidacion && !validacion && (
                <div className="space-y-4">
                  <div className="h-32 animate-pulse rounded-xl bg-ink-100" />
                  <div className="h-24 animate-pulse rounded-xl bg-ink-100" />
                  <div className="h-48 animate-pulse rounded-xl bg-ink-100" />
                </div>
              )}

              {errorValidacion && !cargandoValidacion && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  {errorValidacion}
                </p>
              )}

              {validacion && (
                <>
                  {/* Top row: verificabilidad + resumen */}
                  <div className="card flex flex-wrap items-center gap-6 p-6">
                    <div className="flex items-center gap-4">
                      {(() => {
                        const v = Math.round(validacion.verificabilidad);
                        const { texto, barra } = colorVerificabilidad(v);
                        const r = 34;
                        const c = 2 * Math.PI * r;
                        return (
                          <div className="relative h-24 w-24">
                            <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: "rotate(-90deg)" }}>
                              <circle cx="48" cy="48" r={r} fill="none" stroke="#EFEAE4" strokeWidth="9" />
                              <circle
                                cx="48"
                                cy="48"
                                r={r}
                                fill="none"
                                stroke={barra}
                                strokeWidth="9"
                                strokeLinecap="round"
                                strokeDasharray={`${c * Math.min(1, Math.max(0, v / 100))} ${c}`}
                                className="transition-all duration-700"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={`text-2xl font-bold ${texto}`}>{v}</span>
                              <span className="text-[10px] text-ink-400">/ 100</span>
                            </div>
                          </div>
                        );
                      })()}
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wider text-ink-500">Verificabilidad</p>
                        <p className="mt-0.5 max-w-xs text-xs text-ink-400">
                          Qué tan respaldada está la información del expediente por documentos y fuentes confiables.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                        {validacion.resumen.errores} errores
                      </span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        {validacion.resumen.advertencias} advertencias
                      </span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {validacion.resumen.verificados} verificados de {validacion.resumen.total_campos} campos
                      </span>
                    </div>
                  </div>

                  {/* Hallazgos */}
                  <div className="card p-5">
                    <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-500">Hallazgos</h4>
                    {validacion.hallazgos.length > 0 ? (
                      <div className="space-y-3">
                        {validacion.hallazgos
                          .slice()
                          .sort((a, b) => b.severidad - a.severidad)
                          .map((h, i) => {
                            const estilo = estiloHallazgo(h.severidad);
                            return (
                              <div key={`${h.tipo}-${i}`} className={`rounded-lg border p-4 ${estilo.borde} ${estilo.fondo}`}>
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${estilo.badge}`}>
                                    {h.tipo_etiqueta}
                                  </span>
                                  <p className="text-sm font-bold text-ink-900">{h.titulo}</p>
                                </div>
                                <p className="text-sm text-ink-600">{h.detalle}</p>
                                {h.campos.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {h.campos.map((campo) => (
                                      <span
                                        key={campo}
                                        className="rounded border border-ink-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-ink-600"
                                      >
                                        {campo}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p className="mt-2 text-xs font-semibold text-ink-700">
                                  Acción sugerida: <span className="font-normal text-ink-600">{h.accion}</span>
                                </p>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                          <circle cx="9" cy="9" r="8" stroke="#059669" strokeWidth="1.5" />
                          <path d="M5.5 9.5L8 12L12.5 6.5" stroke="#059669" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="text-sm text-emerald-700">
                          Sin hallazgos — la información del expediente es consistente.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Calidad por campo */}
                  <div className="card p-5">
                    <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-500">Calidad por campo</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs uppercase text-ink-400">
                          <tr>
                            <th className="pb-2 pr-3 font-semibold">Campo</th>
                            <th className="pb-2 pr-3 font-semibold">Valor</th>
                            <th className="pb-2 pr-3 font-semibold">Estado</th>
                            <th className="pb-2 pr-3 font-semibold">Fuente</th>
                            <th className="pb-2 font-semibold">Peso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validacion.calidad.map((c) => (
                            <tr key={c.campo} className="border-t border-ink-100">
                              <td className="py-2 pr-3 text-ink-700">{c.etiqueta}</td>
                              <td className="max-w-[180px] truncate py-2 pr-3 text-ink-800" title={c.valor ?? undefined}>
                                {c.valor ?? "—"}
                              </td>
                              <td className="py-2 pr-3">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                    BADGE_ESTADO_DATO[c.estado] ?? "bg-ink-100 text-ink-600"
                                  }`}
                                >
                                  {c.estado_etiqueta}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-xs text-ink-500">{c.fuente}</td>
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
                                    <div
                                      className={`h-full rounded-full ${
                                        c.peso >= 0.8 ? "bg-emerald-500" : c.peso >= 0.5 ? "bg-amber-500" : "bg-rose-500"
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(0, c.peso * 100))}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-ink-500">{Math.round(c.peso * 100)}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {validacion.calidad.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-4 text-center text-ink-400">
                                Sin campos evaluados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "Motor" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink-900">Resultado del motor automático</h3>
                <button type="button" disabled={reejecutando} onClick={reejecutarMotor} className="btn-secondary text-xs">
                  {reejecutando ? "Re-ejecutando..." : "Re-ejecutar motor"}
                </button>
              </div>

              {resultado ? (
                <>
                  <div className="card p-5">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">Score por grupo</h4>
                    <div className="space-y-3">
                      {Array.from(variablesPorGrupo.entries()).map(([grupo, info]) => (
                        <div key={grupo}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="text-ink-600">{ETIQUETAS_GRUPO[grupo] ?? grupo}</span>
                            <span className="font-semibold text-ink-800">{info.puntos.toFixed(1)} pts</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
                            <div
                              className="h-full rounded-full bg-clay-500 transition-all duration-500"
                              style={{ width: `${Math.max(2, (Math.abs(info.puntos) / maxPuntosGrupo) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      {variablesPorGrupo.size === 0 && <p className="text-sm text-ink-400">Sin variables evaluadas.</p>}
                    </div>
                  </div>

                  <div className="card p-5">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">Reglas / variables disparadas</h4>
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase text-ink-400">
                        <tr>
                          <th className="pb-2">Variable</th>
                          <th className="pb-2">Banda</th>
                          <th className="pb-2 text-right">Puntos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.variables_evaluadas.map((v) => (
                          <tr key={v.nombre} className="border-t border-ink-100">
                            <td className="py-1.5 capitalize text-ink-700">{v.nombre.replace(/_/g, " ")}</td>
                            <td className="py-1.5 text-ink-500">{v.banda}</td>
                            <td className="py-1.5 text-right font-semibold text-ink-800">{v.puntaje_ponderado}</td>
                          </tr>
                        ))}
                        {resultado.variables_evaluadas.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-ink-400">
                              Sin reglas disparadas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-400">Esta solicitud aún no tiene un resultado del motor.</p>
              )}
            </div>
          )}

          {tab === "Auditoría" && (
            <div className="card p-5">
              <h3 className="mb-4 font-semibold text-ink-900">Historial de cambios de estado</h3>
              <ol className="relative space-y-6 border-l-2 border-ink-100 pl-6">
                {auditoria
                  .slice()
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((e) => (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-white bg-clay-600 shadow" />
                      <p className="text-xs text-ink-400">{new Date(e.timestamp).toLocaleString("es-CO")}</p>
                      <p className="text-sm font-semibold capitalize text-ink-800">{e.accion.replace(/_/g, " ")}</p>
                      <p className="text-xs text-ink-500">{e.actor_id ? `Usuario ${e.actor_id.slice(0, 8)}` : "Sistema"}</p>
                      {e.payload_despues && (
                        <p className="mt-1 truncate text-xs text-ink-400" title={JSON.stringify(e.payload_despues)}>
                          {JSON.stringify(e.payload_despues)}
                        </p>
                      )}
                    </li>
                  ))}
                {auditoria.length === 0 && <p className="text-sm text-ink-400">Sin eventos de auditoría todavía.</p>}
              </ol>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------ */}
        {/*  Sidebar                                                      */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-ink-900">Tomar decisión</h3>
            <label className="label-field">Decisión</label>
            <select
              value={decisionSeleccionada}
              onChange={(e) => setDecisionSeleccionada(e.target.value as typeof decisionSeleccionada)}
              className="input-field"
            >
              <option value="aprobada">Aprobar</option>
              <option value="rechazada">Rechazar</option>
              <option value="solicitar_info">Solicitar información adicional</option>
            </select>
            <label className="label-field mt-3">Comentario</label>
            <textarea
              value={comentarioDecision}
              onChange={(e) => setComentarioDecision(e.target.value)}
              placeholder="Comentario obligatorio — queda registrado en el log de auditoría"
              className="input-field min-h-24"
            />
            <button type="button" disabled={enviandoDecision} onClick={decidir} className="btn-primary mt-3 w-full">
              {enviandoDecision ? "Guardando..." : "Registrar decisión"}
            </button>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-ink-900">Asignar analista</h3>
            <select value={analistaId} onChange={(e) => setAnalistaId(e.target.value)} className="input-field">
              <option value="">Selecciona un analista</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre_completo} · {u.rol}
                </option>
              ))}
            </select>
            <button type="button" disabled={asignando || !analistaId} onClick={asignar} className="btn-secondary mt-3 w-full">
              {asignando ? "Asignando..." : "Asignar"}
            </button>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-ink-900">Comentarios</h3>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {comentarios.map((c, i) => {
                const nombreAutor: string = c.autor_nombre ?? c.nombre_completo ?? "Usuario";
                const inicial = nombreAutor[0]?.toUpperCase() ?? "U";
                return (
                  <div key={c.id ?? i} className="rounded-lg bg-ink-50 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-clay-600 text-[11px] font-bold text-white">
                        {inicial}
                      </span>
                      <p className="text-xs font-semibold text-ink-700">{nombreAutor}</p>
                      {c.creado_en && (
                        <p className="ml-auto text-[11px] text-ink-400">{new Date(c.creado_en).toLocaleDateString("es-CO")}</p>
                      )}
                    </div>
                    <p className="text-sm text-ink-700">{c.texto}</p>
                  </div>
                );
              })}
              {comentarios.length === 0 && <p className="text-sm text-ink-400">Sin comentarios todavía.</p>}
            </div>
            <textarea
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder="Agregar comentario"
              className="input-field mt-3 min-h-16 text-sm"
            />
            <button
              type="button"
              disabled={enviandoComentario || nuevoComentario.trim().length < 2}
              onClick={enviarComentario}
              className="btn-secondary mt-2 w-full"
            >
              {enviandoComentario ? "Enviando..." : "Comentar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
