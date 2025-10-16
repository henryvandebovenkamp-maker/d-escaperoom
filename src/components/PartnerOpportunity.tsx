// PATH: src/components/PartnerWidget.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";

/* =========================================
   Types
========================================= */
type ProvinceCode =
  | "DR" | "FL" | "FR" | "GE" | "GR" | "LB" | "NB" | "NH" | "OV" | "UT" | "ZH" | "ZE";

type Province = {
  code: ProvinceCode;
  name: string;
  taken?: { by: string; note?: string };
};

type Props = {
  overrides?: Partial<Record<ProvinceCode, { by: string; note?: string }>>;
  className?: string;
};

/* =========================================
   Data
========================================= */
const PROVINCES: Province[] = [
  { code: "DR", name: "Drenthe" },
  { code: "FL", name: "Flevoland" },
  { code: "FR", name: "Friesland" },
  { code: "GE", name: "Gelderland" },
  { code: "GR", name: "Groningen" },
  { code: "LB", name: "Limburg" },
  { code: "NB", name: "Noord-Brabant" },
  { code: "NH", name: "Noord-Holland" },
  { code: "OV", name: "Overijssel" },
  { code: "UT", name: "Utrecht", taken: { by: "WoofExperience", note: "Regio Utrecht is bezet" } },
  { code: "ZH", name: "Zuid-Holland" },
  { code: "ZE", name: "Zeeland" },
];

/* =========================================
   Helpers
========================================= */
function applyOverrides(base: Province[], overrides?: Props["overrides"]): Province[] {
  if (!overrides) return base;
  return base.map((p) => (overrides[p.code] ? { ...p, taken: overrides[p.code] || undefined } : p));
}

function statusFor(p: Province) {
  const isUtrecht = p.code === "UT";
  if (p.taken) return { label: `Bezet • ${p.taken.by}`, tone: "text-orange-800" as const };
  if (isUtrecht) return { label: "Nu te boeken", tone: "text-pink-700" as const };
  return { label: "Beschikbaar", tone: "text-emerald-800" as const };
}

/* =========================================
   Component
========================================= */
export default function PartnerWidget({ overrides, className = "" }: Props) {
  const items = React.useMemo(() => applyOverrides(PROVINCES, overrides), [overrides]);

  return (
    <section
      aria-labelledby="partner-widget-title"
      className={[
        "space-y-4 rounded-2xl border border-stone-200 bg-white/95 p-3 md:p-4 shadow-md backdrop-blur-sm",
        className,
      ].join(" ")}
    >
      {/* ======= HEADER-STRIP (zelfde als Contact/Skills) ======= */}
      <div className="relative w-full overflow-hidden h-14 sm:h-16 lg:h-20 rounded-2xl border border-stone-200">
        <div className="flex h-full w-full items-start justify-center pt-2 sm:pt-3">
          <Image
            src="/images/hondenschool-header.png" // 2304×224 px
            alt="" // decoratief
            width={2304}
            height={224}
            className="h-[95%] w-auto object-contain"
            priority={false}
          />
        </div>
        <h2 id="partner-widget-title" className="sr-only">
          Partner worden
        </h2>
      </div>
      {/* ======= /HEADER ======= */}

      <div className="mx-auto w-full max-w-6xl">
        {/* ======= BOVENRIJ: Propositie + Provincies (tekst) ======= */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Propositie (anker blok) */}
          <div
            className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-4 md:p-5 shadow-sm"
            aria-labelledby="prop-title"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-stone-200" />
            <div aria-hidden className="pointer-events-none absolute -inset-px rounded-[14px] bg-gradient-to-br from-rose-50/60 via-pink-50/35 to-stone-50/25" />
            <div className="relative z-10 space-y-3">
              <h3 id="prop-title" className="text-lg md:text-xl font-extrabold leading-tight tracking-tight text-stone-900">
                D-EscapeRoom op jouw locatie?
              </h3>
              <p className="text-[13px] text-stone-700">
                Voeg een onderscheidende belevenis toe die naadloos past in je lesaanbod — en bouw aan een sterkere band tussen mens en hond.
              </p>

              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span aria-hidden className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 bg-stone-50 text-[13px]">🐶</span>
                  <div>
                    <div className="text-[13px] font-semibold text-stone-900">Beleving</div>
                    <p className="text-[13px] text-stone-700">
                      Hond en mens werken samen, we samen aan een nog betere band.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 bg-stone-50 text-[13px]">📅</span>
                  <div>
                    <div className="text-[13px] font-semibold text-stone-900">Past in je rooster</div>
                    <p className="text-[13px] text-stone-700">
                      Past goed in je bestaande lesaanbod.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 bg-stone-50 text-[13px]">🧰</span>
                  <div>
                    <div className="text-[13px] font-semibold text-stone-900">Gemak</div>
                    <p className="text-[13px] text-stone-700">
                      Jij host; wij leveren concept, materialen en styling.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 bg-stone-50 text-[13px]">🏅</span>
                  <div>
                    <div className="text-[13px] font-semibold text-stone-900">Exclusief</div>
                    <p className="text-[13px] text-stone-700">
                      Maximaal één D-Escaperoom per provincie
                    </p>
                  </div>
                </li>
              </ul>

              <div className="pt-1">
                <Link
                  href="#contact"
                  className="inline-flex h-10 items-center justify-center rounded-2xl bg-pink-600 px-4 text-sm font-semibold text-white shadow hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-500/40 focus:ring-offset-2 focus:ring-offset-white transition"
                >
                  Neem contact op
                </Link>
              </div>
            </div>
          </div>

          {/* Provincies (TEKST) */}
          <div
            className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-4 md:p-5 shadow-sm"
            aria-labelledby="provincies-tekst-title"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-stone-200" />
            <div aria-hidden className="pointer-events-none absolute -inset-px rounded-[14px] bg-gradient-to-br from-stone-50/70 via-rose-50/35 to-pink-50/25" />
            <div className="relative z-10">
              <h3 id="provincies-tekst-title" className="text-lg font-extrabold text-stone-900">
                Beschikbaarheid per provincie
              </h3>
              <p className="mt-1 text-[13px] text-stone-700">
                Nog beschikbaar? Neem contact op voor de mogelijkheden.
              </p>

              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {items.map((p) => {
                  const s = statusFor(p);
                  const href = `/provincie/${p.code.toLowerCase()}`;
                  return (
                    <li key={`txt-${p.code}`} className="flex items-start gap-2">
                      <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-stone-400" />
                      <div className="min-w-0">
                        <Link
                          href={href}
                          className="truncate text-[13px] font-semibold text-stone-900 hover:underline focus:outline-none focus:ring-2 focus:ring-pink-300 rounded"
                        >
                          {p.name}
                        </Link>
                        <div className={`text-[12px] ${s.tone}`}>{s.label}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 text-[11px] text-stone-600">{/* extra toelichting optioneel */}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
