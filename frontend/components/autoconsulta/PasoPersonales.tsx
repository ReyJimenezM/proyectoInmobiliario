"use client";

import { Campo, claseInput } from "@/components/ui/Campo";
import { edadDesde } from "@/lib/autoconsulta";
import type { PropsPaso } from "./tipos";

const TIPOS_DOCUMENTO = ["Cédula de ciudadanía", "Cédula de extranjería", "Pasaporte"];
const GENEROS = ["Femenino", "Masculino", "No binario", "Prefiero no decirlo"];
const ESTADOS_CIVILES = ["Soltero(a)", "Casado(a)", "Unión libre", "Separado(a)", "Divorciado(a)", "Viudo(a)"];
const NIVELES_EDUCATIVOS = ["Primaria", "Bachillerato", "Técnico / tecnólogo", "Profesional", "Especialización", "Maestría o más"];

export function PasoPersonales({ estado, actualizar, errores }: PropsPaso) {
  const p = estado.personales;
  const set = (cambios: Partial<typeof p>) => actualizar({ personales: { ...p, ...cambios } });
  const edad = edadDesde(p.fecha_nacimiento);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="tipo_documento" etiqueta="Tipo de documento" obligatorio>
          <select
            id="tipo_documento"
            className="input-field"
            value={p.tipo_documento}
            onChange={(e) => set({ tipo_documento: e.target.value })}
          >
            {TIPOS_DOCUMENTO.map((tipo) => (
              <option key={tipo}>{tipo}</option>
            ))}
          </select>
        </Campo>

        <Campo id="numero_documento" etiqueta="Número de documento" obligatorio error={errores.numero_documento}>
          <input
            id="numero_documento"
            inputMode="numeric"
            className={claseInput(errores.numero_documento)}
            value={p.numero_documento}
            onChange={(e) => set({ numero_documento: e.target.value.replace(/\D/g, "") })}
            placeholder="1010234567"
          />
        </Campo>

        <Campo id="nombres" etiqueta="Nombres" obligatorio error={errores.nombres}>
          <input
            id="nombres"
            className={claseInput(errores.nombres)}
            value={p.nombres}
            onChange={(e) => set({ nombres: e.target.value })}
          />
        </Campo>

        <Campo id="apellidos" etiqueta="Apellidos" obligatorio error={errores.apellidos}>
          <input
            id="apellidos"
            className={claseInput(errores.apellidos)}
            value={p.apellidos}
            onChange={(e) => set({ apellidos: e.target.value })}
          />
        </Campo>

        <Campo
          id="fecha_nacimiento"
          etiqueta="Fecha de nacimiento"
          obligatorio
          error={errores.fecha_nacimiento}
          ayuda={edad > 0 ? `${edad} años` : "Debes ser mayor de edad."}
        >
          <input
            id="fecha_nacimiento"
            type="date"
            className={claseInput(errores.fecha_nacimiento)}
            value={p.fecha_nacimiento}
            onChange={(e) => set({ fecha_nacimiento: e.target.value })}
          />
        </Campo>

        <Campo id="genero" etiqueta="Género">
          <select id="genero" className="input-field" value={p.genero} onChange={(e) => set({ genero: e.target.value })}>
            <option value="">Selecciona…</option>
            {GENEROS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Campo>

        <Campo id="lugar_expedicion" etiqueta="Lugar de expedición del documento">
          <input
            id="lugar_expedicion"
            className="input-field"
            value={p.lugar_expedicion}
            onChange={(e) => set({ lugar_expedicion: e.target.value })}
            placeholder="Bogotá D.C."
          />
        </Campo>

        <Campo id="fecha_expedicion" etiqueta="Fecha de expedición">
          <input
            id="fecha_expedicion"
            type="date"
            className="input-field"
            value={p.fecha_expedicion}
            onChange={(e) => set({ fecha_expedicion: e.target.value })}
          />
        </Campo>

        <Campo id="estado_civil" etiqueta="Estado civil">
          <select
            id="estado_civil"
            className="input-field"
            value={p.estado_civil}
            onChange={(e) => set({ estado_civil: e.target.value })}
          >
            <option value="">Selecciona…</option>
            {ESTADOS_CIVILES.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </Campo>

        <Campo id="nivel_educativo" etiqueta="Nivel educativo">
          <select
            id="nivel_educativo"
            className="input-field"
            value={p.nivel_educativo}
            onChange={(e) => set({ nivel_educativo: e.target.value })}
          >
            <option value="">Selecciona…</option>
            {NIVELES_EDUCATIVOS.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Campo>

        <Campo id="celular" etiqueta="Celular" obligatorio error={errores.celular} ayuda="10 dígitos, empieza por 3.">
          <input
            id="celular"
            inputMode="tel"
            className={claseInput(errores.celular)}
            value={p.celular}
            onChange={(e) => set({ celular: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            placeholder="3001234567"
          />
        </Campo>

        <Campo id="correo" etiqueta="Correo electrónico" obligatorio error={errores.correo}>
          <input
            id="correo"
            type="email"
            className={claseInput(errores.correo)}
            value={p.correo}
            onChange={(e) => set({ correo: e.target.value })}
            placeholder="nombre@correo.com"
          />
        </Campo>
      </div>
    </div>
  );
}
