"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { actualizarPropiedadAdmin, crearPropiedadAdmin, listarAnunciantesAdmin, listarPropiedadesAdmin } from "@/lib/api";
import { formatoMoneda } from "@/lib/format";
import type { Anunciante, PropiedadListItem } from "@/lib/types";

const ESTADOS = ["activo", "pausado", "arrendado", "vendido"] as const;

function FormularioNuevaPropiedad({ onCreada }: { onCreada: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState(0);
  const [areaM2, setAreaM2] = useState(0);
  const [ciudad, setCiudad] = useState("Bogotá");
  const [barrio, setBarrio] = useState("");
  const [tipo, setTipo] = useState("apartamento");
  const [operacion, setOperacion] = useState<"venta" | "arriendo">("venta");
  const [anunciantes, setAnunciantes] = useState<Anunciante[]>([]);
  const [anuncianteId, setAnuncianteId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    listarAnunciantesAdmin()
      .then((lista) => {
        setAnunciantes(lista);
        if (lista.length > 0) setAnuncianteId(lista[0].id);
      })
      .catch(() => setError("No pudimos cargar la lista de anunciantes."));
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await crearPropiedadAdmin({
        titulo,
        descripcion,
        tipo,
        operacion,
        precio,
        area_m2: areaM2,
        ciudad,
        barrio,
        anunciante_id: anuncianteId,
        imagenes: [],
      });
      onCreada();
      setTitulo("");
      setDescripcion("");
      setPrecio(0);
      setAreaM2(0);
    } catch {
      setError("No pudimos crear la propiedad. Revisa que todos los campos sean válidos.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="card space-y-4 p-5">
      <h2 className="font-semibold text-ink-900">Publicar nueva propiedad</h2>
      <div className="grid grid-cols-2 gap-3">
        <input required placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input-field" />
        <select required value={anuncianteId} onChange={(e) => setAnuncianteId(e.target.value)} className="input-field">
          {anunciantes.length === 0 && <option value="">Cargando anunciantes...</option>}
          {anunciantes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre} ({a.tipo})
            </option>
          ))}
        </select>
      </div>
      <textarea
        required
        placeholder="Descripción"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        className="input-field min-h-20"
      />
      <div className="grid grid-cols-4 gap-3">
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input-field">
          {["apartamento", "casa", "apartaestudio", "oficina", "local", "lote", "bodega"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={operacion} onChange={(e) => setOperacion(e.target.value as "venta" | "arriendo")} className="input-field">
          <option value="venta">Venta</option>
          <option value="arriendo">Arriendo</option>
        </select>
        <input required placeholder="Ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="input-field" />
        <input placeholder="Barrio" value={barrio} onChange={(e) => setBarrio(e.target.value)} className="input-field" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          required
          placeholder="Precio"
          value={precio || ""}
          onChange={(e) => setPrecio(Number(e.target.value))}
          className="input-field"
        />
        <input
          type="number"
          required
          placeholder="Área m²"
          value={areaM2 || ""}
          onChange={(e) => setAreaM2(Number(e.target.value))}
          className="input-field"
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button type="submit" disabled={guardando} className="btn-primary">
        {guardando ? "Publicando..." : "Publicar propiedad"}
      </button>
    </form>
  );
}

export default function PropiedadesAdminPage() {
  const [propiedades, setPropiedades] = useState<PropiedadListItem[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    listarPropiedadesAdmin()
      .then(setPropiedades)
      .catch(() => setError("No pudimos cargar las propiedades."));
  }

  useEffect(cargar, []);

  async function cambiarEstado(id: string, estado: (typeof ESTADOS)[number]) {
    await actualizarPropiedadAdmin(id, { estado });
    cargar();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Propiedades</h1>
        <button type="button" onClick={() => setMostrarFormulario((v) => !v)} className="btn-primary">
          {mostrarFormulario ? "Cerrar" : "+ Nueva propiedad"}
        </button>
      </div>

      {mostrarFormulario && (
        <FormularioNuevaPropiedad
          onCreada={() => {
            setMostrarFormulario(false);
            cargar();
          }}
        />
      )}

      {error && <p className="text-rose-600">{error}</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
            <tr>
              <th className="px-4 py-2">Título</th>
              <th className="px-4 py-2">Ciudad</th>
              <th className="px-4 py-2">Precio</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {propiedades.map((p) => (
              <tr key={p.id} className="border-t border-ink-100">
                <td className="max-w-xs truncate px-4 py-2">{p.titulo}</td>
                <td className="px-4 py-2">{p.ciudad}</td>
                <td className="px-4 py-2">{formatoMoneda(p.precio)}</td>
                <td className="px-4 py-2">
                  <select
                    defaultValue="activo"
                    onChange={(e) => cambiarEstado(p.id, e.target.value as (typeof ESTADOS)[number])}
                    className="input-field w-auto py-1 text-xs"
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/propiedades/${p.id}`}
                    className="text-xs font-semibold text-clay-600 hover:text-clay-700"
                  >
                    Editar / fotos →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
