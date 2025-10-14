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
        {/* Donkere overlay + zachte vignette voor focus */}
        <div className="absolute inset-0 bg-stone-950/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(12,10,9,0.6)_100%)]" />
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-3xl px-4 py-28 sm:py-36 text-center">
        {/* Eyebrow */}
        <span className="inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-stone-100/90 backdrop-blur-sm">
          WERK SAMEN MET JE HOND
        </span>

        {/* Sub-eyebrow */}
        <p className="mt-2 text-sm font-medium text-stone-200/90">
          Een unieke escaperoom ervaring
        </p>

        {/* Titel (thema) */}
        <h1
          id="hero-title"
          className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-6xl"
        >
          The Missing Snack
        </h1>

        {/* Subtitel — nadruk op samenwerking en plezier */}
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-200 sm:text-lg">
          Een avontuurlijke escape-ervaring die je <em>samen</em> met je hond beleeft.
          Jij ontraadt de puzzels, je hond speurt en verrast. Hondvriendelijk,
          laagdrempelig en bovenal: geweldig om samen te doen.
        </p>

        {/* CTA: consumenten-focus */}
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

        {/* Feature chips (opgeschoond + speeladvies) */}
        <ul
          aria-label="Kenmerken van de ervaring"
          className="mt-8 flex flex-wrap justify-center gap-2"
        >
          {[
            "45 min avontuur",
            "Hondvriendelijk & prikkelarm",
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
