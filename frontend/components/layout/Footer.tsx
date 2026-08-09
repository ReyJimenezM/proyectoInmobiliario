import Link from "next/link";

const CIUDADES = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena"];
const TIPOS = ["Apartamentos", "Casas", "Apartaestudios", "Oficinas", "Locales"];
const LEGAL = [
  { href: "/legal/politica-datos", label: "Política de tratamiento de datos" },
  { href: "/legal/terminos", label: "Términos y condiciones" },
  { href: "/faq", label: "Preguntas frecuentes" },
];

function ColumnaFooter({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-300">{titulo}</h3>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item}>
            <span className="text-sm text-ink-400">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <p className="font-display text-2xl font-semibold">
              Raíz<span className="text-clay-400">.</span>
            </p>
            <p className="mt-3 max-w-xs text-sm text-ink-300">
              Encuentra tu propiedad y recibe una respuesta de aprobación de crédito en minutos.
            </p>
          </div>
          <ColumnaFooter titulo="Ciudades" items={CIUDADES} />
          <ColumnaFooter titulo="Tipos de propiedad" items={TIPOS} />
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-300">Legal</h3>
            <ul className="space-y-2.5">
              {LEGAL.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-ink-300 hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-ink-800 pt-6 text-xs text-ink-500">
          © {new Date().getFullYear()} Raíz — Demo funcional, no es un producto de producción final.
        </div>
      </div>
    </footer>
  );
}
