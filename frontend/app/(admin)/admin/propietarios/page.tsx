"use client";

import { useEffect, useMemo, useState } from "react";
import { actualizarRiesgoPropietario, crearPropietarioAdmin, listarPropietariosAdmin } from "@/lib/api";
import { EditorRiesgo } from "@/components/admin/EditorRiesgo";
import { OWNER_COMPS } from "@/lib/types";

interface Propietario {
  id: string;
  nombre: string;
  tipo_documento: string;
  documento: string;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  componentes_riesgo: Record<string, number> | null;
  score_riesgo: number | null;
  nivel_riesgo: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
}

const TIPOS_DOCUMENTO = ["CC", "CE", "NIT", "PA"] as const;

const NIVEL_BADGE: Record<string, string> = {
  "Bajo riesgo": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Riesgo moderado": "bg-sky-50 text-sky-700 border-sky-200",
  "Riesgo alto": "bg-amber-50 text-amber-700 border-amber-200",
  "Riesgo crítico": "bg-rose-50 text-rose-700 border-rose-200",
};

function BadgeNivel({ nivel }: { nivel: string | null }) {
  if (!nivel) {
    return (
      <span className="inline-flex rounded-full border border-ink-200 bg-ink-50 px-2.5 py-0.5 text-xs font-semibold text-ink-500">
        Sin evaluar
      </span>
    );
  }
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${NIVEL_BADGE[nivel] ?? "bg-ink-50 text-ink-600 border-ink-200"}`}>
      {nivel}
    </span>
  );
}

function BadgeEstado({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      Activo
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-500">
      Inactivo
    </span>
  );
}

function GaugeScore({ score, nivel }: { score: number | null; nivel: string | null }) {
  const valor = score ?? 0;
  const r = 70;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, valor / 1000));
  const color =
    nivel === "Bajo riesgo" ? "#059669" : nivel === "Riesgo moderado" ? "#0284C7" : nivel === "Riesgo alto" ? "#D97706" : nivel === "Riesgo crítico" ? "#DC2626" : "#A8A29E";

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="180" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="#F0ECE7" strokeWidth="16" />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
          strokeDashoffset="0"
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
      </svg>
      <div className="-mt-[112px] flex flex-col items-center">
        <span className="text-3xl font-bold text-ink-900">{score ?? "—"}</span>
        <span className="text-xs text-ink-400">de 1000</span>
      </div>
      <div className="mt-3">
        <BadgeNivel nivel={nivel} />
      </div>
    </div>
  );
}

function DetallePropietario({ propietario, onActualizado }: { propietario: Propietario; onActualizado: () => void }) {
  const [editando, setEditando] = useState(false);

  return (
    <div className="card space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">{propietario.nombre}</h2>
          <p className="text-sm text-ink-500">
            {propietario.tipo_documento} {propietario.documento} · {propietario.ciudad ?? "Ciudad no registrada"}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            {propietario.email ?? "Sin email"} · {propietario.telefono ?? "Sin teléfono"}
          </p>
        </div>
        <button type="button" onClick={() => setEditando((v) => !v)} className="btn-secondary text-sm">
          {editando ? "Cerrar editor" : "Editar riesgo"}
        </button>
      </div>

      {propietario.notas && (
        <p className="rounded-lg bg-ink-50 p-3 text-sm text-ink-600">{propietario.notas}</p>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <GaugeScore score={propietario.score_riesgo} nivel={propietario.nivel_riesgo} />

        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">Componentes de riesgo</h3>
          {OWNER_COMPS.map((c) => {
            const valor = propietario.componentes_riesgo?.[c.clave] ?? 0;
            return (
              <div key={c.clave}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-600">
                    {c.etiqueta} <span className="text-ink-300">({c.peso}%)</span>
                  </span>
                  <span className="font-semibold text-ink-800">{valor}/100</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-clay-500"
                    style={{ width: `${valor}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editando && (
        <EditorRiesgo
          titulo="Actualizar score de riesgo del propietario"
          definicion={OWNER_COMPS}
          componentesActuales={propietario.componentes_riesgo}
          scoreActual={propietario.score_riesgo}
          nivelActual={propietario.nivel_riesgo}
          onGuardar={async (componentes) => {
            await actualizarRiesgoPropietario(propietario.id, componentes);
            setEditando(false);
            onActualizado();
          }}
        />
      )}
    </div>
  );
}

function FormularioNuevoPropietario({ onCreado }: { onCreado: () => void }) {
  const [nombre, setNombre] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<(typeof TIPOS_DOCUMENTO)[number]>("CC");
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await crearPropietarioAdmin({
        nombre,
        tipo_documento: tipoDocumento,
        documento,
        email: email || undefined,
        telefono: telefono || undefined,
        ciudad: ciudad || undefined,
        notas: notas || undefined,
      });
      onCreado();
      setNombre("");
      setDocumento("");
      setEmail("");
      setTelefono("");
      setCiudad("");
      setNotas("");
    } catch {
      setError("No pudimos crear el propietario. Verifica que el documento no esté duplicado.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="card space-y-4 p-5">
      <h2 className="font-semibold text-ink-900">Nuevo propietario</h2>
      <div className="grid grid-cols-2 gap-3">
        <input required placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} className="input-field" />
        <div className="flex gap-2">
          <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value as (typeof TIPOS_DOCUMENTO)[number])} className="input-field w-28">
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input required placeholder="Número de documento" value={documento} onChange={(e) => setDocumento(e.target.value)} className="input-field" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
        <input placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="input-field" />
        <input placeholder="Ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="input-field" />
      </div>
      <textarea placeholder="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} className="input-field min-h-16" />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button type="submit" disabled={guardando} className="btn-primary">
        {guardando ? "Creando..." : "Crear propietario"}
      </button>
    </form>
  );
}

export default function PropietariosAdminPage() {
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    listarPropietariosAdmin()
      .then((lista) => setPropietarios(lista as Propietario[]))
      .catch(() => setError("No pudimos cargar los propietarios."));
  }

  useEffect(cargar, []);

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return propietarios;
    return propietarios.filter(
      (p) => p.nombre.toLowerCase().includes(termino) || p.documento.toLowerCase().includes(termino)
    );
  }, [propietarios, busqueda]);

  const seleccionado = propietarios.find((p) => p.id === seleccionadoId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Propietarios</h1>
          <p className="mt-1 text-sm text-ink-500">Gestión de titulares e historial de riesgo por propietario</p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarFormulario((v) => !v)}
          className="btn-primary"
        >
          {mostrarFormulario ? "Cerrar" : "+ Nuevo propietario"}
        </button>
      </div>

      {mostrarFormulario && (
        <FormularioNuevoPropietario
          onCreado={() => {
            setMostrarFormulario(false);
            cargar();
          }}
        />
      )}

      <input
        placeholder="Buscar por nombre o documento..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="input-field max-w-sm"
      />

      {error && <p className="text-rose-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Documento</th>
              <th className="px-4 py-2">Ciudad</th>
              <th className="px-4 py-2">Inmuebles</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Nivel de riesgo</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSeleccionadoId(p.id === seleccionadoId ? null : p.id)}
                className={`cursor-pointer border-t border-ink-100 transition hover:bg-ink-50 ${
                  seleccionadoId === p.id ? "bg-clay-50" : ""
                }`}
              >
                <td className="px-4 py-2 font-medium text-ink-800">{p.nombre}</td>
                <td className="px-4 py-2 text-ink-500">{p.tipo_documento} {p.documento}</td>
                <td className="px-4 py-2">{p.ciudad ?? "—"}</td>
                <td className="px-4 py-2 text-ink-500">—</td>
                <td className="px-4 py-2 font-semibold text-ink-800">{p.score_riesgo ?? "—"}</td>
                <td className="px-4 py-2"><BadgeNivel nivel={p.nivel_riesgo} /></td>
                <td className="px-4 py-2"><BadgeEstado activo={p.activo} /></td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-400">
                  No hay propietarios que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {seleccionado && <DetallePropietario propietario={seleccionado} onActualizado={cargar} />}
    </div>
  );
}
