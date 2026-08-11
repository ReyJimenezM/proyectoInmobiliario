"use client";

import type { ReactNode } from "react";

/**
 * Envoltura de campo de formulario: etiqueta, ayuda y error en un solo lugar, con el
 * `aria-describedby` correspondiente para que el mensaje de error se anuncie con el campo.
 */
export function Campo({
  id,
  etiqueta,
  error,
  ayuda,
  obligatorio,
  className = "",
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  obligatorio?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label-field">
        {etiqueta}
        {obligatorio && <span className="ml-0.5 text-clay-600">*</span>}
      </label>
      {children}
      {ayuda && !error && (
        <p id={`${id}-ayuda`} className="mt-1 text-xs text-ink-400">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function claseInput(error?: string): string {
  return error ? "input-field border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "input-field";
}
