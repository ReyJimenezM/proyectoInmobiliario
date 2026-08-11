import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { NavPropietario } from "@/components/propietario/NavPropietario";

export default function PropietarioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <NavPropietario />
      <main className="min-h-screen bg-sand-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
      <Footer />
    </>
  );
}
