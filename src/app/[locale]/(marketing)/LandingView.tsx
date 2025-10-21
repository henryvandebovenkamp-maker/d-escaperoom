// PATH: src/app/(marketing)/LandingView.tsx
import Hero from "@/components/Hero";
import Skills from "@/components/Skills";
import BookingWidget from "@/components/BookingWidget";

type Props = {
  /** Vastzetten van partner op deze pagina (optioneel) */
  fixedPartnerSlug?: string;
  /** Optioneel: kleine SEO/UX tweak, bv. provincienaam tonen in Hero-subcopy */
  provinceLabel?: string;
};

export default function LandingView({ fixedPartnerSlug, provinceLabel }: Props) {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <Hero />
      <section id="boeken" aria-labelledby="boeken-title" className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="boeken-title" className="sr-only">Boeken</h2>
          {/* Vastgezette partner? Toon subtiel labeltje erboven */}
          {provinceLabel ? (
            <p className="mb-2 text-sm text-stone-600">
              Beschikbaar in <span className="font-medium">{provinceLabel}</span>
            </p>
          ) : null}
          <BookingWidget fixedPartnerSlug={fixedPartnerSlug} />
        </div>
      </section>

      {/* Overige homepage-secties die je al had */}
      <section id="skills" className="py-12 sm:py-16 border-t border-stone-200">
        <div className="mx-auto max-w-6xl px-4">
          <Skills />
        </div>
      </section>
      {/* Voeg hier je overige secties toe (prijzen, contact, etc.) indien gewenst */}
    </main>
  );
}
