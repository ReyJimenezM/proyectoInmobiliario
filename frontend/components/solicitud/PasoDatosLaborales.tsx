"use client";

import { useState } from "react";
import { guardarDatosLaborales } from "@/lib/api";
import type { DatosLaboralesInput, SolicitudOut } from "@/lib/types";

const TIPOS_OCUPACION: { value: DatosLaboralesInput["tipo_ocupacion"]; label: string }[] = [
  { value: "indefinido", label: "Empleado con contrato indefinido" },
  { value: "termino_fijo", label: "Empleado con contrato a término fijo" },
  { value: "independiente", label: "Independiente con RUT" },
  { value: "pensionado", label: "Pensionado" },
  { value: "otro", label: "Otro" },
];

function valorInicial(solicitud: SolicitudOut): DatosLaboralesInput {
  const g = solicitud.datos_laborales as Partial<DatosLaboralesInput>;
  return {
    tipo_ocupacion: g.tipo_ocupacion ?? "indefinido",
    empresa: g.empresa ?? "",
    cargo: g.cargo ?? "",
    antiguedad_cargo_meses: g.antiguedad_cargo_meses ?? 0,
    antiguedad_laboral_anios: g.antiguedad_laboral_anios ?? 0,
    telefono_verificacion: g.telefono_verificacion ?? "",
    actividad_economica: g.actividad_economica ?? "",
    sector: g.sector ?? "",
    antiguedad_negocio_meses: g.antiguedad_negocio_meses ?? 0,
  };
}

export function PasoDatosLaborales({ solicitud, onGuardado }: { solicitud: SolicitudOut; onGuardado: () => void }) {
  const [datos, setDatos] = useState<DatosLaboralesInput>(valorInicial(solicitud));
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function actualizar<K extends keyof DatosLaboralesInput>(campo: K, valor: DatosLaboralesInput[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  const esIndependiente = datos.tipo_ocupacion === "independiente";

  async function continuar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await guardarDatosLaborales(solicitud.id, datos);
      onGuardado();
    } catch {
      setError("No pudimos guardar tus datos laborales. Revisa la información.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={continuar} className="space-y-5">
      <div>
        <label className="label-field">Tipo de ocupación</label>
        <select
          value={datos.tipo_ocupacion}
          onChange={(e) => actualizar("tipo_ocupacion", e.target.value as DatosLaboralesInput["tipo_ocupacion"])}
          className="input-field"
        >
          {TIPOS_OCUPACION.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {!esIndependiente ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Empresa</label>
              <input value={datos.empresa} onChange={(e) => actualizar("empresa", e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-field">Cargo actual</label>
              <input value={datos.cargo} onChange={(e) => actualizar("cargo", e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Teléfono de verificación (RRHH o jefe directo)</label>
            <input
              value={datos.telefono_verificacion}
              onChange={(e) => actualizar("telefono_verificacion", e.target.value)}
              className="input-field"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="label-field">Actividad económica</label>
            <input
              value={datos.actividad_economica}
              onChange={(e) => actualizar("actividad_economica", e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Sector</label>
            <input value={datos.sector} onChange={(e) => actualizar("sector", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-field">Antigüedad del negocio (meses)</label>
            <input
              type="number"
              min={0}
              value={datos.antiguedad_negocio_meses}
              onChange={(e) => actualizar("antiguedad_negocio_meses", Number(e.target.value))}
              className="input-field"
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">Antigüedad en el cargo (meses)</label>
          <input
            type="number"
            min={0}
            required
            value={datos.antiguedad_cargo_meses}
            onChange={(e) => actualizar("antiguedad_cargo_meses", Number(e.target.value))}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">Antigüedad laboral total (años)</label>
          <input
            type="number"
            min={0}
            required
            value={datos.antiguedad_laboral_anios}
            onChange={(e) => actualizar("antiguedad_laboral_anios", Number(e.target.value))}
            className="input-field"
          />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button type="submit" disabled={cargando} className="btn-primary w-full">
        {cargando ? "Guardando..." : "Continuar"}
      </button>
    </form>
  );
}
