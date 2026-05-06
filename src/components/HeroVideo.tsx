// PATH: src/components/HeroVideo.tsx
"use client";

import Link from "next/link";

const FEATURE_CHIPS = [
  "Speelduur ± 45 min",
  "Baas & hond als team",
  "Western beleving",
];

export default function HeroVideo() {
  return (
    <section className="relative overflow-hidden bg-stone-950 text-white">
      {/* achtergrond */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.72)_0%,rgba(12,10,9,0.96)_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          
          {/* LINKS = TEKST */}
          <div className="text-center lg:text-left">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
              UNIEKE ESCAPEROOM ERVARING IN EEN HONDENSCHOOL
            </span>

            <h1 className="mt-5 text-5xl font-black leading-[0.92] tracking-tight text-rose-300 sm:text-6xl lg:text-6xl">
              Baas en hond werken samen en lossen het mysterie op
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-stone-200/90">
              In The Stolen Snack worden jullie als team uitgedaagd om puzzels
              op te lossen en samen het mysterie te ontrafelen.
            </p>

            <div className="mt-8">
              <Link
                href="#boeken"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-pink-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
              >
                Boek nu
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              {FEATURE_CHIPS.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-stone-100/90"
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* RECHTS = VIDEO */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/30">
              <video
                className="aspect-[9/16] w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster="/images/header-foto.png"
              >
                <source src="/videos/d-escape-home.mp4" type="video/mp4" />
              </video>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}