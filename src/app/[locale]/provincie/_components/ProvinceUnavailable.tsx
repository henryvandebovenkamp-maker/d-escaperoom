import Link from "next/link";

const NAMES = {
  DR: "Drenthe", FL: "Flevoland", FR: "Friesland", GE: "Gelderland",
  GR: "Groningen", LB: "Limburg", NB: "Noord-Brabant", NH: "Noord-Holland",
  OV: "Overijssel", UT: "Utrecht", ZH: "Zuid-Holland", ZE: "Zeeland",
} as const;

export type ProvinceCode = keyof typeof NAMES;

export default function ProvinceUnavailable({ code }: { code: ProvinceCode }) {
  const province = NAMES[code];

  return (
    <main aria-labelledby="page-title" className="bg-stone-50 text-stone-900">
      {/* Hero / Banner */}
      <section className="relative isolate overflow-hidden border-b border-stone-200">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-rose-50/60 via-pink-50/40 to-stone-50"
        />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 text-center relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[12px] font-medium text-stone-700 ring-1 ring-stone-200 shadow-sm">
            Provincie: {province}
            <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="sr-only">status:</span> Vrij
          </span>

          <h1
            id="page-title"
            className="mt-4 text-[26px] sm:text-3xl font-extrabold tracking-tight"
          >
            Nog niet beschikbaar in {province}
          </h1>

          <p className="mt-2 text-sm sm:text-base text-stone-700">
            In <span className="font-semibold">D-EscapeRoom</span> is hier nog niet live.
          </p>
        </div>
      </section>

      {/* Card met enige knop */}
      <section className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 py-10">
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white/95 p-5 shadow-sm">
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-stone-200" />
          <div className="flex justify-center">
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-2xl bg-white px-4 text-[13px] font-semibold text-stone-900 ring-1 ring-stone-300 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-stone-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Terug naar home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
