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

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % HERO_IMAGES.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-stone-950 text-white"
    >
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.60)_0%,rgba(12,10,9,0.92)_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8 lg:py-16">
        {/* DESKTOP */}
        <div className="hidden items-center gap-10 lg:grid lg:grid-cols-[0.96fr_1.04fr]">
          <div className="text-left">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
              UNIEKE ESCAPEROOM ERVARING IN EEN HONDENSCHOOL
            </span>

            <h1
              id="hero-title"
              className="mt-5 text-6xl font-black leading-[0.92] tracking-tight"
            >
              <span className="block text-rose-300">Baas en hond</span>
              <span className="block text-rose-300">
                werken samen en lossen het mysterie op
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-stone-200/90">
              In The Missing Snack worden jullie als team uitgedaagd om puzzels
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

            <ul className="mt-6 flex flex-wrap gap-2">
              {FEATURE_CHIPS.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-stone-100/90"
                >
                  {label}
                </li>
              ))}
            </ul>

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
                      "group relative overflow-hidden rounded-2xl border transition",
                      active
                        ? "border-rose-300 ring-2 ring-rose-300/50"
                        : "border-white/10 hover:border-white/20",
                    ].join(" ")}
                  >
                    <div className="relative aspect-[5/4]">
                      <Image
                        src={image.src}
                        alt=""
                        fill
                        sizes="(max-width: 1024px) 33vw, 15vw"
                        className="object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                      <div
                        className={[
                          "absolute inset-0 transition",
                          active ? "bg-black/8" : "bg-black/22",
                        ].join(" ")}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/30">
              <div className="relative aspect-[4/5] w-full">
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

                <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/18 to-black/8" />

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/90">
                      D-escaperoom
                    </p>

                    <p className="mt-3 text-sm leading-7 text-stone-100/95">
                      Samenwerken, speuren en plezier maken in een echte western
                      setting bij een hondenschool.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MOBIEL */}
        <div className="lg:hidden">
          <div className="relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/30">
            <div className="relative aspect-[0.82] min-h-[500px] w-full sm:aspect-[0.9]">
              {HERO_IMAGES.map((image, index) => (
                <Image
                  key={image.src}
                  src={image.src}
                  alt={image.alt}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className={[
                    "object-cover transition-all duration-700",
                    index === activeIndex
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-[1.03]",
                  ].join(" ")}
                />
              ))}

              <div className="absolute inset-0 bg-gradient-to-t from-black/48 via-black/12 to-black/6" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,120,120,0.08),transparent_45%)]" />

              <div className="absolute inset-x-0 top-0 p-4">
                <div className="inline-flex max-w-full rounded-full border border-white/20 bg-black/15 px-3 py-1.5 text-[9px] font-semibold tracking-[0.22em] text-stone-100/95 backdrop-blur-md">
                  UNIEKE ESCAPEROOM ERVARING IN EEN HONDENSCHOOL
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="w-full rounded-[1.45rem] border border-white/15 bg-black/18 px-3.5 py-3 shadow-[0_10px_34px_rgba(0,0,0,0.18)] backdrop-blur-md">
                  <h1
                    id="hero-title"
                    className="max-w-[13ch] text-[1.58rem] font-black leading-[0.9] tracking-tight"
                  >
                    <span className="block text-rose-300">Baas en hond</span>
                    <span className="block text-white">
                      lossen samen het mysterie op
                    </span>
                  </h1>

                  <p className="mt-2 max-w-none text-[11px] leading-5 text-stone-100/92">
                    In The Missing Snack worden jullie als team uitgedaagd om
                    puzzels op te lossen en samen het mysterie te ontrafelen.
                  </p>

                  <div className="mt-3">
                    <Link
                      href="#boeken"
                      className="inline-flex min-h-9 items-center justify-center rounded-xl bg-pink-600 px-3.5 py-2 text-[11px] font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
                    >
                      Boek nu
                    </Link>
                  </div>

                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {FEATURE_CHIPS.map((label) => (
                      <li
                        key={label}
                        className="rounded-full border border-white/15 bg-black/18 px-2.5 py-1 text-[9px] font-medium text-stone-100/95 backdrop-blur-sm"
                      >
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            {HERO_IMAGES.map((image, index) => {
              const active = index === activeIndex;

              return (
                <button
                  key={image.src}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Toon foto ${index + 1}`}
                  className={[
                    "h-2.5 rounded-full transition-all",
                    active ? "w-8 bg-pink-500" : "w-2.5 bg-white/30",
                  ].join(" ")}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}