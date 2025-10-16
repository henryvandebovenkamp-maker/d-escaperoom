// PATH: src/components/Pricing.tsx
"use client";

import * as React from "react";
import Link from "next/link";

export default function Pricing() {
  return (
    <section id="prijzen" aria-labelledby="prijzen-title" className="bg-stone-50 py-0">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
        {/* TOPBAND: zelfde grootte als Skills-header */}
        <div className="relative w-full overflow-hidden h-14 sm:h-16 lg:h-20">
          <div className="flex h-full w-full items-start justify-center pt-4 sm:pt-5">
            <img
              src="/images/pricing-header.png"
              alt="" // decoratief
              width={2304}
              height={224}
              className="h-[95%] w-auto object-contain"
            />
          </div>
          <h2 id="prijzen-title" className="sr-only">Wat kost het?</h2>
        </div>

        <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-stone-700">
          Betaal makkelijk met iDEAL of creditcard.
        </p>

        {/* Divider */}
        <div className="mx-auto mt-6 h-1 w-28 rounded-full bg-gradient-to-r from-pink-400 via-rose-300 to-pink-400" />

        {/* Cards (50% lagere hoogte) */}
        <div className="mx-auto mt-12 max-w-3xl grid gap-6 sm:grid-cols-2">
          {/* Kaart: 1 persoon */}
          <article
            className="
              group relative h-36 sm:h-40 overflow-hidden rounded-2xl border border-stone-200
              bg-gradient-to-br from-rose-50/90 via-stone-50 to-stone-100/80
              shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)]
              transition-all duration-500 ease-out will-change-transform
              hover:scale-[1.015] hover:shadow-[0_18px_44px_-18px_rgba(0,0,0,0.35)]
            "
          >
            {/* Watermark compacter */}
            <div
              aria-hidden
              className="
                absolute right-3 top-2 text-6xl sm:text-7xl leading-none opacity-15 select-none pointer-events-none
                transition-transform duration-500 ease-out
                group-hover:translate-x-1 group-hover:-rotate-2 group-hover:opacity-20
              "
            >
              🐾
            </div>

            {/* Zachte highlight / vignette compacter */}
            <div
              aria-hidden
              className="
                absolute -right-8 -top-8 h-28 w-28 sm:h-36 sm:w-36 rounded-full
                bg-white/25 blur-2xl opacity-40 pointer-events-none
              "
            />

            {/* Subtiele ring (on hover roze tint) */}
            <div
              aria-hidden
              className="
                pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/60
                transition-colors duration-300
                group-hover:ring-pink-200/60
              "
            />

            <div className="relative z-10 flex h-full flex-col justify-end p-4 sm:p-5 text-left">
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-stone-900">1 persoon</h3>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl sm:text-3xl font-black leading-none text-stone-900">€ 49,95</span>
                <span className="text-xs sm:text-sm font-medium text-stone-700">per sessie</span>
              </div>
              <div className="mt-3">
                <Link
                  href="#boeken"
                  aria-label="Boek nu: 1 persoon voor € 49,95"
                  className="
                    inline-flex h-10 sm:h-10 items-center justify-center rounded-3xl
                    bg-pink-600 px-5 text-base sm:text-base font-bold text-white
                    shadow hover:bg-pink-700
                    focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50
                    active:translate-y-[1px] transition-colors
                  "
                >
                  Boek nu
                </Link>
              </div>
            </div>
          </article>

          {/* Kaart: 2 of meer personen */}
          <article
            className="
              group relative h-36 sm:h-40 overflow-hidden rounded-2xl border border-stone-200
              bg-gradient-to-br from-rose-50/90 via-stone-50 to-stone-100/80
              shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)]
              transition-all duration-500 ease-out will-change-transform
              hover:scale-[1.015] hover:shadow-[0_18px_44px_-18px_rgba(0,0,0,0.35)]
            "
          >
            <div
              aria-hidden
              className="
                absolute right-3 top-2 text-6xl sm:text-7xl leading-none opacity-15 select-none pointer-events-none
                transition-transform duration-500 ease-out
                group-hover:-translate-y-0.5 group-hover:rotate-1 group-hover:opacity-20
              "
            >
              🤠
            </div>

            <div
              aria-hidden
              className="
                absolute -right-8 -top-8 h-28 w-28 sm:h-36 sm:w-36 rounded-full
                bg-white/25 blur-2xl opacity-40 pointer-events-none
              "
            />

            <div
              aria-hidden
              className="
                pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/60
                transition-colors duration-300
                group-hover:ring-pink-200/60
              "
            />

            <div className="relative z-10 flex h-full flex-col justify-end p-4 sm:p-5 text-left">
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-stone-900">2 of meer personen</h3>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl sm:text-3xl font-black leading-none text-stone-900">€ 39,95</span>
                <span className="text-xs sm:text-sm font-semibold text-stone-700">p.p.</span>
              </div>
              <div className="mt-3">
                <Link
                  href="#boeken"
                  aria-label="Boek nu: 2 of meer personen voor € 39,95 p.p."
                  className="
                    inline-flex h-10 sm:h-10 items-center justify-center rounded-3xl
                    bg-pink-600 px-5 text-base sm:text-base font-bold text-white
                    shadow hover:bg-pink-700
                    focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50
                    active:translate-y-[1px] transition-colors
                  "
                >
                  Boek nu
                </Link>
              </div>
            </div>
          </article>
        </div>

        {/* Speeladvies */}
        <p className="mt-8 text-center text-sm sm:text-base font-medium text-stone-800">
          👉 Voor de optimale beleving raden we <strong>2 personen + 1 hond</strong> aan.
        </p>
      </div>
    </section>
  );
}
