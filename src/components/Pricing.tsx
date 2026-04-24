
// PATH: src/components/Pricing.tsx
import Link from "next/link";

const INCLUDED_ITEMS = [
  "Vaste prijs voor jullie team",
  "Speeladvies: 2 volwassenen + 1 hond",
  "Kinderen mogen gratis mee",
  "Maximaal 2 honden per boeking",
];

export default function Pricing() {
  return (
    <section
      id="prijzen"
      aria-labelledby="pricing-title"
      className="relative overflow-hidden bg-stone-950 px-4 py-12 text-white sm:px-6 lg:px-8 lg:py-20"
    >
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.16),transparent_38%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
            PRIJS & INFO
          </span>

          <h2
            id="pricing-title"
            className="mt-5 text-4xl font-black tracking-tight text-rose-300 sm:text-5xl lg:text-6xl"
          >
            Prijzen en deelname
          </h2>

          <p className="mt-5 text-sm leading-7 text-stone-200/90 sm:text-base">
            Verzamel je team, neem je hond mee en stap samen de wereld van The
            Stolen Snack binnen. Jullie gaan speuren, puzzelen en ontdekken of
            jullie het mysterie kunnen oplossen.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-7">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/90">
              Vaste prijs per boeking
            </p>

            <div className="mt-4">
              <span className="text-6xl font-black tracking-tight text-white">
                €79,90
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-stone-200/90">
              Voor jullie complete team
            </p>
          </div>

          <ul className="mt-6 space-y-3">
            {INCLUDED_ITEMS.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-stone-100/95"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-600 text-[11px] font-black text-white">
                  ✓
                </span>

                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7">
            <Link
              href="#boeken"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-pink-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
            >
              Boek nu
            </Link>
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-stone-300/80">
            Voor de beste ervaring adviseren we 2 volwassenen en 1 hond. Extra
            kinderen mogen gratis mee.
          </p>
        </div>
      </div>
    </section>
  );
}