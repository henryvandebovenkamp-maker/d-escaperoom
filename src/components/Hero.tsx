// PATH: src/components/Hero.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";

const HERO_IMAGES = [
  {
    src: "/images/hero/IMG_0978.jpg",
    alt: "Spelers en hond lossen samen puzzels op in de western escaperoom",
  },
  {
    src: "/images/hero/IMG_1049.jpg",
    alt: "Familie met hond tijdens de testdag van The Missing Snack",
  },
  {
    src: "/images/hero/IMG_1029.jpg",
    alt: "Spelers met hond in western sfeer tijdens The Missing Snack",
  },
];

const FEATURE_CHIPS = [
  "Speelduur ± 45 min",
  "Baas & hond als team",
  "Western beleving",
];

export default function Hero() {
  const [activeIndex, setActiveIndex] = React.useState(0);

  // oneindige loop slideshow
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = current + 1;
        return next >= HERO_IMAGES.length ? 0 : next;
      });
    }, 3500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-stone-950 text-white"
    >
      {/* achtergrond */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.72)_0%,rgba(12,10,9,0.92)_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      {/* zelfde breedte als Skills */}
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
          {/* LINKS */}
          <div className="text-center lg:text-left">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
            UNIEKE ESCAPEROOM ERVARING
            </span>

            <p className="mt-5 text-sm font-medium uppercase tracking-[0.18em] text-amber-200/90">
              In een hondeschool
            </p>

            <h1
              id="hero-title"
              className="mt-3 text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Unieke beleving
              <span className="block">waar</span>
              <span className="block text-rose-300">baas en hond</span>
              <span className="block text-rose-300">samen puzzelen</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-stone-200/90 sm:text-base lg:mx-0">
              In The Missing Snack worden jullie als team uitgedaagd om samen te werken, puzzels op te lossen en het mysterie van de escaperoom te ontrafelen.
            </p>

            {/* CTA */}
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="#boeken"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-pink-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
              >
                Boek nu
              </Link>

              <Link
                href="#skills"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/30"
              >
                Bekijk de ervaring
              </Link>
            </div>

            {/* chips */}
            <ul className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              {FEATURE_CHIPS.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-stone-100/90"
                >
                  {label}
                </li>
              ))}
            </ul>

            {/* thumbnails */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              {HERO_IMAGES.map((image, index) => {
                const active = index === activeIndex;

                return (
                  <button
                    key={image.src}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Toon foto ${index + 1}`}
                    className={[
                      "relative overflow-hidden rounded-2xl border transition",
                      active
                        ? "border-rose-300 ring-2 ring-rose-300/50"
                        : "border-white/10 hover:border-white/20",
                    ].join(" ")}
                  >
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={image.src}
                        alt=""
                        fill
                        sizes="(max-width: 1024px) 33vw, 15vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RECHTS */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/30">
              <div className="relative aspect-[4/5] w-full sm:aspect-[16/11] lg:aspect-[4/5]">
                {HERO_IMAGES.map((image, index) => (
                  <Image
                    key={image.src}
                    src={image.src}
                    alt={image.alt}
                    fill
                    priority={index === 0}
                    sizes="(max-width:1024px) 100vw, 50vw"
                    className={[
                      "object-cover transition-all duration-700",
                      index === activeIndex
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-[1.03]",
                    ].join(" ")}
                  />
                ))}

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {/* info blok */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-5 backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/90">
                      D-escaperoom
                    </p>

                    <p className="mt-3 text-sm leading-7 text-stone-100/95">
                      Samenwerken, speuren en plezier maken in een ecchte western setting bij een hondenschool.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* einde rechts */}
        </div>
      </div>
    </section>
  );
}