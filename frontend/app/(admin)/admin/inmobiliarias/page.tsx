"use client";

import { useEffect, useState } from "react";
import { crearInmobiliaria, crearUsuarioStaff, listarInmobiliarias } from "@/lib/api";
import type { Inmobiliaria, InmobiliariaCrearInput } from "@/lib/types";

function FormularioNuevaInmobiliaria({ onCreada }: { onCreada: () => void }) {
  const [datos, setDatos] = useState<InmobiliariaCrearInput>({ nombre_legal: "", nombre_comercial: "" });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await crearInmobiliaria(datos);
      onCreada();
    } catch {
      setError("No pudimos crear la inmobiliaria.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="card space-y-4 p-5">
      <h2 className="font-semibold text-ink-900">Nueva inmobiliaria (tenant)</h2>
      <div className="grid grid-cols-2 gap-3">
        <input required placeholder="Nombre legal" value={datos.nombre_legal} onChange={(e) => setDatos({ ...datos, nombre_legal: e.target.value })} className="input-field" />
        <input required placeholder="Nombre comercial" value={datos.nombre_comercial} onChange={(e) => setDatos({ ...datos, nombre_comercial: e.target.value })} className="input-field" />
        <input placeholder="NIT" value={datos.nit ?? ""} onChange={(e) => setDatos({ ...datos, nit: e.target.value })} className="input-field" />
        <input placeholder="Email" value={datos.email ?? ""} onChange={(e) => setDatos({ ...datos, email: e.target.value })} className="input-field" />
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-500">Color primario</label>
          <input type="color" value={datos.color_primario ?? "#C2410C"} onChange={(e) => setDatos({ ...datos, color_primario: e.target.value })} className="h-9 w-16 rounded border border-ink-200" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-500">Color acento</label>
          <input type="color" value={datos.color_acento ?? "#B45309"} onChange={(e) => setDatos({ ...datos, color_acento: e.target.value })} className="h-9 w-16 rounded border border-ink-200" />
        </div>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button type="submit" disabled={guardando} className="btn-primary">
        {guardando ? "Creando..." : "Crear inmobiliaria"}
      </button>
    </form>
  );
}

function FormularioPrimerAdmin({ inmobiliaria, onCreado }: { inmobiliaria: Inmobiliaria; onCreado: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await crearUsuarioStaff(inmobiliaria.id, {
        email, password, nombre_completo: nombreCompleto, rol: "admin", inmobiliaria_id: inmobiliaria.id,
      });
      setOk(true);
      onCreado();
    } catch {
      setError("No pudimos crear el administrador.");
    }
  }

  if (ok) return <p className="text-xs text-emerald-600">Administrador creado.</p>;

  return (
    <form onSubmit={crear} className="mt-2 grid grid-cols-4 gap-2">
      <input required placeholder="Nombre" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} className="input-field text-xs" />
      <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field text-xs" />
      <input required type="password" minLength={8} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field text-xs" />
      <button type="submit" className="btn-secondary text-xs">
        Crear admin
      </button>
      {error && <p className="col-span-4 text-xs text-rose-600">{error}</p>}
    </form>
  );
}

export default function InmobiliariasPage() {
  const [inmobiliarias, setInmobiliarias] = useState<Inmobiliaria[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    listarInmobiliarias()
      .then(setInmobiliarias)
      .catch(() => setError("No pudimos cargar las inmobiliarias."));
  }

  useEffect(cargar, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Inmobiliarias</h1>
          <p className="mt-1 text-sm text-ink-500">Catálogo de tenants white-label de la plataforma.</p>
        </div>
        <button type="button" onClick={() => setMostrarFormulario((v) => !v)} className="btn-primary">
          {mostrarFormulario ? "Cerrar" : "+ Nueva inmobiliaria"}
        </button>
      </div>

      {mostrarFormulario && (
        <FormularioNuevaInmobiliaria
          onCreada={() => {
            setMostrarFormulario(false);
            cargar();
          }}
        />
      )}

      {error && <p className="text-rose-600">{error}</p>}

      <div className="space-y-3">
        {inmobiliarias.map((inm) => (
          <div key={inm.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full" style={{ backgroundColor: inm.color_primario }} />
                <div>
                  <p className="font-semibold text-ink-900">{inm.nombre_comercial}</p>
                  <p className="text-xs text-ink-500">{inm.nombre_legal} · {inm.nit ?? "sin NIT"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${inm.activa ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-500"}`}>
                  {inm.activa ? "Activa" : "Inactiva"}
                </span>
                <button
                  type="button"
                  onClick={() => setExpandida(expandida === inm.id ? null : inm.id)}
                  className="text-xs font-semibold text-clay-600"
                >
                  {expandida === inm.id ? "Ocultar" : "Agregar admin"}
                </button>
              </div>
            </div>
            {expandida === inm.id && <FormularioPrimerAdmin inmobiliaria={inm} onCreado={() => {}} />}
          </div>
        ))}
      </div>
    </div>
  );
}
