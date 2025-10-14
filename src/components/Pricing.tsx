// PATH: src/components/Pricing.tsx
"use client";

import * as React from "react";
import Link from "next/link";

export default function Pricing() {
  return (
    <section id="prijzen" aria-labelledby="prijzen-title" className="bg-stone-50 py-0">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Titel */}
        <h2
          id="prijzen-title"
          className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-stone-900"
        >
          Wat kost het?
        </h2>
        <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-stone-700">
         Je betaalt een aanbetaling, de rest op locatie.
        </p>

        {/* Divider */}
        <div className="mx-auto mt-6 h-1 w-28 rounded-full bg-gradient-to-r from-pink-400 via-rose-300 to-pink-400" />

        {/* Cards */}
        <div className="mx-auto mt-12 max-w-3xl grid gap-6 sm:grid-cols-2">
          {/* Kaart: 1 persoon */}
          <article className="group relative h-64 overflow-hidden rounded-2xl border border-stone-200 shadow-[0_6px_24px_-8px_rgba(0,0,0,0.25)]">
            <img
              src="/images/Sherrif1.png"
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-500 will-change-transform group-hover:scale-[1.02]"
              aria-hidden
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/55" />
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/20" />

            <div className="relative z-10 flex h-full flex-col justify-end p-4 text-left">
              <h3 className="text-sm font-semibold tracking-tight text-white/95 drop-shadow">
                1 persoon
              </h3>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-2xl font-black leading-tight text-white drop-shadow">
                  € 49,95
                </span>
                <span className="text-[11px] font-medium text-white/80 drop-shadow">
                  per sessie
                </span>
              </div>
              <div className="mt-3">
                <Link
                  href="#boeken"
                  className="inline-flex h-10 items-center justify-center rounded-2xl bg-pink-600 px-4 text-sm font-semibold text-white shadow hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300 active:translate-y-[1px]"
                >
                  Boek nu
                </Link>
              </div>
            </div>
          </article>

          {/* Kaart: 2 of meer personen */}
          <article className="group relative h-64 overflow-hidden rounded-2xl border border-stone-200 shadow-[0_6px_24px_-8px_rgba(0,0,0,0.25)]">
            <img
              src="/images/Sherrif2.png"
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-500 will-change-transform group-hover:scale-[1.02]"
              aria-hidden
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/55" />
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/20" />

            <div className="relative z-10 flex h-full flex-col justify-end p-4 text-left">
              <h3 className="text-sm font-semibold tracking-tight text-white/95 drop-shadow">
                2 of meer personen
              </h3>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-2xl font-black leading-tight text-white drop-shadow">
                  € 39,95
                </span>
                <span className="text-[11px] font-semibold text-white/85 drop-shadow">
                  p.p.
                </span>
              </div>
              <div className="mt-3">
                <Link
                  href="#boeken"
                  className="inline-flex h-10 items-center justify-center rounded-2xl bg-pink-600 px-4 text-sm font-semibold text-white shadow hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300 active:translate-y-[1px]"
                >
                  Boek nu
                </Link>
              </div>
            </div>
          </article>
        </div>

        {/* Speeladvies */}
        <p className="mt-8 text-center text-sm font-medium text-stone-800">
          👉 Voor de optimale beleving raden we <strong>2 personen + 1 hond</strong> aan
        </p>
      </div>
    </section>
  );
}
