// PATH: src/components/Skills.tsx
"use client";

import Link from "next/link";

type Skill = { icon: string; title: string; text: string };

export default function Skills() {
  const skills: Skill[] = [
    {
      icon: "🤝",
      title: "Teamwerk",
      text: "Elke puzzel vraagt om samenwerken: jij begeleidt, je hond onderzoekt als één team.",
    },
    {
      icon: "💬",
      title: "Communicatie",
      text: "Je leert subtiele signalen lezen en op het juiste moment te belonen of sturen.",
    },
    {
      icon: "🧠",
      title: "Vertrouwen & Focus",
      text: "Succeservaringen vergroten zelfvertrouwen en concentratie bij jullie allebei.",
    },
    {
      icon: "🐾",
      title: "Initiatief",
      text: "Snuffelwerk en speuren geven je hond autonomie, jij biedt richting en veiligheid.",
    },
    {
      icon: "🎯",
      title: "Probleemoplossend",
      text: "Samen ontdekken, nadenken en keuzes maken versterkt jullie samenwerking.",
    },
    {
      icon: "🎉",
      title: "Plezier samen",
      text: "Positieve emoties koppelen jullie direct aan elkaar, de basis van een sterke band.",
    },
  ];

  return (
    <section
      id="skills"
      aria-labelledby="skills-title"
      className="relative bg-stone-50 py-16 sm:py-20"
    >
      {/* zachte achtergrondtextuur */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
          maskImage: "linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white/90 shadow-lg backdrop-blur-sm">
          {/* TOPBAND met titel in het midden */}
          <div className="relative grid h-28 w-full place-items-center bg-gradient-to-r from-rose-50/90 via-pink-50/80 to-stone-50/90">
            <h2
              id="skills-title"
              className="text-balance text-2xl font-black tracking-tight text-stone-900 sm:text-3xl"
            >
              Speuren, samenwerken & fun.
            </h2>
          </div>

          {/* header copy onder de balk */}
          <div className="px-6 pt-6 text-center sm:px-10">
            <span className="mx-auto inline-block rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-[11px] font-semibold tracking-wider text-stone-700">
              PUZZELEN MET JE HOND
            </span>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-stone-700">
              Onze escaperoom is ontworpen om jullie als team te laten groeien: vertrouwen, communicatie en plezier
              komen samen in één ervaring.
            </p>

            {/* ornament divider */}
            <div className="mx-auto my-6 flex w-fit items-center gap-2">
              <span className="h-[2px] w-10 rounded bg-gradient-to-r from-stone-200 to-pink-300" />
              <span aria-hidden className="text-pink-500/80">✦</span>
              <span className="h-[2px] w-10 rounded bg-gradient-to-r from-pink-300 to-stone-200" />
            </div>
          </div>

          {/* grid */}
          <ul
            role="list"
            className="grid grid-cols-1 gap-4 px-4 pb-8 sm:grid-cols-2 sm:gap-5 sm:px-6 lg:grid-cols-3 lg:gap-6 lg:px-8"
          >
            {skills.map((s) => (
              <li key={s.title} className="list-none">
                <Link
                  href="#boeken"
                  aria-label={`${s.title} — meer informatie`}
                  className="group block focus:outline-none"
                >
                  <article
                    aria-labelledby={`skill-${slugify(s.title)}-title`}
                    aria-describedby={`skill-${slugify(s.title)}-text`}
                    className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition duration-200 will-change-transform hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-pink-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    {/* subtiele hover-glow */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{
                        background:
                          "linear-gradient(120deg, rgba(244,114,182,0.10), rgba(244,63,94,0.06) 30%, rgba(214,211,209,0.06) 60%)",
                      }}
                    />
                    <div className="relative z-10 flex items-start gap-3">
                      <span
                        aria-hidden
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white/80 text-lg shadow-[0_1px_0_0_rgba(0,0,0,0.04)]"
                      >
                        {s.icon}
                      </span>
                      <div>
                        <h3
                          id={`skill-${slugify(s.title)}-title`}
                          className="text-sm font-semibold text-stone-900"
                        >
                          {s.title}
                        </h3>
                        <p
                          id={`skill-${slugify(s.title)}-text`}
                          className="mt-1 text-sm leading-relaxed text-stone-700"
                        >
                          {s.text}
                        </p>
                        <span className="mt-3 inline-block h-[2px] w-12 rounded bg-stone-200 transition-colors duration-300 group-hover:bg-pink-300" />
                      </div>
                    </div>
                  </article>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}
