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
    <main className="bg-stone-50 text-stone-900">
      <section className="border-b border-stone-200 bg-gradient-to-b from-stone-100 to-stone-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-700 ring-1 ring-stone-200 shadow-sm">
            Provincie: {province}
            <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Vrij
          </span>
          <h1 className="mt-4 text-[26px] sm:text-3xl font-extrabold tracking-tight">Nog niet beschikbaar</h1>
          <p className="mt-2 text-sm sm:text-base text-stone-700">
            In {province} is <span className="font-semibold">D-EscapeRoom</span> nog niet live.
          </p>
        </div>
      </section>

      {/* ENIGE KNOP */}
      <section className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-sm">
          <div className="flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl px-4 h-9 text-[13px] font-semibold bg-white text-stone-900 ring-1 ring-stone-300 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black"
            >
              Terug naar home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
