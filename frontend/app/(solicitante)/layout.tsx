import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";

export default function SolicitanteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen pb-16 [@media(min-width:820px)]:pb-0">{children}</main>
      <Footer />
      <MobileNav />
    </>
  );
}
