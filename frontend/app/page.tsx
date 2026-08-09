import { SearchHero } from "@/components/home/SearchHero";
import { FeaturedProperties } from "@/components/home/FeaturedProperties";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
      <section className="relative overflow-hidden bg-ink-900 pb-24 pt-16 text-white sm:pt-24">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=60)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/80 to-ink-900/40" />

        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Encuentra tu propiedad y simula tu aprobación de crédito en el mismo lugar
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-200">
            Compra o arrienda con la tranquilidad de saber tu probabilidad de aprobación antes de aplicar.
          </p>

          <div className="mt-10">
            <SearchHero />
          </div>
        </div>
      </section>

      <FeaturedProperties />
      <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
