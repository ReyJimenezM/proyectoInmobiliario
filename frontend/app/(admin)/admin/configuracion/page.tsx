"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { actualizarInmobiliaria, obtenerInmobiliariaPublica, subirLogoInmobiliaria } from "@/lib/api";
import { obtenerUsuarioSesion } from "@/lib/auth";
import type { Inmobiliaria } from "@/lib/types";

export default function ConfiguracionPage() {
  const sesion = obtenerUsuarioSesion();
  const inmobiliariaId = sesion?.inmobiliaria_id;
  const [inmobiliaria, setInmobiliaria] = useState<Inmobiliaria | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function cargar() {
    if (!inmobiliariaId) return;
    obtenerInmobiliariaPublica(inmobiliariaId)
      .then(setInmobiliaria)
      .catch(() => setError("No pudimos cargar la configuración de tu inmobiliaria."));
  }

  useEffect(cargar, [inmobiliariaId]);

  function actualizarCampo<K extends keyof Inmobiliaria>(campo: K, valor: Inmobiliaria[K]) {
    setInmobiliaria((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!inmobiliaria) return;
    setError(null);
    setMensaje(null);
    setGuardando(true);
    try {
      await actualizarInmobiliaria(inmobiliaria.id, {
        nombre_legal: inmobiliaria.nombre_legal,
        nombre_comercial: inmobiliaria.nombre_comercial,
        nit: inmobiliaria.nit,
        direccion: inmobiliaria.direccion,
        telefono: inmobiliaria.telefono,
        email: inmobiliaria.email,
        color_primario: inmobiliaria.color_primario,
        color_acento: inmobiliaria.color_acento,
      });
      setMensaje("Marca actualizada. Los cambios de color se ven al recargar el panel.");
    } catch {
      setError("No pudimos guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  }

  async function subirLogo(archivo: File) {
    if (!inmobiliaria) return;
    setSubiendoLogo(true);
    setError(null);
    try {
      const actualizada = await subirLogoInmobiliaria(inmobiliaria.id, archivo);
      setInmobiliaria(actualizada);
      setMensaje("Logo actualizado.");
    } catch {
      setError("No pudimos subir el logo. Verifica el formato (JPG/PNG/WEBP).");
    } finally {
      setSubiendoLogo(false);
    }
  }

  if (!inmobiliariaId) {
    return <p className="text-ink-500">Esta sección requiere una sesión asociada a una inmobiliaria.</p>;
  }
  if (error && !inmobiliaria) return <p className="text-rose-600">{error}</p>;
  if (!inmobiliaria) return <p className="text-ink-500">Cargando configuración...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Configuración de marca</h1>
        <p className="mt-1 text-sm text-ink-500">
          Personaliza el logo y los colores de tu inmobiliaria en el panel administrativo (white-label).
        </p>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-ink-900">Logo</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-ink-200 bg-ink-50">
            {inmobiliaria.logo_url ? (
              <Image src={inmobiliaria.logo_url} alt="Logo" width={64} height={64} unoptimized className="object-contain" />
            ) : (
              <span className="text-xs text-ink-400">Sin logo</span>
            )}
          </div>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={subiendoLogo} className="btn-secondary">
            {subiendoLogo ? "Subiendo..." : "Subir logo"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && subirLogo(e.target.files[0])}
          />
        </div>
      </div>

      <form onSubmit={guardar} className="card space-y-5 p-5">
        <h2 className="font-semibold text-ink-900">Datos de la inmobiliaria</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Nombre comercial</label>
            <input
              required
              value={inmobiliaria.nombre_comercial}
              onChange={(e) => actualizarCampo("nombre_comercial", e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Nombre legal</label>
            <input
              required
              value={inmobiliaria.nombre_legal}
              onChange={(e) => actualizarCampo("nombre_legal", e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">NIT</label>
            <input value={inmobiliaria.nit ?? ""} onChange={(e) => actualizarCampo("nit", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-field">Teléfono</label>
            <input value={inmobiliaria.telefono ?? ""} onChange={(e) => actualizarCampo("telefono", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-field">Email</label>
            <input value={inmobiliaria.email ?? ""} onChange={(e) => actualizarCampo("email", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-field">Dirección</label>
            <input value={inmobiliaria.direccion ?? ""} onChange={(e) => actualizarCampo("direccion", e.target.value)} className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Color primario</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={inmobiliaria.color_primario}
                onChange={(e) => actualizarCampo("color_primario", e.target.value)}
                className="h-10 w-16 rounded border border-ink-200"
              />
              <span className="text-xs text-ink-500">{inmobiliaria.color_primario}</span>
            </div>
          </div>
          <div>
            <label className="label-field">Color acento</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={inmobiliaria.color_acento}
                onChange={(e) => actualizarCampo("color_acento", e.target.value)}
                className="h-10 w-16 rounded border border-ink-200"
              />
              <span className="text-xs text-ink-500">{inmobiliaria.color_acento}</span>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {mensaje && <p className="text-sm text-emerald-600">{mensaje}</p>}

        <button type="submit" disabled={guardando} className="btn-primary">
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
