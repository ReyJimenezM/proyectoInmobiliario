"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { actualizarPropiedadAdmin, actualizarRiesgoPropiedad, obtenerPropiedadAdmin } from "@/lib/api";
import { PROP_COMPS, type PropiedadDetail } from "@/lib/types";
import { GestorImagenesPropiedad } from "@/components/admin/GestorImagenesPropiedad";
import { EditorRiesgo } from "@/components/admin/EditorRiesgo";

interface PageProps {
  params: { id: string };
}

const TIPOS = ["apartamento", "casa", "apartaestudio", "oficina", "local", "lote", "bodega"] as const;
const ESTADOS = ["activo", "pausado", "arrendado", "vendido"] as const;

export default function EditarPropiedadPage({ params }: PageProps) {
  const [propiedad, setPropiedad] = useState<PropiedadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    obtenerPropiedadAdmin(params.id)
      .then(setPropiedad)
      .catch(() => setError("No pudimos cargar esta propiedad."));
  }, [params.id]);

  function actualizarCampo<K extends keyof PropiedadDetail>(campo: K, valor: PropiedadDetail[K]) {
    setPropiedad((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!propiedad) return;
    setError(null);
    setMensaje(null);
    setGuardando(true);
    try {
      await actualizarPropiedadAdmin(propiedad.id, {
        titulo: propiedad.titulo,
        descripcion: propiedad.descripcion,
        tipo: propiedad.tipo,
        operacion: propiedad.operacion,
        precio: Number(propiedad.precio),
        valor_admin: propiedad.valor_admin ? Number(propiedad.valor_admin) : null,
        area_m2: Number(propiedad.area_m2),
        habitaciones: propiedad.habitaciones,
        banos: propiedad.banos,
        parqueaderos: propiedad.parqueaderos,
        ciudad: propiedad.ciudad,
        zona: propiedad.zona,
        barrio: propiedad.barrio,
        direccion: propiedad.direccion,
        estrato: propiedad.estrato,
        simulador_activo: propiedad.simulador_activo,
        estado: propiedad.estado,
      });
      setMensaje("Cambios guardados.");
    } catch {
      setError("No pudimos guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  }

  if (error && !propiedad) return <p className="text-rose-600">{error}</p>;
  if (!propiedad) return <p className="text-ink-500">Cargando propiedad...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/propiedades" className="text-sm text-ink-500 hover:text-ink-800">
            ← Volver a propiedades
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-ink-900">{propiedad.titulo}</h1>
        </div>
        <Link href={`/propiedad/${propiedad.id}`} target="_blank" className="btn-secondary">
          Ver en el sitio ↗
        </Link>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-semibold text-ink-900">Fotos</h2>
        <GestorImagenesPropiedad propiedadId={propiedad.id} imagenesIniciales={propiedad.imagenes} />
      </div>

      <EditorRiesgo
        titulo="Score de riesgo del inmueble"
        definicion={PROP_COMPS}
        componentesActuales={propiedad.componentes_riesgo}
        scoreActual={propiedad.score_riesgo}
        nivelActual={propiedad.nivel_riesgo}
        onGuardar={async (componentes) => {
          const resultado = await actualizarRiesgoPropiedad(propiedad.id, componentes);
          setPropiedad((prev) => (prev ? { ...prev, ...resultado } : prev));
        }}
      />

      <form onSubmit={guardar} className="card space-y-5 p-5">
        <h2 className="font-semibold text-ink-900">Datos de la propiedad</h2>

        <div>
          <label className="label-field">Título</label>
          <input
            required
            value={propiedad.titulo}
            onChange={(e) => actualizarCampo("titulo", e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="label-field">Descripción</label>
          <textarea
            required
            value={propiedad.descripcion}
            onChange={(e) => actualizarCampo("descripcion", e.target.value)}
            className="input-field min-h-28"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="label-field">Tipo</label>
            <select value={propiedad.tipo} onChange={(e) => actualizarCampo("tipo", e.target.value as PropiedadDetail["tipo"])} className="input-field">
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Operación</label>
            <select
              value={propiedad.operacion}
              onChange={(e) => actualizarCampo("operacion", e.target.value as PropiedadDetail["operacion"])}
              className="input-field"
            >
              <option value="venta">Venta</option>
              <option value="arriendo">Arriendo</option>
            </select>
          </div>
          <div>
            <label className="label-field">Estado</label>
            <select
              value={propiedad.estado}
              onChange={(e) => actualizarCampo("estado", e.target.value)}
              className="input-field"
            >
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Simulador activo</label>
            <select
              value={propiedad.simulador_activo ? "si" : "no"}
              onChange={(e) => actualizarCampo("simulador_activo", e.target.value === "si")}
              className="input-field"
            >
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Precio {propiedad.operacion === "arriendo" && "(canon mensual)"}</label>
            <input
              type="number"
              required
              value={propiedad.precio}
              onChange={(e) => actualizarCampo("precio", e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Valor administración (opcional)</label>
            <input
              type="number"
              value={propiedad.valor_admin ?? ""}
              onChange={(e) => actualizarCampo("valor_admin", e.target.value || null)}
              className="input-field"
            />
          </div>
        </div>

        <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-ink-400">Zona</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Ciudad</label>
            <input
              required
              value={propiedad.ciudad}
              onChange={(e) => actualizarCampo("ciudad", e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Barrio</label>
            <input
              value={propiedad.barrio ?? ""}
              onChange={(e) => actualizarCampo("barrio", e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Zona</label>
            <input
              value={propiedad.zona ?? ""}
              onChange={(e) => actualizarCampo("zona", e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Dirección</label>
            <input
              value={propiedad.direccion ?? ""}
              onChange={(e) => actualizarCampo("direccion", e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-ink-400">Características</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div>
            <label className="label-field">Área m²</label>
            <input
              type="number"
              required
              value={propiedad.area_m2}
              onChange={(e) => actualizarCampo("area_m2", e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Habitaciones</label>
            <input
              type="number"
              min={0}
              value={propiedad.habitaciones}
              onChange={(e) => actualizarCampo("habitaciones", Number(e.target.value))}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Baños</label>
            <input
              type="number"
              min={0}
              value={propiedad.banos}
              onChange={(e) => actualizarCampo("banos", Number(e.target.value))}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Parqueaderos</label>
            <input
              type="number"
              min={0}
              value={propiedad.parqueaderos}
              onChange={(e) => actualizarCampo("parqueaderos", Number(e.target.value))}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Estrato</label>
            <input
              type="number"
              min={1}
              max={6}
              value={propiedad.estrato ?? ""}
              onChange={(e) => actualizarCampo("estrato", e.target.value ? Number(e.target.value) : null)}
              className="input-field"
            />
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
