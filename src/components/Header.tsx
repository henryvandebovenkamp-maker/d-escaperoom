// PATH: src/components/Header.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Locale = "nl" | "en" | "de" | "es" | "ja";

const SECTIONS = ["skills", "prijzen", "partner", "contact"] as const;
type SectionId = (typeof SECTIONS)[number];
type AnchorId = SectionId | "boeken";

export default function Header({ locale = "nl" as Locale }) {
  const pathname = usePathname() || "/";
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [langOpen, setLangOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [active, setActive] = React.useState<SectionId | null>(null);
  const langRef = React.useRef<HTMLDivElement>(null);

  // Refs voor hoogte-metingen (mobiel spacer)
  const fixedWrapRef = React.useRef<HTMLDivElement>(null);
  const [fixedH, setFixedH] = React.useState<number>(0);

  /* ===== Scroll blur/shadow (geen auto-hide) ===== */
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ===== Close language dropdown on outside click / ESC ===== */
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!langRef.current) return;
      if (!langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLangOpen(false);
        setDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  /* ===== Locale & anchors ===== */
  const localeMatch = pathname.match(/^\/(nl|en|de|es|ja)(?=\/|$)/);
  const currentPrefix: `/${Locale}` | "" = (localeMatch ? `/${localeMatch[1]}` : "") as any;
  const isHome =
    pathname === "/" || pathname === `${currentPrefix}/` || pathname === currentPrefix;

  const toAnchor = (id: AnchorId) =>
    isHome ? `#${id}` : `${currentPrefix || ""}/#${id}`;

  const baseWithoutLocale =
    pathname.replace(/^\/(nl|en|de|es|ja)(?=\/|$)/, "") || "/";

  // Vlaggen + labels
  const locales = [
    { code: "en" as const, label: "Engels", flag: "🇬🇧", href: "/en" + (baseWithoutLocale === "/" ? "" : baseWithoutLocale) },
    { code: "de" as const, label: "Duits",  flag: "🇩🇪", href: "/de" + (baseWithoutLocale === "/" ? "" : baseWithoutLocale) },
    { code: "es" as const, label: "Spaans", flag: "🇪🇸", href: "/es" + (baseWithoutLocale === "/" ? "" : baseWithoutLocale) },
    { code: "ja" as const, label: "Japans", flag: "🇯🇵", href: "/ja" + (baseWithoutLocale === "/" ? "" : baseWithoutLocale) },
  ];

  /* ===== Active section underline (home only) ===== */
  React.useEffect(() => {
    if (!isHome) {
      setActive(null);
      return;
    }
    const targets = SECTIONS.map((id) => document.getElementById(id)).filter(
      Boolean
    ) as HTMLElement[];
    if (!targets.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top?.target?.id) setActive(top.target.id as SectionId);
      },
      { rootMargin: "-48% 0px -48% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [isHome]);

  const linkCls = (id: SectionId) =>
    `relative text-[13px] ${
      active === id ? "text-stone-900" : "text-stone-700 hover:text-stone-900"
    }`;

  /* ===== Meet hoogte voor mobiele spacer ===== */
  const measure = React.useCallback(() => {
    if (!fixedWrapRef.current) return;
    setFixedH(fixedWrapRef.current.offsetHeight || 0);
  }, []);
  React.useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (fixedWrapRef.current) ro.observe(fixedWrapRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, drawerOpen, langOpen]);

  return (
    <>
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-stone-900 focus:px-3 focus:py-2 focus:text-white"
      >
        Ga naar inhoud
      </a>

      {/* === Mobiel: fixed header; Desktop: sticky === */}
      <div
        ref={fixedWrapRef}
        className="fixed inset-x-0 top-0 z-50 md:sticky md:top-0"
      >
        {/* Gradient strip */}
        <div className="h-2 w-full bg-gradient-to-r from-rose-200 via-pink-300 to-rose-200" />

        <header
          role="navigation"
          aria-label="Hoofdnavigatie"
          className={scrolled ? "bg-stone-50/70 backdrop-blur-sm" : ""}
        >
          <div className="mx-auto max-w-6xl px-4 py-3">
            <div className="relative rounded-2xl border border-stone-200 bg-white/90 shadow-md backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-50/90 via-pink-50/80 to-stone-50/90" />

              <div className="relative flex h-16 items-center justify-between gap-3 px-4">
                {/* Logo */}
                <Link href="/" className="font-black tracking-tight text-stone-900">
                  🐾 D-EscapeRoom
                </Link>

                {/* Desktop nav */}
                <nav className="hidden items-center gap-6 md:flex" aria-label="Primaire">
                  <Link href={toAnchor("skills")} className={linkCls("skills")}>
                    🎯 Skills
                    {active === "skills" && <ActiveUnderline />}
                  </Link>
                  <Link href={toAnchor("prijzen")} className={linkCls("prijzen")}>
                    💰 Prijzen
                    {active === "prijzen" && <ActiveUnderline />}
                  </Link>
                  <Link href={toAnchor("partner")} className={linkCls("partner")}>
                    🤝 Partner worden
                    {active === "partner" && <ActiveUnderline />}
                  </Link>
                  <Link href={toAnchor("contact")} className={linkCls("contact")}>
                    📞 Contact
                    {active === "contact" && <ActiveUnderline />}
                  </Link>
                </nav>

                {/* Actions + Language */}
                <div className="hidden items-center gap-2 md:flex">
                  <Link
                    href="/partner/login"
                    className="rounded-2xl bg-stone-900 px-4 py-2 text-[13px] font-semibold text-white shadow hover:bg-stone-800 focus:outline-none focus:ring-4 focus:ring-stone-400/40"
                  >
                    Partner login
                  </Link>
                  <Link
                    href={toAnchor("boeken")}
                    className="rounded-2xl bg-pink-600 px-4 py-2 text-[13px] font-semibold text-white shadow hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
                  >
                    Boek nu
                  </Link>

                  {/* Language dropdown */}
                  <div ref={langRef} className="relative">
                    <button
                      type="button"
                      aria-label="Taal selecteren"
                      aria-haspopup="listbox"
                      aria-expanded={langOpen}
                      onClick={() => setLangOpen((v) => !v)}
                      className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white/75 text-stone-700 shadow-sm transition hover:bg-stone-50"
                      title="Taal"
                    >
                      🌐
                    </button>

                    {langOpen && (
                      <ul
                        role="listbox"
                        tabIndex={-1}
                        className="absolute right-0 z-[60] mt-2 w-56 rounded-xl border border-stone-200 bg-white shadow-xl"
                      >
                        {locales.map((l) => {
                          const selected = l.code === locale;
                          return (
                            <li key={l.code}>
                              <Link
                                role="option"
                                aria-selected={selected}
                                href={l.href}
                                onClick={() => setLangOpen(false)}
                                className={[
                                  "flex items-center justify-between gap-3 px-3 py-2 text-sm",
                                  selected ? "bg-stone-50" : "bg-white",
                                  "text-stone-800 hover:bg-stone-100",
                                ].join(" ")}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <span className="text-base leading-none">{l.flag}</span>
                                  <span>{l.label}</span>
                                </span>
                                {selected && (
                                  <span
                                    aria-hidden
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"
                                  >
                                    <CheckIcon className="h-3 w-3" />
                                  </span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Mobile hamburger */}
                <button
                  aria-label="Menu"
                  aria-expanded={drawerOpen}
                  onClick={() => setDrawerOpen((v) => !v)}
                  className="inline-flex items-center justify-center rounded-lg border border-stone-300 p-2 md:hidden"
                >
                  <span aria-hidden>☰</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile drawer */}
          {drawerOpen && (
            <div className="mx-auto max-w-6xl px-4 pb-4 md:hidden">
              <div className="rounded-2xl border border-stone-200 bg-white/95 shadow-md backdrop-blur-sm">
                <nav className="grid gap-1 p-3" aria-label="Mobiele navigatie">
                  {SECTIONS.map((id) => (
                    <Link
                      key={id}
                      href={toAnchor(id)}
                      onClick={() => setDrawerOpen(false)}
                      className="rounded-lg px-3 py-2 text-sm text-stone-800 hover:bg-stone-100"
                    >
                      {emojiFor(id)} {labelFor(id)}
                    </Link>
                  ))}

                  {/* Language block */}
                  <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50/70">
                    <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                      🌐 Taal
                    </div>
                    <div className="pb-2">
                      {locales.map((l) => {
                        const selected = l.code === locale;
                        return (
                          <Link
                            key={l.code}
                            href={l.href}
                            onClick={() => setDrawerOpen(false)}
                            className={[
                              "flex items-center justify-between gap-3 px-3 py-2 text-sm",
                              selected ? "bg-stone-50" : "bg-transparent",
                              "text-stone-800 hover:bg-stone-100",
                            ].join(" ")}
                          >
                            <span className="inline-flex items-center gap-2">
                              <span className="text-base leading-none">{l.flag}</span>
                              <span>{l.label}</span>
                            </span>
                            {selected && (
                              <span
                                aria-hidden
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"
                              >
                                <CheckIcon className="h-3 w-3" />
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link
                      href="/partner/login"
                      onClick={() => setDrawerOpen(false)}
                      className="rounded-2xl bg-stone-900 px-4 py-2 text-center text-sm font-semibold text-white shadow hover:bg-stone-800"
                    >
                      Partner login
                    </Link>
                    <Link
                      href={toAnchor("boeken")}
                      onClick={() => setDrawerOpen(false)}
                      className="rounded-2xl bg-pink-600 px-4 py-2 text-center text-sm font-semibold text-white shadow hover:bg-pink-700"
                    >
                      Boek nu
                    </Link>
                  </div>
                </nav>
              </div>
            </div>
          )}
        </header>
      </div>

      {/* Mobiele spacer zodat content niet onder de fixed header kruipt */}
      <div className="md:hidden" style={{ height: fixedH }} />

    </>
  );
}

/* =============== helpers =============== */
function ActiveUnderline() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -bottom-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-300 via-rose-300 to-pink-300"
    />
  );
}

function emojiFor(id: SectionId) {
  switch (id) {
    case "skills":
      return "🎯";
    case "prijzen":
      return "💰";
    case "partner":
      return "🤝";
    case "contact":
      return "📞";
  }
}

function labelFor(id: SectionId) {
  switch (id) {
    case "skills":
      return "Skills";
    case "prijzen":
      return "Prijzen";
    case "partner":
      return "Partner worden";
    case "contact":
      return "Contact";
  }
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="M7.629 13.233 3.9 9.504l1.414-1.414 2.315 2.315 6.057-6.057 1.414 1.414z" />
    </svg>
  );
}
