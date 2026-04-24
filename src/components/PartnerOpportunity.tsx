// PATH: src/components/PartnerWidget.tsx
"use client";

import * as React from "react";
import Link from "next/link";

type ProvinceCode =
  | "DR"
  | "FL"
  | "FR"
  | "GE"
  | "GR"
  | "LB"
  | "NB"
  | "NH"
  | "OV"
  | "UT"
  | "ZH"
  | "ZE";

type Province = {
  code: ProvinceCode;
  name: string;
  taken?: { by: string; note?: string };
};

type Props = {
  overrides?: Partial<Record<ProvinceCode, { by: string; note?: string }>>;
  className?: string;
};

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
  {
    code: "UT",
    name: "Utrecht",
    taken: { by: "WoofExperience" },
  },
  { code: "ZH", name: "Zuid-Holland" },
  { code: "ZE", name: "Zeeland" },
];

function applyOverrides(
  base: Province[],
  overrides?: Props["overrides"]
): Province[] {
  if (!overrides) return base;

  return base.map((p) =>
    overrides[p.code] ? { ...p, taken: overrides[p.code] } : p
  );
}

function isTaken(p: Province) {
  return Boolean(p.taken);
}

function FeatureItem({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-base">
        {icon}
      </span>

      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <p className="mt-1 text-sm leading-6 text-stone-300">{text}</p>
      </div>
    </li>
  );
}

export default function PartnerWidget({
  overrides,
  className = "",
}: Props) {
  const items = React.useMemo(
    () => applyOverrides(PROVINCES, overrides),
    [overrides]
  );

  return (
    <section
      aria-labelledby="partner-widget-title"
      className={[
        "relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 text-white shadow-2xl shadow-black/25 backdrop-blur-sm sm:p-6",
        className,
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,114,182,0.07),rgba(251,191,36,0.05),rgba(255,255,255,0.02))]" />

      <div className="relative">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-stone-100">
            PARTNER WORDEN
          </span>

          <h2
            id="partner-widget-title"
            className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl"
          >
            D-EscapeRoom
            <span className="block text-rose-300">op jouw locatie?</span>
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-stone-300">
            Voeg een onderscheidende belevenis toe aan je hondenschool en bied
            baas en hond samen een unieke western ervaring.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.95fr]">
          {/* LINKS */}
          <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-5 sm:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">
              Waarom partner worden
            </div>

            <h3 className="mt-2 text-2xl font-black tracking-tight text-white">
              Een exclusieve beleving
            </h3>

            <ul className="mt-5 space-y-4">
              <FeatureItem
                icon="🐶"
                title="Beleving"
                text="Mens en hond lossen samen puzzels op en bouwen aan hun band."
              />
              <FeatureItem
                icon="📅"
                title="Praktisch inzetbaar"
                text="Past eenvoudig binnen jouw rooster of lesaanbod."
              />
              <FeatureItem
                icon="🧰"
                title="Wij leveren concept"
                text="Jij host op locatie, wij verzorgen styling en concept."
              />
              <FeatureItem
                icon="🏅"
                title="Exclusief per provincie"
                text="Maximaal één partner per provincie."
              />
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="#contact"
                className="rounded-2xl bg-pink-600 px-5 py-3 text-sm font-semibold text-white hover:bg-pink-700"
              >
                Neem contact op
              </Link>

              <Link
                href="#boeken"
                className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
              >
                Bekijk ervaring
              </Link>
            </div>
          </div>

          {/* RECHTS */}
          <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-5 sm:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">
              Beschikbaarheid
            </div>

            <h3 className="mt-2 text-2xl font-black tracking-tight text-white">
              Provincies
            </h3>

            <p className="mt-3 text-sm text-stone-300">
              Klik op een vrije provincie om direct contact op te nemen.
            </p>

            <ul className="mt-5 grid grid-cols-2 gap-3">
              {items.map((province) => {
                const taken = isTaken(province);

                const href = taken
                  ? `/provincie/${province.code.toLowerCase()}`
                  : "#contact";

                const pillClass = taken
                  ? "border-orange-400/30 bg-orange-500/12 text-orange-100"
                  : "border-emerald-400/30 bg-emerald-500/12 text-emerald-100";

                const label = taken
                  ? `${province.name} - Bezet`
                  : `${province.name} - Open`;

                return (
                  <li key={province.code}>
                    <Link
                      href={href}
                      className={[
                        "flex min-h-[52px] items-center justify-center rounded-full border px-4 text-sm font-semibold transition hover:scale-[1.02]",
                        pillClass,
                      ].join(" ")}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-stone-300">
              Interesse in jouw provincie? Neem contact op voor de mogelijkheden.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
