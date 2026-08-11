"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  ETIQUETAS_NIVEL,
  MATRIZ_POR_DEFECTO,
  MODULOS,
  NIVELES,
  ROLES,
  SIMBOLOS_NIVEL,
  type ClaveRol,
  type MatrizPermisos,
  type NivelPermiso,
} from "@/lib/permisos";

const COLORES_NIVEL: Record<NivelPermiso, string> = {
  total: "bg-emerald-50 text-emerald-700",
  lectura: "bg-sky-50 text-sky-700",
  parcial: "bg-amber-50 text-amber-700",
  propio: "bg-violet-50 text-violet-700",
  ninguno: "bg-ink-50 text-ink-300",
};

/** Módulos donde bajar el acceso rompe un requisito de gobierno; se avisa antes de guardar. */
const MODULOS_CRITICOS = ["motor", "politicas", "auditoria", "usuarios"];

export default function RolesPage() {
  const { toast } = useToast();
  const [matriz, setMatriz] = useState<MatrizPermisos>(MATRIZ_POR_DEFECTO);
  const [rolDetalle, setRolDetalle] = useState<ClaveRol | null>(null);
  const [modificado, setModificado] = useState(false);

  function cambiar(modulo: string, rol: ClaveRol, nivel: NivelPermiso) {
    setMatriz((previa) => ({ ...previa, [modulo]: { ...previa[modulo], [rol]: nivel } }));
    setModificado(true);
  }

  function guardar() {
    const criticos = MODULOS_CRITICOS.filter((m) => matriz[m]?.super_admin !== "total");
    if (criticos.length > 0) {
      toast({
        type: "error",
        title: "El super administrador no puede perder acceso",
        description: "Los módulos de motor, políticas, auditoría y usuarios deben quedarle en acceso total.",
      });
      return;
    }
    setModificado(false);
    toast({
      type: "success",
      title: "Matriz de permisos guardada",
      description: "Los cambios aplican en el próximo inicio de sesión de cada usuario.",
    });
  }

  function restaurar() {
    setMatriz(MATRIZ_POR_DEFECTO);
    setModificado(false);
    toast({ type: "info", title: "Matriz restaurada", description: "Se volvió a los valores de referencia." });
  }

  return (
    <div>
      <PageHeader
        titulo="Roles y permisos"
        descripcion="Quién puede ver y hacer qué en cada módulo. Los valores de partida siguen la matriz de la política; ajústalos a tu operación."
        acciones={
          <>
            <Link href="/admin/usuarios" className="btn-secondary px-4 py-2 text-sm">
              Gestionar usuarios
            </Link>
            <button type="button" onClick={restaurar} className="btn-secondary px-4 py-2 text-sm">
              Restaurar
            </button>
            <button type="button" onClick={guardar} disabled={!modificado} className="btn-primary px-4 py-2 text-sm">
              Guardar cambios
            </button>
          </>
        }
      />

      {/* Leyenda */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl2 bg-white p-4 shadow-card ring-1 ring-ink-900/5">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Niveles</span>
        {NIVELES.map((nivel) => (
          <span key={nivel} className="flex items-center gap-1.5 text-xs text-ink-600">
            <span className={`flex h-6 w-6 items-center justify-center rounded font-bold ${COLORES_NIVEL[nivel]}`}>
              {SIMBOLOS_NIVEL[nivel]}
            </span>
            {ETIQUETAS_NIVEL[nivel]}
          </span>
        ))}
      </div>

      {/* Matriz */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-ink-50">
            <tr>
              <th className="sticky left-0 z-10 bg-ink-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                Módulo
              </th>
              {ROLES.map((rol) => (
                <th key={rol.clave} className="px-2 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => setRolDetalle(rolDetalle === rol.clave ? null : rol.clave)}
                    className="text-[11px] font-semibold leading-tight text-ink-600 underline-offset-2 hover:text-ink-900 hover:underline"
                  >
                    {rol.nombre.replace(" / ", "/ ")}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULOS.map((modulo) => (
              <tr key={modulo.clave} className="border-t border-ink-100">
                <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-2.5 text-left font-medium text-ink-900">
                  <span className="block">{modulo.nombre}</span>
                  <span className="text-xs font-normal text-ink-400">{modulo.grupo}</span>
                </th>
                {ROLES.map((rol) => {
                  const nivel = matriz[modulo.clave]?.[rol.clave] ?? "ninguno";
                  return (
                    <td key={rol.clave} className="px-2 py-2 text-center">
                      <select
                        aria-label={`${modulo.nombre} — ${rol.nombre}`}
                        value={nivel}
                        onChange={(e) => cambiar(modulo.clave, rol.clave, e.target.value as NivelPermiso)}
                        className={`w-full cursor-pointer appearance-none rounded px-1.5 py-1.5 text-center text-xs font-bold outline-none transition focus:ring-2 focus:ring-ink-200 ${COLORES_NIVEL[nivel]}`}
                      >
                        {NIVELES.map((n) => (
                          <option key={n} value={n}>
                            {SIMBOLOS_NIVEL[n]} {ETIQUETAS_NIVEL[n]}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detalle del rol */}
      {rolDetalle && (
        <div className="mt-6 card p-6">
          {(() => {
            const rol = ROLES.find((r) => r.clave === rolDetalle)!;
            const accesos = MODULOS.filter((m) => (matriz[m.clave]?.[rol.clave] ?? "ninguno") !== "ninguno");
            return (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-ink-900">{rol.nombre}</h2>
                  <Badge tono={rol.externo ? "violeta" : "neutro"}>{rol.externo ? "Rol externo" : "Rol interno"}</Badge>
                </div>
                <p className="mt-1.5 text-sm text-ink-500">{rol.descripcion}</p>

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Módulos con acceso ({accesos.length} de {MODULOS.length})
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {accesos.map((m) => (
                    <li key={m.clave}>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${COLORES_NIVEL[matriz[m.clave][rol.clave]]}`}>
                        {m.nombre} · {ETIQUETAS_NIVEL[matriz[m.clave][rol.clave]]}
                      </span>
                    </li>
                  ))}
                  {accesos.length === 0 && <li className="text-sm text-ink-400">Sin acceso a ningún módulo.</li>}
                </ul>
              </>
            );
          })()}
        </div>
      )}

      <p className="mt-6 text-xs text-ink-400">
        Los roles externos (propietario y arrendatario) no entran al backoffice: su acceso se resuelve en el portal del
        propietario y en el portal del solicitante.
      </p>
    </div>
  );
}
