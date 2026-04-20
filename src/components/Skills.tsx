// PATH: src/components/Skills.tsx
"use client";

import Link from "next/link";

type Skill = { icon: string; title: string; text: string };

const SKILLS: Skill[] = [
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

export default function Skills() {
  return (
    <section
      id="skills"
      aria-labelledby="skills-title"
      className="relative overflow-hidden bg-stone-950 py-16 text-white sm:py-20"
    >
      {/* achtergrond */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_35%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.94)_0%,rgba(12,10,9,1)_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/30">
          {/* zachte gloed */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,114,182,0.10),rgba(251,191,36,0.06)_40%,rgba(255,255,255,0.03)_100%)]"
          />

          <div className="relative px-6 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
            {/* header */}
            <div className="text-center">
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
                PUZZELEN MET JE HOND
              </span>

              <h2
                id="skills-title"
                className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl"
              >
                Samen groeien
                <span className="block text-rose-300">
                  in vertrouwen, focus en plezier
                </span>
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-stone-200/85 sm:text-base">
                Onze escaperoom is ontworpen om jullie als team sterker te maken.
                Niet alleen leuk om te spelen, maar ook een ervaring waarin
                samenwerking, communicatie en zelfvertrouwen centraal staan.
              </p>

              <div className="mx-auto my-7 flex w-fit items-center gap-3">
                <span className="h-px w-12 bg-gradient-to-r from-transparent to-rose-300/70" />
                <span aria-hidden className="text-amber-200/80">
                  ✦
                </span>
                <span className="h-px w-12 bg-gradient-to-l from-transparent to-amber-200/70" />
              </div>
            </div>

            {/* cards */}
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
              {SKILLS.map((skill) => (
                <li key={skill.title} className="list-none">
                  <Link
                    href="#boeken"
                    aria-label={`${skill.title} — meer informatie`}
                    className="group block h-full focus:outline-none"
                  >
                    <article
                      aria-labelledby={`skill-${slugify(skill.title)}-title`}
                      aria-describedby={`skill-${slugify(skill.title)}-text`}
                      className="relative flex h-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20 p-5 shadow-lg shadow-black/10 backdrop-blur-sm transition duration-300 will-change-transform hover:-translate-y-1 hover:border-rose-300/40 hover:bg-white/[0.08] hover:shadow-2xl hover:shadow-black/20 focus-visible:ring-2 focus-visible:ring-rose-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950"
                    >
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-300"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(244,114,182,0.08), rgba(251,191,36,0.05) 45%, rgba(255,255,255,0.02) 100%)",
                        }}
                      />

                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{
                          background:
                            "linear-gradient(to bottom, rgba(244,114,182,0.10), transparent)",
                        }}
                      />

                      <div className="relative z-10 flex items-start gap-4">
                        <span
                          aria-hidden
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg shadow-[0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
                        >
                          {skill.icon}
                        </span>

                        <div>
                          <h3
                            id={`skill-${slugify(skill.title)}-title`}
                            className="text-base font-semibold text-white"
                          >
                            {skill.title}
                          </h3>

                          <p
                            id={`skill-${slugify(skill.title)}-text`}
                            className="mt-2 text-sm leading-7 text-stone-200/80"
                          >
                            {skill.text}
                          </p>

                          <span className="mt-4 inline-block h-[2px] w-12 rounded bg-white/15 transition-colors duration-300 group-hover:bg-rose-300" />
                        </div>
                      </div>
                    </article>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}