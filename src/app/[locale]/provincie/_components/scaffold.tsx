// PATH: src/app/provincie/_components/scaffold.tsx
"use client";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const PROVINCES = {
  dr: "Drenthe",
  fl: "Flevoland",
  fr: "Friesland",
  ge: "Gelderland",
  gr: "Groningen",
  lb: "Limburg",
  nb: "Noord-Brabant",
  nh: "Noord-Holland",
  ov: "Overijssel",
  ut: "Utrecht",
  ze: "Zeeland",
  zh: "Zuid-Holland",
} as const;

export type ProvinceCode = keyof typeof PROVINCES;

/** Optioneel: markeer bepaalde provincies als ‘bezet’ */
export const TAKEN: Partial<Record<ProvinceCode, boolean>> = {
  ut: true, // voorbeeld
};

export function metaForProvince(code: ProvinceCode): Metadata {
  const name = PROVINCES[code];
  const title = `D-EscapeRoom in ${name}`;
  const description = `The Missing Snack — boek je sessie in ${name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/provincie/${code}` },
    openGraph: { title, description, images: ["/og.jpg?v=1"] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.jpg?v=1"] },
  };
}

export function ProvincePageScaffold({ code }: { code: ProvinceCode }) {
  const name = PROVINCES[code];
  const isTaken = !!TAKEN[code];
  const statusLabel = isTaken ? "Bezet" : "Beschikbaar";

  return (
    <section className="mx-auto max-w-4xl space-y-4 rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-md">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200">
        <div aria-hidden className="absolute inset-0">
          <Image
            src="/images/header-foto.png"
            alt=""
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1200px"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-rose-50/65 via-pink-50/55 to-stone-50/70" />
          <div className="absolute inset-0 bg-black/10 mix-blend-multiply" aria-hidden />
        </div>
        <div className="relative z-10 p-5 text-center">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-stone-900">
            {name}
          </h1>
          <p className="mt-1 text-sm text-stone-700">
            D-EscapeRoom “The Missing Snack” in <strong>{name}</strong>
          </p>
          <div
            className={[
              "mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
              isTaken
                ? "border-orange-300 bg-orange-100 text-orange-900"
                : "border-emerald-300 bg-emerald-50 text-emerald-900",
            ].join(" ")}
          >
            <span>{statusLabel}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        <p className="text-sm text-stone-800">
          Samen puzzelen met je hond voor een sterkere band — op jouw hondenschool of locatie.
        </p>

        <div className="flex flex-wrap gap-2">
          {/* Consumenten-CTA (boeken) */}
          <Link
            href="/#boeken"
            prefetch={false}
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-pink-600 px-4 text-sm font-semibold text-white shadow hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300 focus:ring-offset-2 focus:ring-offset-white"
          >
            Boek nu
          </Link>

          {/* Partner-CTA (contact) */}
          <Link
            href="#contact"
            prefetch={false}
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-black px-4 text-sm font-semibold text-white shadow hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-stone-400 focus:ring-offset-2 focus:ring-offset-white"
          >
            Word partner in {name}
          </Link>
        </div>

        <ul className="mt-1 grid gap-2 sm:grid-cols-2">
          <li className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <div className="text-sm font-semibold text-stone-900">Wat is het?</div>
            <p className="text-[13px] text-stone-700">
              Een plug-and-play hond-mens escaperoom: samenwerken, speuren en plezier.
            </p>
          </li>
          <li className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <div className="text-sm font-semibold text-stone-900">Voor wie?</div>
            <p className="text-[13px] text-stone-700">
              Voor hondenscholen en trainers die hun aanbod willen uitbreiden.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}
