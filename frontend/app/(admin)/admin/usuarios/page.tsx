"use client";

import { useEffect, useState } from "react";
import { crearUsuarioStaff, listarUsuariosInmobiliaria } from "@/lib/api";
import { obtenerUsuarioSesion } from "@/lib/auth";
import type { UsuarioStaff, UsuarioStaffCrearInput } from "@/lib/types";

const ROLES: UsuarioStaffCrearInput["rol"][] = ["admin", "analista", "asesor", "consulta"];
const ETIQUETAS_ROL: Record<string, string> = {
  admin: "Administrador", analista: "Analista de riesgo", asesor: "Asesor comercial", consulta: "Consulta (solo lectura)",
};

export default function UsuariosPage() {
  const sesion = obtenerUsuarioSesion();
  const [usuarios, setUsuarios] = useState<UsuarioStaff[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<UsuarioStaffCrearInput["rol"]>("analista");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const inmobiliariaId = sesion?.inmobiliaria_id;

  function cargar() {
    if (!inmobiliariaId) return;
    listarUsuariosInmobiliaria(inmobiliariaId)
      .then(setUsuarios)
      .catch(() => setError("No pudimos cargar los usuarios."));
  }

  useEffect(cargar, [inmobiliariaId]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!inmobiliariaId) return;
    setError(null);
    setGuardando(true);
    try {
      await crearUsuarioStaff(inmobiliariaId, {
        email, password, nombre_completo: nombreCompleto, rol, inmobiliaria_id: inmobiliariaId,
      });
      setMostrarFormulario(false);
      setNombreCompleto("");
      setEmail("");
      setPassword("");
      cargar();
    } catch {
      setError("No pudimos crear el usuario. Verifica que el email no esté en uso.");
    } finally {
      setGuardando(false);
    }
  }

  if (!inmobiliariaId) {
    return <p className="text-ink-500">Esta sección requiere una sesión asociada a una inmobiliaria.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Usuarios</h1>
        <button type="button" onClick={() => setMostrarFormulario((v) => !v)} className="btn-primary">
          {mostrarFormulario ? "Cerrar" : "+ Nuevo usuario"}
        </button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={crear} className="card space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Nombre completo" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} className="input-field" />
            <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input required type="password" placeholder="Contraseña (mín. 8 caracteres)" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" />
            <select value={rol} onChange={(e) => setRol(e.target.value as UsuarioStaffCrearInput["rol"])} className="input-field">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ETIQUETAS_ROL[r]}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" disabled={guardando} className="btn-primary">
            {guardando ? "Creando..." : "Crear usuario"}
          </button>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Rol</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-ink-100">
                <td className="px-4 py-2">{u.nombre_completo}</td>
                <td className="px-4 py-2 text-ink-500">{u.email}</td>
                <td className="px-4 py-2">{ETIQUETAS_ROL[u.rol] ?? u.rol}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
