import type { PropiedadDetail } from "@/lib/types";
import { SimuladorCompra } from "./SimuladorCompra";
import { SimuladorArriendo } from "./SimuladorArriendo";

export function SimuladorWidget({ propiedad }: { propiedad: PropiedadDetail }) {
  return (
    <div id="simulador" className="card p-6">
      <h2 className="font-display text-xl font-semibold text-ink-900">Simula tu aprobación</h2>
      <p className="mt-1 mb-6 text-sm text-ink-500">
        Cálculo referencial. El resultado real depende del estudio completo de tu solicitud.
      </p>

      {propiedad.operacion === "venta" ? (
        <SimuladorCompra propiedadId={propiedad.id} precioInicial={Number(propiedad.precio)} />
      ) : (
        <SimuladorArriendo propiedadId={propiedad.id} canonInicial={Number(propiedad.precio)} />
      )}
    </div>
  );
}
