"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { crearVersionMotor, listarVersionesMotor } from "@/lib/api";
import type { MotorDecisionConfig, MotorDecisionCrearInput, ReglaMotor } from "@/lib/types";

/* ================================================================== */
/*  Constantes de dominio                                              */
/* ================================================================== */

const GRUPOS_ORDEN = ["capacidad", "estabilidad", "endeudamiento", "verificabilidad", "historial", "fraude"] as const;
type Grupo = (typeof GRUPOS_ORDEN)[number];

const ETIQUETAS_GRUPO: Record<string, string> = {
  capacidad: "Capacidad de pago",
  estabilidad: "Estabilidad",
  endeudamiento: "Endeudamiento",
  verificabilidad: "Verificabilidad",
  historial: "Historial",
  fraude: "Antifraude",
};

const ETIQUETAS_PARAMETRO: Record<string, string> = {
  factor_variable: "Factor de reconocimiento de ingresos variables",
  factor_otros: "Factor de reconocimiento de otros ingresos",
  cobertura_minima: "Cobertura mínima (sin codeudor)",
  umbral_preaprobado: "Umbral de preaprobación",
  umbral_requisitos: "Umbral de requisitos",
  umbral_estudio: "Umbral de estudio manual",
  fraude_rechazo: "Umbral de rechazo por fraude",
  fraude_revision: "Umbral de revisión por fraude",
  verificabilidad_minima: "Verificabilidad mínima",
};

const OPERADORES = [">=", "<=", ">", "<", "=", "!="];

interface ColorSpec {
  hex: string;
  bg: string; // solid bg for badges/icons
  bgSoft: string; // light bg for cards
  border: string;
  text: string;
  ring: string;
}

const GRUPO_COLORES: Record<string, ColorSpec> = {
  capacidad: { hex: "#10b981", bg: "bg-emerald-500", bgSoft: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", ring: "ring-emerald-400" },
  estabilidad: { hex: "#0ea5e9", bg: "bg-sky-500", bgSoft: "bg-sky-50", border: "border-sky-300", text: "text-sky-700", ring: "ring-sky-400" },
  endeudamiento: { hex: "#a855f7", bg: "bg-purple-500", bgSoft: "bg-purple-50", border: "border-purple-300", text: "text-purple-700", ring: "ring-purple-400" },
  verificabilidad: { hex: "#f59e0b", bg: "bg-amber-500", bgSoft: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", ring: "ring-amber-400" },
  historial: { hex: "#fb7185", bg: "bg-rose-400", bgSoft: "bg-rose-50", border: "border-rose-300", text: "text-rose-700", ring: "ring-rose-400" },
  fraude: { hex: "#dc2626", bg: "bg-red-600", bgSoft: "bg-red-50", border: "border-red-300", text: "text-red-700", ring: "ring-red-400" },
};

const FINAL_DEFS = [
  { key: "preaprobado", label: "Preaprobado", hex: "#10b981", bg: "bg-emerald-500", bgSoft: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700" },
  { key: "requisitos", label: "Con requisitos", hex: "#f59e0b", bg: "bg-amber-500", bgSoft: "bg-amber-50", border: "border-amber-300", text: "text-amber-700" },
  { key: "estudio", label: "Estudio manual", hex: "#0ea5e9", bg: "bg-sky-500", bgSoft: "bg-sky-50", border: "border-sky-300", text: "text-sky-700" },
  { key: "rechazado", label: "Rechazado", hex: "#dc2626", bg: "bg-red-600", bgSoft: "bg-red-50", border: "border-red-300", text: "text-red-700" },
] as const;

/* ================================================================== */
/*  Layout engine (puro, sin librerías)                                */
/* ================================================================== */

type NodeType = "root" | "group" | "rule" | "score" | "final";

interface LayoutNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  w: number;
  h: number;
  grupo?: string;
  regla?: ReglaMotor;
  finalKey?: string;
}

interface LayoutEdge {
  id: string;
  from: string;
  to: string;
  color: string;
}

interface Layout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}

const RULE_W = 176, RULE_H = 78;
const GROUP_W = 224, GROUP_H = 92;
const ROOT_W = 148, ROOT_H = 84;
const SCORE_W = 200, SCORE_H = 108;
const FINAL_W = 190, FINAL_H = 86;
const GAP_X = 60, GAP_Y = 18, ROW_GAP = 34;
const MAX_PER_LINE = 4;

function agruparReglas(reglas: ReglaMotor[]): Record<string, ReglaMotor[]> {
  const grupos: Record<string, ReglaMotor[]> = {};
  for (const regla of reglas) {
    (grupos[regla.grupo] ??= []).push(regla);
  }
  return grupos;
}

function construirLayout(
  pesos: Record<string, number>,
  reglas: ReglaMotor[],
  direction: "horizontal" | "vertical"
): Layout {
  const grupos = agruparReglas(reglas);
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  const colGroup = ROOT_W + GAP_X;
  const colRules = colGroup + GROUP_W + GAP_X;

  let offset = 0;
  const gruposPresentes = GRUPOS_ORDEN.filter((g) => g in pesos || (grupos[g] && grupos[g].length));

  for (const grupo of gruposPresentes) {
    const reglasGrupo = (grupos[grupo] || []).slice().sort((a, b) => a.prioridad - b.prioridad);
    const rows = Math.max(1, Math.ceil(reglasGrupo.length / MAX_PER_LINE));
    const blockH = Math.max(GROUP_H, rows * RULE_H + (rows - 1) * GAP_Y);
    const groupY = offset + blockH / 2 - GROUP_H / 2;

    nodes.push({ id: `group:${grupo}`, type: "group", grupo, x: colGroup, y: groupY, w: GROUP_W, h: GROUP_H });
    edges.push({ id: `root->${grupo}`, from: "root", to: `group:${grupo}`, color: GRUPO_COLORES[grupo]?.hex ?? "#78716c" });

    reglasGrupo.forEach((r, idx) => {
      const col = idx % MAX_PER_LINE;
      const row = Math.floor(idx / MAX_PER_LINE);
      const rx = colRules + col * (RULE_W + GAP_X);
      const ry = offset + row * (RULE_H + GAP_Y);
      nodes.push({ id: `rule:${r.id}`, type: "rule", regla: r, grupo, x: rx, y: ry, w: RULE_W, h: RULE_H });
      edges.push({ id: `group:${grupo}->${r.id}`, from: `group:${grupo}`, to: `rule:${r.id}`, color: GRUPO_COLORES[grupo]?.hex ?? "#78716c" });
    });

    offset += blockH + ROW_GAP;
  }

  const totalMain = Math.max(offset - ROW_GAP, ROOT_H);

  nodes.unshift({ id: "root", type: "root", x: 0, y: totalMain / 2 - ROOT_H / 2, w: ROOT_W, h: ROOT_H });

  const colScore = colRules + MAX_PER_LINE * (RULE_W + GAP_X) + GAP_X;
  nodes.push({ id: "score", type: "score", x: colScore, y: totalMain / 2 - SCORE_H / 2, w: SCORE_W, h: SCORE_H });
  for (const grupo of gruposPresentes) {
    edges.push({ id: `${grupo}->score`, from: `group:${grupo}`, to: "score", color: GRUPO_COLORES[grupo]?.hex ?? "#78716c" });
  }

  const colFinal = colScore + SCORE_W + GAP_X;
  const finalsH = FINAL_DEFS.length * FINAL_H + (FINAL_DEFS.length - 1) * GAP_Y;
  let fy = totalMain / 2 - finalsH / 2;
  for (const f of FINAL_DEFS) {
    nodes.push({ id: `final:${f.key}`, type: "final", finalKey: f.key, x: colFinal, y: fy, w: FINAL_W, h: FINAL_H });
    edges.push({ id: `score->${f.key}`, from: "score", to: `final:${f.key}`, color: f.hex });
    fy += FINAL_H + GAP_Y;
  }

  const width = colFinal + FINAL_W;
  const height = Math.max(totalMain, finalsH);

  if (direction === "vertical") {
    // Transponer: lo que era eje-x (flujo) pasa a ser eje-y, y viceversa.
    const transposed = nodes.map((n) => ({ ...n, x: n.y, y: n.x }));
    return { nodes: transposed, edges, width: height, height: width };
  }

  return { nodes, edges, width, height };
}

function anchorOut(node: LayoutNode, direction: "horizontal" | "vertical") {
  return direction === "horizontal"
    ? { x: node.x + node.w, y: node.y + node.h / 2 }
    : { x: node.x + node.w / 2, y: node.y + node.h };
}
function anchorIn(node: LayoutNode, direction: "horizontal" | "vertical") {
  return direction === "horizontal" ? { x: node.x, y: node.y + node.h / 2 } : { x: node.x + node.w / 2, y: node.y };
}

function bezierPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  direction: "horizontal" | "vertical"
) {
  if (direction === "horizontal") {
    const dx = Math.max(30, (to.x - from.x) / 2);
    return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
  }
  const dy = Math.max(30, (to.y - from.y) / 2);
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + dy}, ${to.x} ${to.y - dy}, ${to.x} ${to.y}`;
}

/* ================================================================== */
/*  Simulación simplificada                                            */
/* ================================================================== */

interface ResultadoSimulacion {
  puntajePorGrupo: Record<string, number>;
  reglasActivadas: Set<string>;
  scoreTotal: number;
  decision: string;
}

function simular(pesos: Record<string, number>, reglas: ReglaMotor[], parametros: Record<string, number>, seed: number): ResultadoSimulacion {
  const grupos = agruparReglas(reglas);
  const reglasActivadas = new Set<string>();
  const puntajePorGrupo: Record<string, number> = {};
  let acumulado = 0;
  let rnd = seed;
  const next = () => {
    rnd = (rnd * 1103515245 + 12345) % 2147483648;
    return rnd / 2147483648;
  };

  for (const grupo of Object.keys(pesos)) {
    const reglasGrupo = (grupos[grupo] || []).filter((r) => r.activa);
    let base = 60; // puntaje base sobre 100 por grupo
    for (const r of reglasGrupo) {
      const dado = next();
      const dispara = r.tipo === "escala" ? dado > 0.35 : dado > 0.55;
      if (dispara) {
        reglasActivadas.add(r.id);
        base += r.tipo === "ajuste" ? r.puntos : (r.puntos - 60) * 0.4;
      }
    }
    base = Math.max(0, Math.min(100, base));
    puntajePorGrupo[grupo] = base;
    acumulado += (base * (pesos[grupo] ?? 0)) / 100;
  }

  const scoreTotal = Math.round((acumulado / 100) * 1000);
  const uPre = parametros.umbral_preaprobado ?? 780;
  const uReq = parametros.umbral_requisitos ?? 650;
  const uEst = parametros.umbral_estudio ?? 500;
  let decision = "rechazado";
  if (scoreTotal >= uPre) decision = "preaprobado";
  else if (scoreTotal >= uReq) decision = "requisitos";
  else if (scoreTotal >= uEst) decision = "estudio";

  return { puntajePorGrupo, reglasActivadas, scoreTotal, decision };
}

/* ================================================================== */
/*  Iconos                                                              */
/* ================================================================== */

function IconZoomIn() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="9" cy="9" r="6" />
      <line x1="13.5" y1="13.5" x2="18" y2="18" />
      <line x1="9" y1="6.5" x2="9" y2="11.5" />
      <line x1="6.5" y1="9" x2="11.5" y2="9" />
    </svg>
  );
}
function IconZoomOut() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="9" cy="9" r="6" />
      <line x1="13.5" y1="13.5" x2="18" y2="18" />
      <line x1="6.5" y1="9" x2="11.5" y2="9" />
    </svg>
  );
}
function IconFit() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V4a1 1 0 011-1h3M17 7V4a1 1 0 00-1-1h-3M3 13v3a1 1 0 001 1h3M17 13v3a1 1 0 01-1 1h-3" />
    </svg>
  );
}
function IconLayout() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" rx="1.5" />
      <line x1="3" y1="8" x2="17" y2="8" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="5" y1="5" x2="15" y2="15" />
      <line x1="15" y1="5" x2="5" y2="15" />
    </svg>
  );
}
function IconPlay() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6 4.5v11l9-5.5-9-5.5z" />
    </svg>
  );
}

/* ================================================================== */
/*  Página                                                              */
/* ================================================================== */

type Seleccion = { kind: "group"; grupo: string } | { kind: "rule"; id: string } | { kind: "final"; key: string } | null;

export default function MotorVisualPage() {
  const [versiones, setVersiones] = useState<MotorDecisionConfig[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [pesos, setPesos] = useState<Record<string, number> | null>(null);
  const [parametros, setParametros] = useState<Record<string, number> | null>(null);
  const [reglas, setReglas] = useState<ReglaMotor[] | null>(null);
  const [dirty, setDirty] = useState(false);

  const [direction, setDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [zoom, setZoom] = useState(1);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [search, setSearch] = useState("");
  const [soloActivas, setSoloActivas] = useState(false);

  const [simResultado, setSimResultado] = useState<ResultadoSimulacion | null>(null);
  const [seedSim, setSeedSim] = useState(1);

  const [draggedRuleId, setDraggedRuleId] = useState<string | null>(null);

  const [publicando, setPublicando] = useState(false);
  const [modalPublicar, setModalPublicar] = useState(false);
  const [versionNueva, setVersionNueva] = useState("");
  const [notas, setNotas] = useState("");
  const [publicarError, setPublicarError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(() => {
    listarVersionesMotor()
      .then((vs) => {
        setVersiones(vs);
        const activa = vs.find((v) => v.activa) ?? vs[0];
        if (activa) {
          setPesos({ ...activa.pesos });
          setParametros({ ...activa.parametros });
          setReglas(JSON.parse(JSON.stringify(activa.reglas)));
          setDirty(false);
        }
      })
      .catch(() => setError("No pudimos cargar el motor de decisión."));
  }, []);

  useEffect(cargar, [cargar]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const activaOriginal = useMemo(() => versiones.find((v) => v.activa) ?? versiones[0], [versiones]);

  const reglasVisibles = useMemo(() => {
    if (!reglas) return [];
    return reglas.filter((r) => {
      if (soloActivas && !r.activa) return false;
      if (search.trim() && !r.nombre.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [reglas, soloActivas, search]);

  const layout = useMemo(() => {
    if (!pesos || !reglas) return null;
    return construirLayout(pesos, reglasVisibles, direction);
  }, [pesos, reglas, reglasVisibles, direction]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, LayoutNode>();
    layout?.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [layout]);

  const sumaPesos = useMemo(() => (pesos ? Object.values(pesos).reduce((a, b) => a + b, 0) : 0), [pesos]);

  function marcarDirty() {
    setDirty(true);
    setSimResultado(null);
  }

  function actualizarPeso(grupo: string, valor: number) {
    setPesos((prev) => (prev ? { ...prev, [grupo]: valor } : prev));
    marcarDirty();
  }
  function actualizarParametro(clave: string, valor: number) {
    setParametros((prev) => (prev ? { ...prev, [clave]: valor } : prev));
    marcarDirty();
  }
  function actualizarRegla(id: string, patch: Partial<ReglaMotor>) {
    setReglas((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev));
    marcarDirty();
  }
  function toggleReglaActiva(id: string) {
    setReglas((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, activa: !r.activa } : r)) : prev));
    marcarDirty();
  }

  function handleDropRule(targetId: string) {
    if (!draggedRuleId || draggedRuleId === targetId) return;
    setReglas((prev) => {
      if (!prev) return prev;
      const dragged = prev.find((r) => r.id === draggedRuleId);
      const target = prev.find((r) => r.id === targetId);
      if (!dragged || !target || dragged.grupo !== target.grupo) return prev;
      const grupoRules = prev.filter((r) => r.grupo === target.grupo).sort((a, b) => a.prioridad - b.prioridad);
      const others = prev.filter((r) => r.grupo !== target.grupo);
      const filtered = grupoRules.filter((r) => r.id !== draggedRuleId);
      const idx = filtered.findIndex((r) => r.id === targetId);
      filtered.splice(idx, 0, dragged);
      const reindexed = filtered.map((r, i) => ({ ...r, prioridad: i + 1 }));
      return [...others, ...reindexed];
    });
    marcarDirty();
    setDraggedRuleId(null);
  }

  function resetCambios() {
    if (!activaOriginal) return;
    setPesos({ ...activaOriginal.pesos });
    setParametros({ ...activaOriginal.parametros });
    setReglas(JSON.parse(JSON.stringify(activaOriginal.reglas)));
    setDirty(false);
    setSimResultado(null);
    setSeleccion(null);
  }

  function correrSimulacion() {
    if (!pesos || !reglas || !parametros) return;
    const nuevaSeed = seedSim + 1;
    setSeedSim(nuevaSeed);
    setSimResultado(simular(pesos, reglas, parametros, nuevaSeed * 7919));
  }

  function fitToScreen() {
    if (!layout || !viewportRef.current) return;
    const vw = viewportRef.current.clientWidth - 64;
    const vh = viewportRef.current.clientHeight - 64;
    const scale = Math.min(vw / layout.width, vh / layout.height, 1.2);
    setZoom(Math.max(0.25, Math.min(1.4, scale)));
  }

  useEffect(() => {
    if (layout) fitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, versiones]);

  async function publicar() {
    if (!pesos || !parametros || !reglas) return;
    if (Math.round(sumaPesos) !== 100) {
      setPublicarError(`Los pesos de los grupos deben sumar 100 (suman ${sumaPesos}).`);
      return;
    }
    if (!versionNueva.trim() || notas.trim().length < 10) {
      setPublicarError("Indica la versión y un motivo de al menos 10 caracteres.");
      return;
    }
    setPublicarError(null);
    setPublicando(true);
    try {
      const input: MotorDecisionCrearInput = { version: versionNueva, pesos, parametros, reglas, notas };
      await crearVersionMotor(input);
      setModalPublicar(false);
      setVersionNueva("");
      setNotas("");
      setDirty(false);
      setToast("Nueva versión publicada correctamente.");
      cargar();
    } catch {
      setPublicarError("No pudimos publicar la nueva versión.");
    } finally {
      setPublicando(false);
    }
  }

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!layout || !pesos || !reglas || !parametros) {
    return <p className="text-ink-500">Cargando motor de decisión...</p>;
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[600px] flex-col gap-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-ink-900">Árbol de decisión</h1>
            {dirty && (
              <span className="inline-flex items-center rounded-full bg-clay-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-clay-700">
                Cambios sin publicar
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Versión activa: <strong>{activaOriginal?.version}</strong> · {reglas.length} reglas ·{" "}
            <Link href="/admin/motor" className="underline decoration-ink-300 underline-offset-2 hover:text-ink-800">
              ver vista de tablas
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={correrSimulacion} className="btn-secondary gap-2 !px-4 !py-2 text-xs">
            <IconPlay /> Probar con datos de ejemplo
          </button>
          {dirty && (
            <button type="button" onClick={resetCambios} className="btn-secondary !px-4 !py-2 text-xs">
              Descartar cambios
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setPublicarError(null);
              setModalPublicar(true);
            }}
            disabled={!dirty}
            className="btn-primary !px-5 !py-2 text-xs"
          >
            Publicar nueva versión
          </button>
        </div>
      </div>

      {/* ---------- Barra de controles ---------- */}
      <div className="card flex flex-wrap items-center gap-3 p-2.5">
        <div className="flex items-center gap-1 rounded-lg border border-ink-100 p-1">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.25, z - 0.15))} className="rounded-md p-1.5 text-ink-500 transition hover:bg-ink-50" title="Alejar">
            <IconZoomOut />
          </button>
          <span className="w-12 text-center text-xs font-semibold text-ink-600">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(2, z + 0.15))} className="rounded-md p-1.5 text-ink-500 transition hover:bg-ink-50" title="Acercar">
            <IconZoomIn />
          </button>
          <button type="button" onClick={fitToScreen} className="ml-1 flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-ink-500 transition hover:bg-ink-50" title="Ajustar a pantalla">
            <IconFit /> Ajustar
          </button>
        </div>

        <button
          type="button"
          onClick={() => setDirection((d) => (d === "horizontal" ? "vertical" : "horizontal"))}
          className="flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-ink-50"
        >
          <IconLayout /> {direction === "horizontal" ? "Horizontal" : "Vertical"}
        </button>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar regla por nombre..."
          className="input-field !w-56 !py-1.5 text-xs"
        />

        <label className="flex items-center gap-1.5 text-xs font-medium text-ink-600">
          <input type="checkbox" checked={soloActivas} onChange={(e) => setSoloActivas(e.target.checked)} className="h-3.5 w-3.5 rounded border-ink-300" />
          Solo activas
        </label>

        <span className={`ml-auto text-xs font-semibold ${Math.round(sumaPesos) !== 100 ? "text-rose-600" : "text-emerald-600"}`}>
          Suma de pesos: {sumaPesos}%
        </span>

        {simResultado && (
          <span className="flex items-center gap-2 rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-700">
            Score simulado: {simResultado.scoreTotal}
            <span
              className="rounded-full px-2 py-0.5 text-[10px] uppercase text-white"
              style={{ backgroundColor: FINAL_DEFS.find((f) => f.key === simResultado.decision)?.hex ?? "#78716c" }}
            >
              {FINAL_DEFS.find((f) => f.key === simResultado.decision)?.label ?? simResultado.decision}
            </span>
          </span>
        )}
      </div>

      {/* ---------- Lienzo ---------- */}
      <div ref={viewportRef} className="card relative flex-1 overflow-auto bg-[radial-gradient(circle,#e7e1db_1px,transparent_1px)] bg-[length:22px_22px]">
        <div
          ref={canvasRef}
          className="relative"
          style={{
            width: layout.width * zoom + 120,
            height: layout.height * zoom + 120,
            padding: 60,
          }}
        >
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", position: "relative", width: layout.width, height: layout.height }}>
            {/* SVG de conexiones */}
            <svg width={layout.width} height={layout.height} className="pointer-events-none absolute left-0 top-0 overflow-visible">
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#a8a29e" />
                </marker>
              </defs>
              {layout.edges.map((e) => {
                const fromNode = nodeMap.get(e.from);
                const toNode = nodeMap.get(e.to);
                if (!fromNode || !toNode) return null;
                const activa =
                  simResultado && fromNode.type === "rule" && fromNode.regla
                    ? simResultado.reglasActivadas.has(fromNode.regla.id)
                    : false;
                const p1 = anchorOut(fromNode, direction);
                const p2 = anchorIn(toNode, direction);
                return (
                  <path
                    key={e.id}
                    d={bezierPath(p1, p2, direction)}
                    fill="none"
                    stroke={e.color}
                    strokeWidth={activa ? 2.6 : 1.4}
                    strokeOpacity={activa ? 0.85 : 0.35}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {/* Nodos */}
            {layout.nodes.map((n) => (
              <NodeCard
                key={n.id}
                node={n}
                seleccionado={
                  (seleccion?.kind === "group" && n.type === "group" && seleccion.grupo === n.grupo) ||
                  (seleccion?.kind === "rule" && n.type === "rule" && n.regla?.id === seleccion.id) ||
                  (seleccion?.kind === "final" && n.type === "final" && n.finalKey === seleccion.key)
                }
                peso={n.grupo ? pesos[n.grupo] : undefined}
                reglasDelGrupo={n.type === "group" && n.grupo ? reglas.filter((r) => r.grupo === n.grupo) : undefined}
                simActiva={simResultado && n.type === "rule" && n.regla ? simResultado.reglasActivadas.has(n.regla.id) : false}
                simPuntaje={simResultado && n.type === "group" && n.grupo ? simResultado.puntajePorGrupo[n.grupo] : undefined}
                simResultado={n.type === "score" ? simResultado : undefined}
                simDecision={n.type === "final" && n.finalKey ? simResultado?.decision === n.finalKey : false}
                onClick={() => {
                  if (n.type === "group" && n.grupo) setSeleccion({ kind: "group", grupo: n.grupo });
                  else if (n.type === "rule" && n.regla) setSeleccion({ kind: "rule", id: n.regla.id });
                  else if (n.type === "final" && n.finalKey) setSeleccion({ kind: "final", key: n.finalKey });
                }}
                onToggleActiva={n.type === "rule" && n.regla ? () => toggleReglaActiva(n.regla!.id) : undefined}
                onDragStart={n.type === "rule" && n.regla ? () => setDraggedRuleId(n.regla!.id) : undefined}
                onDrop={n.type === "rule" && n.regla ? () => handleDropRule(n.regla!.id) : undefined}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Panel editor lateral ---------- */}
      <EditorPanel
        seleccion={seleccion}
        onClose={() => setSeleccion(null)}
        pesos={pesos}
        parametros={parametros}
        reglas={reglas}
        onActualizarPeso={actualizarPeso}
        onActualizarParametro={actualizarParametro}
        onActualizarRegla={actualizarRegla}
        onToggleActiva={toggleReglaActiva}
      />

      {/* ---------- Modal de publicación ---------- */}
      {modalPublicar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 animate-overlay-in" onClick={() => setModalPublicar(false)}>
          <div className="card w-full max-w-md animate-modal-in space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg font-semibold text-ink-900">Publicar nueva versión</h2>
            <p className="text-sm text-ink-500">
              Se creará una nueva versión del motor con los cambios realizados en el árbol visual ({reglas.length} reglas, pesos suman {sumaPesos}%).
            </p>
            <div>
              <label className="label-field">Código de versión (ej. v3.5)</label>
              <input value={versionNueva} onChange={(e) => setVersionNueva(e.target.value)} className="input-field" placeholder="v3.5" />
            </div>
            <div>
              <label className="label-field">Motivo del cambio</label>
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="input-field min-h-24" placeholder="Describe brevemente por qué se ajusta el motor..." />
            </div>
            {publicarError && <p className="text-sm text-rose-600">{publicarError}</p>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalPublicar(false)} className="btn-secondary !px-4 !py-2 text-xs">
                Cancelar
              </button>
              <button type="button" onClick={publicar} disabled={publicando} className="btn-primary !px-4 !py-2 text-xs">
                {publicando ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Toast ---------- */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-toast-in rounded-xl bg-ink-900 px-4 py-3 text-sm font-medium text-white shadow-card">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Tarjeta de nodo                                                    */
/* ================================================================== */

function NodeCard({
  node,
  seleccionado,
  peso,
  reglasDelGrupo,
  simActiva,
  simPuntaje,
  simResultado,
  simDecision,
  onClick,
  onToggleActiva,
  onDragStart,
  onDrop,
}: {
  node: LayoutNode;
  seleccionado: boolean;
  peso?: number;
  reglasDelGrupo?: ReglaMotor[];
  simActiva?: boolean;
  simPuntaje?: number;
  simResultado?: ResultadoSimulacion | null;
  simDecision?: boolean;
  onClick: () => void;
  onToggleActiva?: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
}) {
  const base: React.CSSProperties = {
    position: "absolute",
    left: node.x,
    top: node.y,
    width: node.w,
    height: node.h,
  };

  if (node.type === "root") {
    return (
      <div
        style={base}
        className="flex flex-col items-center justify-center rounded-xl2 border border-ink-200 bg-ink-900 text-center shadow-card"
      >
        <p className="text-[10px] uppercase tracking-wider text-ink-300">Entrada</p>
        <p className="font-display text-sm font-semibold text-white">Solicitud</p>
      </div>
    );
  }

  if (node.type === "group" && node.grupo) {
    const c = GRUPO_COLORES[node.grupo];
    const activas = (reglasDelGrupo ?? []).filter((r) => r.activa).length;
    return (
      <button
        type="button"
        onClick={onClick}
        style={base}
        className={`flex flex-col justify-between rounded-xl2 border ${c.border} ${c.bgSoft} p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lg ${
          seleccionado ? `ring-2 ${c.ring} ring-offset-2` : ""
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className={`font-display text-sm font-semibold leading-tight ${c.text}`}>{ETIQUETAS_GRUPO[node.grupo] ?? node.grupo}</p>
          <span className={`shrink-0 rounded-full ${c.bg} px-2 py-0.5 text-[11px] font-bold text-white`}>{peso}%</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-ink-500">
          <span>
            {activas}/{reglasDelGrupo?.length ?? 0} reglas activas
          </span>
          {typeof simPuntaje === "number" && (
            <span className={`font-semibold ${c.text}`}>{Math.round(simPuntaje)} pts</span>
          )}
        </div>
      </button>
    );
  }

  if (node.type === "rule" && node.regla) {
    const c = GRUPO_COLORES[node.grupo ?? ""] ?? GRUPO_COLORES.capacidad;
    const r = node.regla;
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={onClick}
        style={base}
        className={`flex cursor-pointer flex-col justify-between rounded-lg border bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
          r.activa ? "border-ink-100" : "border-dashed border-ink-200 opacity-45"
        } ${seleccionado ? `ring-2 ${c.ring} ring-offset-1` : ""} ${simActiva ? "ring-2 ring-offset-1" : ""}`}
      >
        <div className="flex items-start justify-between gap-1.5">
          <p className="line-clamp-2 text-[11.5px] font-semibold leading-tight text-ink-800">{r.nombre}</p>
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: c.hex }}
            title={ETIQUETAS_GRUPO[node.grupo ?? ""]}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-ink-400">
            {r.variable} {r.operador} {r.valor}
          </span>
          <span className={`text-[11px] font-bold ${r.puntos >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {r.puntos > 0 && r.tipo === "ajuste" ? "+" : ""}
            {r.puntos}
          </span>
        </div>
        <label className="flex items-center gap-1 pt-0.5" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={r.activa} onChange={onToggleActiva} className="h-3 w-3 rounded border-ink-300" />
          <span className="text-[9px] uppercase tracking-wide text-ink-400">{r.activa ? "Activa" : "Inactiva"}</span>
        </label>
      </div>
    );
  }

  if (node.type === "score") {
    return (
      <div
        style={base}
        className="flex flex-col items-center justify-center gap-1 rounded-xl2 border border-ink-800 bg-gradient-to-br from-ink-800 to-ink-900 p-3 text-center shadow-card"
      >
        <p className="text-[10px] uppercase tracking-wider text-ink-300">Resultado</p>
        <p className="font-display text-lg font-bold text-white">Score total</p>
        {simResultado ? (
          <p className="text-2xl font-bold text-clay-300">{simResultado.scoreTotal}</p>
        ) : (
          <p className="text-[10px] text-ink-400">Ejecuta una simulación</p>
        )}
      </div>
    );
  }

  if (node.type === "final" && node.finalKey) {
    const f = FINAL_DEFS.find((x) => x.key === node.finalKey)!;
    return (
      <button
        type="button"
        onClick={onClick}
        style={base}
        className={`flex flex-col items-center justify-center gap-1 rounded-xl2 border p-3 text-center shadow-card transition hover:-translate-y-0.5 ${f.border} ${f.bgSoft} ${
          seleccionado ? "ring-2 ring-offset-2" : ""
        } ${simDecision ? "scale-[1.04] ring-2 ring-offset-2" : ""}`}
      >
        <span className={`rounded-full ${f.bg} px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white`}>{f.label}</span>
        <span className={`text-[10px] ${f.text}`}>
          {node.finalKey === "preaprobado" && "≥ umbral preaprobado"}
          {node.finalKey === "requisitos" && "≥ umbral requisitos"}
          {node.finalKey === "estudio" && "≥ umbral estudio"}
          {node.finalKey === "rechazado" && "< umbral estudio"}
        </span>
      </button>
    );
  }

  return null;
}

/* ================================================================== */
/*  Panel de edición (slide-in)                                        */
/* ================================================================== */

function EditorPanel({
  seleccion,
  onClose,
  pesos,
  parametros,
  reglas,
  onActualizarPeso,
  onActualizarParametro,
  onActualizarRegla,
  onToggleActiva,
}: {
  seleccion: Seleccion;
  onClose: () => void;
  pesos: Record<string, number>;
  parametros: Record<string, number>;
  reglas: ReglaMotor[];
  onActualizarPeso: (grupo: string, valor: number) => void;
  onActualizarParametro: (clave: string, valor: number) => void;
  onActualizarRegla: (id: string, patch: Partial<ReglaMotor>) => void;
  onToggleActiva: (id: string) => void;
}) {
  const abierto = seleccion !== null;

  const regla = seleccion?.kind === "rule" ? reglas.find((r) => r.id === seleccion.id) : undefined;
  const reglasGrupo = seleccion?.kind === "group" ? reglas.filter((r) => r.grupo === seleccion.grupo).sort((a, b) => a.prioridad - b.prioridad) : [];

  return (
    <>
      {abierto && <div className="fixed inset-0 z-40 animate-overlay-in bg-ink-900/20" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm transform overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          abierto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {abierto && (
          <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink-900">
                {seleccion?.kind === "group" && (ETIQUETAS_GRUPO[seleccion.grupo] ?? seleccion.grupo)}
                {seleccion?.kind === "rule" && "Editar regla"}
                {seleccion?.kind === "final" && "Decisión final"}
              </h2>
              <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-800">
                <IconClose />
              </button>
            </div>

            {/* --- Panel grupo --- */}
            {seleccion?.kind === "group" && (
              <>
                <div>
                  <label className="label-field">Peso del grupo (%)</label>
                  <input
                    type="number"
                    value={pesos[seleccion.grupo] ?? 0}
                    onChange={(e) => onActualizarPeso(seleccion.grupo, Number(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Reglas ({reglasGrupo.filter((r) => r.activa).length}/{reglasGrupo.length} activas)
                  </h3>
                  <div className="space-y-1.5">
                    {reglasGrupo.map((r) => (
                      <label key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 px-2.5 py-1.5 text-xs">
                        <span className={r.activa ? "text-ink-700" : "text-ink-300 line-through"}>{r.nombre}</span>
                        <input type="checkbox" checked={r.activa} onChange={() => onToggleActiva(r.id)} className="h-3.5 w-3.5 rounded border-ink-300" />
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* --- Panel regla --- */}
            {seleccion?.kind === "rule" && regla && (
              <div className="space-y-4">
                <div>
                  <label className="label-field">Nombre</label>
                  <input value={regla.nombre} onChange={(e) => onActualizarRegla(regla.id, { nombre: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label-field">Descripción</label>
                  <textarea
                    value={regla.descripcion}
                    onChange={(e) => onActualizarRegla(regla.id, { descripcion: e.target.value })}
                    className="input-field min-h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-field">Variable</label>
                    <input value={regla.variable} onChange={(e) => onActualizarRegla(regla.id, { variable: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="label-field">Operador</label>
                    <select value={regla.operador} onChange={(e) => onActualizarRegla(regla.id, { operador: e.target.value })} className="input-field">
                      {OPERADORES.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-field">Valor de referencia</label>
                    <input
                      type="number"
                      step="0.01"
                      value={regla.valor}
                      onChange={(e) => onActualizarRegla(regla.id, { valor: Number(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Puntos</label>
                    <input
                      type="number"
                      value={regla.puntos}
                      onChange={(e) => onActualizarRegla(regla.id, { puntos: Number(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-field">Tipo</label>
                    <select
                      value={regla.tipo}
                      onChange={(e) => onActualizarRegla(regla.id, { tipo: e.target.value as ReglaMotor["tipo"] })}
                      className="input-field"
                    >
                      <option value="escala">Escala</option>
                      <option value="ajuste">Ajuste</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Prioridad</label>
                    <input
                      type="number"
                      value={regla.prioridad}
                      onChange={(e) => onActualizarRegla(regla.id, { prioridad: Number(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 text-sm">
                  <input type="checkbox" checked={regla.activa} onChange={() => onToggleActiva(regla.id)} className="h-4 w-4 rounded border-ink-300" />
                  Regla activa
                </label>
                <p className="rounded-lg bg-ink-50 px-3 py-2 text-[11px] text-ink-500">
                  Grupo: <strong className="capitalize">{ETIQUETAS_GRUPO[regla.grupo] ?? regla.grupo}</strong> · ID: {regla.id}
                </p>
              </div>
            )}

            {/* --- Panel decisión final --- */}
            {seleccion?.kind === "final" && (
              <div className="space-y-4">
                <p className="text-sm text-ink-500">
                  Ajusta los umbrales de puntaje total que determinan esta ruta de decisión.
                </p>
                {Object.entries(parametros)
                  .filter(([clave]) => clave.startsWith("umbral_") || clave.startsWith("fraude_") || clave === "verificabilidad_minima")
                  .map(([clave, valor]) => (
                    <div key={clave}>
                      <label className="label-field">{ETIQUETAS_PARAMETRO[clave] ?? clave}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={valor}
                        onChange={(e) => onActualizarParametro(clave, Number(e.target.value))}
                        className="input-field"
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
