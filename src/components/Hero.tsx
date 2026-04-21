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
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.72)_0%,rgba(12,10,9,0.96)_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-8 lg:px-8 lg:py-16">
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
              <span className="block text-rose-300">werken samen en lossen het mysterie op</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-stone-200/90">
              In The Missing Snack worden jullie als team uitgedaagd om puzzels
              op te lossen en samen het mysterie te ontrafelen.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
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
                          active ? "bg-black/10" : "bg-black/30",
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

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/28 to-black/12" />

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-5 backdrop-blur-md">
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

        {/* MOBIEL / TABLET */}
        <div className="lg:hidden">
          <div className="grid grid-cols-[minmax(0,1.9fr)_minmax(92px,0.95fr)] gap-3 sm:grid-cols-[minmax(0,2fr)_150px] sm:gap-4">
            <div className="relative min-w-0">
              <div className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/30">
                <div className="relative aspect-[0.82] w-full sm:aspect-[0.9]">
                  {HERO_IMAGES.map((image, index) => (
                    <Image
                      key={image.src}
                      src={image.src}
                      alt={image.alt}
                      fill
                      priority={index === 0}
                      sizes="(max-width: 640px) 68vw, (max-width: 1024px) 60vw, 50vw"
                      className={[
                        "object-cover transition-all duration-700",
                        index === activeIndex
                          ? "opacity-100 scale-100"
                          : "opacity-0 scale-[1.03]",
                      ].join(" ")}
                    />
                  ))}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/18 to-black/10" />

                  <div className="absolute left-3 right-3 top-3 sm:left-4 sm:right-4 sm:top-4">
                    <div className="inline-flex max-w-full rounded-[1.1rem] border border-white/15 bg-black/45 px-4 py-2 text-[8.5px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-md sm:text-[9px]">
                      UNIEKE ESCAPEROOM ERVARING IN EEN HONDENSCHOOL
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4">
                    <div className="max-w-[20.5rem] rounded-[1.35rem] border border-white/10 bg-black/56 px-3.5 py-3.5 shadow-2xl backdrop-blur-xl sm:max-w-[23rem] sm:px-4 sm:py-4">
                      <h1
                        id="hero-title"
                        className="max-w-[10.5ch] text-[1.95rem] font-black leading-[0.9] tracking-tight text-rose-300 sm:text-[2.25rem]"
                      >
                        <span className="block">Baas en hond</span>
                        <span className="block">werken samen</span>
                      </h1>

                      <p className="mt-2.5 max-w-[31ch] text-[11px] leading-5 text-stone-100/88 sm:text-[12px] sm:leading-5">
                        In The Missing Snack worden jullie als team uitgedaagd
                        om puzzels op te lossen en samen het mysterie te
                        ontrafelen.
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href="#boeken"
                          className="inline-flex min-h-9 items-center justify-center rounded-xl bg-pink-600 px-3.5 py-2 text-[11px] font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
                        >
                          Boek nu
                        </Link>

                        <Link
                          href="#skills"
                          className="inline-flex min-h-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-[11px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/30"
                        >
                          Bekijk de ervaring
                        </Link>
                      </div>

                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {FEATURE_CHIPS.map((label) => (
                          <li
                            key={label}
                            className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[9px] font-medium text-stone-100/90"
                          >
                            {label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:gap-4">
              {HERO_IMAGES.map((image, index) => {
                const active = index === activeIndex;

                return (
                  <button
                    key={image.src}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Toon foto ${index + 1}`}
                    className={[
                      "group relative overflow-hidden rounded-[1.35rem] border transition",
                      active
                        ? "border-rose-300 ring-2 ring-rose-300/50"
                        : "border-white/10 hover:border-white/20",
                    ].join(" ")}
                  >
                    <div className="relative aspect-[0.94] w-full">
                      <Image
                        src={image.src}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 26vw, 150px"
                        className="object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                      <div
                        className={[
                          "absolute inset-0 transition",
                          active ? "bg-black/10" : "bg-black/28",
                        ].join(" ")}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}