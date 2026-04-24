// PATH: src/app/partner/provincie/dr/page.tsx
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProvinceUnavailable from "@/app/provincie/_components/ProvinceUnavailable";

export const dynamic = "force-static";

export default function Page() {
  return (
    <main
      id="main"
      className="min-h-screen bg-stone-950 text-white"
    >
      <Header />

      <section className="bg-stone-950 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Intro blok */}
          <div className="mb-8 rounded-[1.8rem] border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/90">
              Provincie Drenthe
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-rose-300 sm:text-4xl">
              Binnenkort beschikbaar
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
              We zijn druk bezig om D-EscapeRoom ook in Drenthe te openen.
              Laat je gegevens achter zodra locaties live gaan.
            </p>
          </div>

          {/* Bestaande logica/component behouden */}
          <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-md sm:p-6">
            <ProvinceUnavailable code="DR" />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}