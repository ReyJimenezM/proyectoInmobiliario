"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copiado, setCopiado] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // portapapeles no disponible; ignoramos silenciosamente
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700 transition hover:bg-ink-200"
    >
      {copiado ? (
        <>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copiado!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 10.5V3.75C3 3.34 3.34 3 3.75 3H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
