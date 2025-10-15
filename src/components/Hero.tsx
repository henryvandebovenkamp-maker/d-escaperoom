// PATH: src/components/Hero.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate">
      {/* Achtergrondafbeelding (decoratief) */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <Image
          src="/images/header-foto.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-stone-950/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(12,10,9,0.6)_100%)]" />
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-4xl px-4 py-28 sm:py-36 text-center">
        <span className="inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-stone-100/90 backdrop-blur-sm">
          UNIEKE ESCAPEROOM ERVARING
        </span>

        <p className="mt-2 text-sm font-medium text-stone-200/90">
          Werk samen met je hond.
        </p>

        {/* Lockup (titel + korte tekst) als één afbeelding */}
        <h1
          id="hero-title"
          aria-label="The Missing Snack — Los door samenwerking de interactieve puzzels op."
          className="mt-6 leading-none"
        >
          <Image
            src="/images/hero-lockup.svg"   // <-- juiste verwijzing (public/images/hero-lockup.svg)
            alt=""
            width={2000}
            height={600}
            priority
            className="mx-auto w-[min(90vw,60rem)] h-auto"
          />
        </h1>

        {/* Verborgen fallback/SEO */}
        <p className="sr-only">The Missing Snack</p>
        <p className="sr-only">Los door samenwerking de interactieve puzzels op.</p>

        {/* CTA */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="#boeken"
            className="rounded-2xl bg-pink-600 px-6 py-3 text-base font-semibold text-white shadow hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
          >
            Boek nu
          </Link>
          <Link
            href="#contact"
            className="rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-base font-semibold text-white/95 shadow hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/30"
          >
            Stel je vraag
          </Link>
        </div>

        {/* Feature chips */}
        <ul
          aria-label="Kenmerken van de ervaring"
          className="mt-8 flex flex-wrap justify-center gap-2"
        >
          {[
            "Speelduur +/- 45 min",
            "Hondvriendelijk",
            "Speeladvies: 2 spelers + 1 hond",
          ].map((label) => (
            <li
              key={label}
              className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-stone-100/90 backdrop-blur-[2px]"
            >
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
