"use client";

import { useState } from "react";
import { guardarDatosPersonales } from "@/lib/api";
import type { DatosPersonalesInput, SolicitudOut } from "@/lib/types";

const TIPOS_DOCUMENTO = ["Cédula de ciudadanía", "Cédula de extranjería", "Pasaporte"] as const;

function valorInicial(solicitud: SolicitudOut): DatosPersonalesInput {
  const guardado = solicitud.datos_personales as Partial<DatosPersonalesInput>;
  return {
    nombres_apellidos: guardado.nombres_apellidos ?? "",
    tipo_documento: guardado.tipo_documento ?? "Cédula de ciudadanía",
    numero_documento: guardado.numero_documento ?? "",
    fecha_nacimiento: guardado.fecha_nacimiento ?? "",
    estado_civil: guardado.estado_civil ?? "",
    personas_a_cargo: guardado.personas_a_cargo ?? 0,
    telefono: guardado.telefono ?? "",
    email: guardado.email ?? "",
    direccion_residencia: guardado.direccion_residencia ?? "",
    ciudad_residencia: guardado.ciudad_residencia ?? "",
    tiempo_residencia: guardado.tiempo_residencia ?? "",
    es_propietario: guardado.es_propietario ?? false,
  };
}

export function PasoDatosPersonales({
  solicitud,
  onGuardado,
}: {
  solicitud: SolicitudOut;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<DatosPersonalesInput>(valorInicial(solicitud));
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function actualizar<K extends keyof DatosPersonalesInput>(campo: K, valor: DatosPersonalesInput[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function continuar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await guardarDatosPersonales(solicitud.id, datos);
      onGuardado();
    } catch {
      setError("Revisa que todos los campos sean válidos (recuerda ser mayor de edad).");
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={continuar} className="space-y-5">
      <div>
        <label className="label-field">Nombres y apellidos completos</label>
        <input
          required
          value={datos.nombres_apellidos}
          onChange={(e) => actualizar("nombres_apellidos", e.target.value)}
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">Tipo de documento</label>
          <select
            value={datos.tipo_documento}
            onChange={(e) => actualizar("tipo_documento", e.target.value as DatosPersonalesInput["tipo_documento"])}
            className="input-field"
          >
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Número de documento</label>
          <input
            required
            value={datos.numero_documento}
            onChange={(e) => actualizar("numero_documento", e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">Fecha de nacimiento</label>
          <input
            type="date"
            required
            value={datos.fecha_nacimiento}
            onChange={(e) => actualizar("fecha_nacimiento", e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">Estado civil</label>
          <input
            required
            value={datos.estado_civil}
            onChange={(e) => actualizar("estado_civil", e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">Personas a cargo</label>
          <input
            type="number"
            min={0}
            required
            value={datos.personas_a_cargo}
            onChange={(e) => actualizar("personas_a_cargo", Number(e.target.value))}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">Teléfono de contacto</label>
          <input
            required
            value={datos.telefono}
            onChange={(e) => actualizar("telefono", e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label-field">Email</label>
        <input
          type="email"
          required
          value={datos.email}
          onChange={(e) => actualizar("email", e.target.value)}
          className="input-field"
        />
      </div>

      <div>
        <label className="label-field">Dirección de residencia actual</label>
        <input
          required
          value={datos.direccion_residencia}
          onChange={(e) => actualizar("direccion_residencia", e.target.value)}
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">Ciudad de residencia</label>
          <input
            required
            value={datos.ciudad_residencia}
            onChange={(e) => actualizar("ciudad_residencia", e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">Tiempo de residencia</label>
          <input
            required
            placeholder="Ej. 3 años"
            value={datos.tiempo_residencia}
            onChange={(e) => actualizar("tiempo_residencia", e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={datos.es_propietario}
          onChange={(e) => actualizar("es_propietario", e.target.checked)}
          className="h-4 w-4 rounded border-ink-300"
        />
        Soy propietario de mi vivienda actual
      </label>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button type="submit" disabled={cargando} className="btn-primary w-full">
        {cargando ? "Guardando..." : "Continuar"}
      </button>
    </form>
  );
}
