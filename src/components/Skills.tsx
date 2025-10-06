// PATH: src/components/Skills.tsx
"use client";

import Link from "next/link";

export default function Skills() {
  const skills = [
    {
      icon: "🤝",
      title: "Samenwerken",
      text: "Jullie leren elkaars signalen lezen en versterken zo de onderlinge communicatie.",
    },
    {
      icon: "🧩",
      title: "Puzzelen",
      text: "Spannende uitdagingen die jullie samen oplossen door slim denken en samenwerken.",
    },
    {
      icon: "🐾",
      title: "Speuren & Snuffelen",
      text: "Honden gebruiken hun neus om aanwijzingen te vinden en het mysterie op te lossen.",
    },
    {
      icon: "🐕",
      title: "Gehoorzaamheid",
      text: "Basiscommando’s worden spelenderwijs ingezet om verder te komen in het avontuur.",
    },
    {
      icon: "💞",
      title: "Verbinding",
      text: "Samen successen beleven versterkt jullie band en vertrouwen.",
    },
    {
      icon: "🎉",
      title: "Plezier",
      text: "Het allerbelangrijkste: samen lachen, ontdekken en genieten van de ervaring.",
    },
  ];

  return (
    <section id="skills" aria-labelledby="skills-title" className="bg-stone-50 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Buitenste kaart in BookingWidget-stijl */}
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-md backdrop-blur-sm sm:p-8">
          {/* Zachte gradient header-overlay (decoratief, niet dominant) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-2xl bg-gradient-to-r from-rose-50/90 via-pink-50/80 to-stone-50/90"
          />

          {/* Titelblok */}
          <div className="relative z-10 text-center">
            <h2
              id="skills-title"
              className="text-2xl md:text-3xl font-black tracking-tight text-stone-900"
            >
              Deze elementen maken de escaperoom nog leuker!
            </h2>
            <p className="mt-1 mx-auto max-w-xl text-sm text-stone-700">
              Want samenwerken met jouw hond is de ultieme manier van verbinden.
            </p>

            {/* Divider */}
            <div className="mx-auto mt-6 h-1 w-28 rounded-full bg-gradient-to-r from-pink-400 via-rose-300 to-pink-400" />
          </div>

          {/* Grid met kaartjes */}
          <div className="relative z-10 mt-10 grid grid-cols-1 gap-4 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <Link
                key={skill.title}
                href="#boeken"
                aria-label={`${skill.title} — meer informatie`}
                className="group relative flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-pink-300"
              >
                {/* Hover overlay tint */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-br from-rose-50/60 via-pink-50/40 to-stone-50/30 opacity-0 transition group-hover:opacity-100"
                />

                {/* Emoji-badge */}
                <span
                  aria-hidden
                  className="relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white/80 text-base"
                >
                  {skill.icon}
                </span>

                {/* Tekst */}
                <div className="relative z-10">
                  <h3 className="text-sm font-semibold text-stone-800">
                    {skill.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone-700">{skill.text}</p>

                  {/* subtiele focus/hover accent-lijntje */}
                  <span className="mt-2 block h-px w-10 rounded bg-stone-200 transition group-hover:bg-pink-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
