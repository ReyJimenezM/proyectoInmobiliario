const PASOS = [
  {
    numero: "01",
    titulo: "Busca tu propiedad",
    descripcion: "Filtra por ciudad, tipo y precio entre cientos de propiedades en venta y arriendo.",
  },
  {
    numero: "02",
    titulo: "Simula tu crédito",
    descripcion: "Ingresa tus ingresos y en segundos ves tu probabilidad de aprobación, con el precio de esa propiedad.",
  },
  {
    numero: "03",
    titulo: "Aplica en línea",
    descripcion: "Completa tu solicitud y sube tus documentos desde cualquier dispositivo, sin filas ni papeleo.",
  },
  {
    numero: "04",
    titulo: "Recibe respuesta en minutos",
    descripcion: "Nuestro motor evalúa tu solicitud automáticamente y te explica el resultado en lenguaje simple.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-12 max-w-2xl">
        <h2 className="text-3xl font-semibold text-ink-900 sm:text-4xl">Cómo funciona</h2>
        <p className="mt-3 text-ink-600">
          La diferencia frente a un portal de anuncios tradicional: aquí tu simulación de crédito
          vive dentro de cada propiedad, y tu solicitud se evalúa automáticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {PASOS.map((paso) => (
          <div key={paso.numero} className="relative">
            <span className="font-display text-4xl font-semibold text-clay-300">{paso.numero}</span>
            <h3 className="mt-3 text-lg font-semibold text-ink-900">{paso.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{paso.descripcion}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
