"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type ToastType = "success" | "error" | "warning" | "info";

type ToastOptions = {
  title: string;
  description?: string;
  type?: ToastType;
};

type ToastItem = ToastOptions & { id: number };

type ToastContextValue = {
  toast: (opts: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 4000;

const TYPE_STYLES: Record<ToastType, { bar: string; icon: ReactNode; iconWrap: string }> = {
  success: {
    bar: "bg-emerald-500",
    iconWrap: "bg-emerald-50 text-emerald-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  error: {
    bar: "bg-rose-500",
    iconWrap: "bg-rose-50 text-rose-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  warning: {
    bar: "bg-amber-500",
    iconWrap: "bg-amber-50 text-amber-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 6V9M8 11.25V11.26" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M6.98 2.5L1.5 12.5C1.2 13 1.6 13.75 2.2 13.75H13.8C14.4 13.75 14.8 13 14.5 12.5L9.02 2.5C8.72 1.95 7.28 1.95 6.98 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  info: {
    bar: "bg-ink-700",
    iconWrap: "bg-ink-100 text-ink-700",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 7V11.5M8 4.75V4.76" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, type: "info", ...opts }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2.5 sm:bottom-6 sm:right-6">
            {toasts.map((t) => {
              const style = TYPE_STYLES[t.type ?? "info"];
              return (
                <div
                  key={t.id}
                  role="status"
                  className="pointer-events-auto relative flex animate-toast-in items-start gap-3 overflow-hidden rounded-xl bg-white p-4 shadow-card ring-1 ring-ink-900/5"
                >
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.iconWrap}`}>
                    {style.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{t.title}</p>
                    {t.description && (
                      <p className="mt-0.5 text-sm text-ink-500">{t.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Cerrar notificación"
                    className="shrink-0 rounded-full p-1 text-ink-300 transition hover:bg-ink-100 hover:text-ink-700"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                  <span className={`absolute inset-x-0 bottom-0 h-0.5 ${style.bar}`} aria-hidden="true" />
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
