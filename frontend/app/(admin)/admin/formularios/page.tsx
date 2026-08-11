"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { CAMPOS_BLOQUEADOS, CAMPOS_FORMULARIO, type CampoFormulario, type TipoCampo } from "@/lib/demo";
import { PASOS } from "@/lib/autoconsulta";

const ETIQUETAS_TIPO: Record<TipoCampo, string> = {
  texto: "Texto",
  numero: "Número",
  fecha: "Fecha",
  seleccion: "Selección",
  booleano: "Sí / No",
  archivo: "Archivo",
  telefono: "Teléfono",
  correo: "Correo",
};

export default function FormulariosPage() {
  const { toast } = useToast();
  const [campos, setCampos] = useState<CampoFormulario[]>(CAMPOS_FORMULARIO);
  const [pasoActivo, setPasoActivo] = useState<number>(0);
  const [porPublicar, setPorPublicar] = useState(false);

  const visibles = useMemo(() => campos.filter((c) => c.paso === pasoActivo), [campos, pasoActivo]);

  function actualizar(id: string, cambios: Partial<CampoFormulario>) {
    setCampos((previos) => previos.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
  }

  function alternar(campo: CampoFormulario, clave: "activo" | "obligatorio") {
    if (CAMPOS_BLOQUEADOS.includes(campo.id)) {
      toast({
        type: "error",
        title: "Campo protegido",
        description: "Este campo responde a un requisito legal o de identificación y no se puede desactivar.",
      });
      return;
    }
    actualizar(campo.id, { [clave]: !campo[clave] } as Partial<CampoFormulario>);
  }

  const activos = campos.filter((c) => c.activo).length;
  const condicionales = campos.filter((c) => c.condicion).length;

  return (
    <div>
      <PageHeader
        titulo="Configuración de formularios"
        descripcion="Qué campos pide la autoconsulta, cuáles son obligatorios y bajo qué condición aparecen."
        acciones={
          <button type="button" onClick={() => setPorPublicar(true)} className="btn-primary px-4 py-2 text-sm">
            Publicar cambios
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Badge tono="neutro">{campos.length} campos configurados</Badge>
        <Badge tono="exito">{activos} activos</Badge>
        <Badge tono="violeta">{condicionales} condicionales</Badge>
        <Badge tono="alerta">{CAMPOS_BLOQUEADOS.length} protegidos por ley</Badge>
      </div>

      {/* Selector de paso */}
      <div className="mb-5 flex flex-wrap gap-2">
        {PASOS.filter((p) => p.numero <= 6).map((paso) => {
          const cantidad = campos.filter((c) => c.paso === paso.numero).length;
          const activo = pasoActivo === paso.numero;
          return (
            <button
              key={paso.slug}
              type="button"
              onClick={() => setPasoActivo(paso.numero)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activo ? "bg-ink-900 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:ring-ink-400"
              }`}
            >
              {paso.numero}. {paso.titulo}
              <span className={`ml-1.5 text-xs ${activo ? "text-ink-300" : "text-ink-400"}`}>{cantidad}</span>
            </button>
          );
        })}
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-xl2 border border-dashed border-ink-200 px-6 py-10 text-center text-sm text-ink-500">
          Este paso no tiene campos configurables en esta versión del formulario.
        </p>
      ) : (
        <div className="space-y-3">
          {visibles.map((campo) => {
            const bloqueado = CAMPOS_BLOQUEADOS.includes(campo.id);
            return (
              <article
                key={campo.id}
                className={`rounded-xl2 border p-5 transition ${
                  campo.activo ? "border-ink-100 bg-white" : "border-ink-100 bg-ink-50/60"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-ink-900">{campo.etiqueta}</h2>
                      <Badge tono="neutro">{ETIQUETAS_TIPO[campo.tipo]}</Badge>
                      {bloqueado && <Badge tono="alerta">Protegido</Badge>}
                      {campo.condicion && <Badge tono="violeta">Condicional</Badge>}
                    </div>
                    <p className="mt-1 font-mono text-xs text-ink-400">{campo.id}</p>
                    {campo.ayuda && <p className="mt-1.5 text-xs text-ink-500">{campo.ayuda}</p>}
                  </div>

                  <div className="flex shrink-0 gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium text-ink-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-ink-300 text-clay-600 focus:ring-clay-500"
                        checked={campo.activo}
                        onChange={() => alternar(campo, "activo")}
                      />
                      Activo
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-ink-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-ink-300 text-clay-600 focus:ring-clay-500"
                        checked={campo.obligatorio}
                        onChange={() => alternar(campo, "obligatorio")}
                      />
                      Obligatorio
                    </label>
                  </div>
                </div>

                {campo.condicion && (
                  <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800">
                    Se muestra solo si <span className="font-mono font-semibold">{campo.condicion.campo}</span> es{" "}
                    {campo.condicion.valores.map((valor, i) => (
                      <span key={valor}>
                        {i > 0 && " o "}
                        <span className="font-semibold">{valor}</span>
                      </span>
                    ))}
                    .
                  </p>
                )}

                {campo.opciones.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-ink-500">Opciones</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {campo.opciones.map((opcion) => (
                        <span key={opcion} className="rounded-full bg-ink-50 px-2.5 py-1 text-xs text-ink-600">
                          {opcion}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label htmlFor={`etiqueta-${campo.id}`} className="label-field text-xs">
                    Texto que ve el usuario
                  </label>
                  <input
                    id={`etiqueta-${campo.id}`}
                    className="input-field"
                    value={campo.etiqueta}
                    onChange={(e) => actualizar(campo.id, { etiqueta: e.target.value })}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={porPublicar}
        title="Publicar cambios del formulario"
        message="Las solicitudes en curso conservan la versión con la que empezaron. Los cambios aplican solo a las solicitudes nuevas."
        confirmLabel="Publicar"
        onConfirm={() => {
          setPorPublicar(false);
          toast({
            type: "success",
            title: "Formulario publicado",
            description: "Se creó una versión nueva; la anterior queda en el histórico.",
          });
        }}
        onClose={() => setPorPublicar(false)}
      />
    </div>
  );
}
