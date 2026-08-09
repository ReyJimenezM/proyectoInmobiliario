"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { registrarUsuario } from "@/lib/api";
import { guardarSesion } from "@/lib/auth";

export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <RegistroForm />
    </Suspense>
  );
}

function RegistroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setCargando(true);
    try {
      const respuesta = await registrarUsuario({
        nombre_completo: nombreCompleto,
        email,
        password,
        telefono: telefono || undefined,
      });
      guardarSesion(respuesta.access_token, respuesta.refresh_token, respuesta.usuario);
      router.push(searchParams.get("destino") || "/");
    } catch {
      setError("No pudimos crear tu cuenta. Puede que el email ya esté registrado.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-center text-2xl font-semibold text-ink-900">Crea tu cuenta</h1>

      <form onSubmit={enviar} className="card mt-8 space-y-4 p-6">
        <div>
          <label className="label-field">Nombre completo</label>
          <input
            required
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">Teléfono</label>
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label-field">Contraseña (mín. 8 caracteres)</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button type="submit" disabled={cargando} className="btn-primary w-full">
          {cargando ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <p className="text-center text-sm text-ink-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-clay-600 hover:text-clay-700">
            Ingresa aquí
          </Link>
        </p>
      </form>
    </div>
  );
}
