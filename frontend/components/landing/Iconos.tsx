/**
 * Íconos en línea (sin librería, sin request extra). Se renderizan en el servidor y
 * heredan el color con `currentColor`.
 */

type Props = { className?: string };

function base(className?: string) {
  return {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: className ?? "h-6 w-6",
  };
}

export function IconoRayo({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
    </svg>
  );
}

export function IconoBalanza({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M12 3.5v17.5M8 21h8M5 7h14M12 5.2 5 7M12 5.2 19 7M5 7l-2.5 6h5L5 7ZM19 7l-2.5 6h5L19 7Z" />
    </svg>
  );
}

export function IconoMoneda({ className }: Props) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.2A3 3 0 0 0 9.6 10c0 2.5 5 1.5 5 4a3 3 0 0 1-5 1.9M12 7v10" />
    </svg>
  );
}

export function IconoEngranaje({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M4 6h9M19 6h1M4 12h2M11 12h9M4 18h7M15 18h5" />
      <circle cx="16" cy="6" r="2.2" />
      <circle cx="8.5" cy="12" r="2.2" />
      <circle cx="13" cy="18" r="2.2" />
    </svg>
  );
}

export function IconoEscudo({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M12 3 5 6v5.5c0 4.3 2.9 8.3 7 9.5 4.1-1.2 7-5.2 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconoDocumento({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

export function IconoGrafica({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M3 3v18h18M7 15l3.5-4 3 2.5L20 7" />
    </svg>
  );
}

export function IconoCampana({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7M10.5 19a1.8 1.8 0 0 0 3 0" />
    </svg>
  );
}

export function IconoPersonas({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="8" r="3.2" />
      <path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 5.2a3.2 3.2 0 0 1 0 5.6" />
    </svg>
  );
}

export function IconoLlave({ className }: Props) {
  return (
    <svg {...base(className)}>
      <circle cx="8" cy="16" r="3.5" />
      <path d="m10.5 13.5 8-8M16 8l2 2M14 10l2 2" />
    </svg>
  );
}

export function IconoReloj({ className }: Props) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 2" />
    </svg>
  );
}

export function IconoCheck({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

export function IconoCalendario({ className }: Props) {
  return (
    <svg {...base(className)}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8.5 14.5h3" />
    </svg>
  );
}

export function IconoFlecha({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M4 12h15m-5.5-6 6 6-6 6" />
    </svg>
  );
}
