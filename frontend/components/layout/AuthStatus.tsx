"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cerrarSesion, obtenerUsuarioSesion, type UsuarioSesion } from "@/lib/auth";

export function AuthStatus() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  useEffect(() => {
    setUsuario(obtenerUsuarioSesion());
  }, []);

  if (!usuario) {
    return (
      <Link href="/login" className="btn-primary">
        Ingresar / Registrarme
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-ink-600 sm:inline">Hola, {usuario.nombre_completo.split(" ")[0]}</span>
      <button
        type="button"
        onClick={() => {
          cerrarSesion();
          setUsuario(null);
          router.push("/");
        }}
        className="btn-secondary"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
