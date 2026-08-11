"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { PerfilLead } from "@/lib/leads";

type PerfilContextValue = {
  perfil: PerfilLead;
  setPerfil: (perfil: PerfilLead) => void;
};

const PerfilContext = createContext<PerfilContextValue | null>(null);

/**
 * El selector del hero y el formulario están en extremos opuestos de la página y tienen
 * que hablar el mismo idioma: si entras como inmobiliaria, el formulario ya te pide los
 * campos de inmobiliaria. El resto de la landing sigue siendo Server Component — se pasa
 * como `children` y atraviesa este provider sin convertirse en cliente.
 */
export function PerfilProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<PerfilLead>("inmobiliaria");
  const valor = useMemo(() => ({ perfil, setPerfil }), [perfil]);
  return <PerfilContext.Provider value={valor}>{children}</PerfilContext.Provider>;
}

export function usePerfil(): PerfilContextValue {
  const ctx = useContext(PerfilContext);
  if (!ctx) throw new Error("usePerfil debe usarse dentro de <PerfilProvider>");
  return ctx;
}
