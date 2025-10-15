// PATH: src/components/Header.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = ["skills", "prijzen", "partner", "contact"] as const;
type SectionId = (typeof SECTIONS)[number];
type AnchorId = SectionId | "boeken";

export default function Header() {
  const pathname = usePathname() || "/";
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [active, setActive] = React.useState<SectionId | null>(null);

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

  /* ===== ESC sluit het mobiele menu ===== */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ===== Anchors (zonder locale) ===== */
  const isHome = pathname === "/" || pathname === "";
  const toAnchor = (id: AnchorId) => (isHome ? `#${id}` : `/#${id}`);

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
  }, [measure, drawerOpen]);

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
                {/* Logo (transparant) */}
                <Link
                  href="/"
                  aria-label="D-EscapeRoom home"
                  className="inline-flex items-center bg-transparent"
                >
                  <img
                    src="/logo.svg"
                    alt="D-EscapeRoom"
                    className="h-8 w-auto sm:h-10 bg-transparent"
                    style={{ backgroundColor: "transparent" }}
                    loading="eager"
                  />
                  <span className="sr-only">D-EscapeRoom</span>
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

                {/* Actions */}
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
