"use client";

import { useState } from "react";

interface DocumentoRequisito {
  nombre: string;
  obligatorio: boolean;
  nota?: string;
}

interface PerfilDocumentos {
  clave: string;
  etiqueta: string;
  descripcion: string;
  documentos: DocumentoRequisito[];
}

const PERFILES_LABORALES: PerfilDocumentos[] = [
  {
    clave: "indefinido",
    etiqueta: "Empleado (contrato indefinido)",
    descripcion: "Vinculación laboral a término indefinido",
    documentos: [
      { nombre: "Cédula de ciudadanía", obligatorio: true },
      { nombre: "Desprendibles de pago o certificación laboral", obligatorio: true },
      { nombre: "Certificado de tradición y libertad", obligatorio: false, nota: "Solo aplica para vertical de compra" },
      { nombre: "Cédula del codeudor", obligatorio: false, nota: "Solo si se declara codeudor" },
      { nombre: "Soporte de ingresos del codeudor", obligatorio: false, nota: "Solo si se declara codeudor" },
    ],
  },
  {
    clave: "termino_fijo",
    etiqueta: "Empleado (contrato a término fijo)",
    descripcion: "Vinculación laboral a término fijo",
    documentos: [
      { nombre: "Cédula de ciudadanía", obligatorio: true },
      { nombre: "Desprendibles de pago o certificación laboral", obligatorio: true },
      { nombre: "Certificado de tradición y libertad", obligatorio: false, nota: "Solo aplica para vertical de compra" },
      { nombre: "Cédula del codeudor", obligatorio: false, nota: "Solo si se declara codeudor" },
      { nombre: "Soporte de ingresos del codeudor", obligatorio: false, nota: "Solo si se declara codeudor" },
    ],
  },
  {
    clave: "independiente",
    etiqueta: "Independiente",
    descripcion: "Trabajador por cuenta propia o con actividad económica registrada",
    documentos: [
      { nombre: "Cédula de ciudadanía", obligatorio: true },
      { nombre: "Extractos bancarios (últimos 3 meses)", obligatorio: true },
      { nombre: "RUT", obligatorio: true },
      { nombre: "Declaración de renta", obligatorio: true },
      { nombre: "Certificado de tradición y libertad", obligatorio: false, nota: "Solo aplica para vertical de compra" },
      { nombre: "Cédula del codeudor", obligatorio: false, nota: "Solo si se declara codeudor" },
      { nombre: "Soporte de ingresos del codeudor", obligatorio: false, nota: "Solo si se declara codeudor" },
    ],
  },
  {
    clave: "empresario",
    etiqueta: "Empresario",
    descripcion: "Actividad económica con constitución de empresa (evaluado bajo el perfil independiente)",
    documentos: [
      { nombre: "Cédula de ciudadanía", obligatorio: true },
      { nombre: "Extractos bancarios (últimos 3 meses)", obligatorio: true },
      { nombre: "RUT", obligatorio: true },
      { nombre: "Declaración de renta", obligatorio: true },
      { nombre: "Cámara de comercio", obligatorio: false, nota: "Recomendado para verificación adicional" },
      { nombre: "Certificado de tradición y libertad", obligatorio: false, nota: "Solo aplica para vertical de compra" },
    ],
  },
  {
    clave: "pensionado",
    etiqueta: "Pensionado",
    descripcion: "Ingresos derivados de mesada pensional",
    documentos: [
      { nombre: "Cédula de ciudadanía", obligatorio: true },
      { nombre: "Certificado de pensión vigente", obligatorio: true },
      { nombre: "Certificado de tradición y libertad", obligatorio: false, nota: "Solo aplica para vertical de compra" },
      { nombre: "Cédula del codeudor", obligatorio: false, nota: "Solo si se declara codeudor" },
      { nombre: "Soporte de ingresos del codeudor", obligatorio: false, nota: "Solo si se declara codeudor" },
    ],
  },
  {
    clave: "otro",
    etiqueta: "Otro",
    descripcion: "Perfiles laborales no clasificados en las categorías anteriores",
    documentos: [
      { nombre: "Cédula de ciudadanía", obligatorio: true },
      { nombre: "Certificado de tradición y libertad", obligatorio: false, nota: "Solo aplica para vertical de compra" },
      { nombre: "Cédula del codeudor", obligatorio: false, nota: "Solo si se declara codeudor" },
      { nombre: "Soporte de ingresos del codeudor", obligatorio: false, nota: "Solo si se declara codeudor" },
    ],
  },
];

const PERFIL_PROPIETARIO: PerfilDocumentos = {
  clave: "propietario",
  etiqueta: "Propietario / titular del inmueble",
  descripcion: "Documentación de titularidad y verificación de identidad del propietario",
  documentos: [
    { nombre: "Cédula de ciudadanía / cédula de extranjería / NIT / pasaporte", obligatorio: true },
    { nombre: "Certificado de tradición y libertad", obligatorio: true },
    { nombre: "Certificado de existencia y representación legal", obligatorio: false, nota: "Solo si el propietario es persona jurídica (NIT)" },
    { nombre: "Paz y salvo de administración (PH)", obligatorio: false },
    { nombre: "Escritura pública del inmueble", obligatorio: false, nota: "Requerido para verificación de titularidad registral" },
    { nombre: "Poder notarial", obligatorio: false, nota: "Solo si actúa un apoderado" },
  ],
};

function BadgeRequisito({ obligatorio }: { obligatorio: boolean }) {
  return obligatorio ? (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      Obligatorio
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-500">
      Opcional
    </span>
  );
}

function CardPerfil({ perfil }: { perfil: PerfilDocumentos }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-ink-900">{perfil.etiqueta}</h3>
      <p className="mt-1 text-xs text-ink-500">{perfil.descripcion}</p>
      <div className="mt-4 space-y-2">
        {perfil.documentos.map((doc) => (
          <div key={doc.nombre} className="flex items-start justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm text-ink-800">{doc.nombre}</p>
              {doc.nota && <p className="mt-0.5 text-xs text-ink-400">{doc.nota}</p>}
            </div>
            <BadgeRequisito obligatorio={doc.obligatorio} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CatalogosAdminPage() {
  const [tab, setTab] = useState<"laboral" | "propietario">("laboral");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Catálogos</h1>
        <p className="mt-1 text-sm text-ink-500">
          Los requisitos documentales se gestionan desde el motor de decisión. Esta vista es de consulta.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("laboral")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            tab === "laboral" ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600"
          }`}
        >
          Por perfil laboral
        </button>
        <button
          type="button"
          onClick={() => setTab("propietario")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            tab === "propietario" ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600"
          }`}
        >
          Propietario
        </button>
      </div>

      {tab === "laboral" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PERFILES_LABORALES.map((perfil) => (
            <CardPerfil key={perfil.clave} perfil={perfil} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CardPerfil perfil={PERFIL_PROPIETARIO} />
        </div>
      )}
    </div>
  );
}
