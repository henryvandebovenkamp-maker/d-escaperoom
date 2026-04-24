// PATH: src/components/Header.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = ["skills", "prijzen", "partner", "contact"] as const;
type SectionId = (typeof SECTIONS)[number];
type AnchorId = SectionId | "boeken";

const PROVINCE_SLUGS = [
  "dr",
  "fl",
  "fr",
  "ge",
  "gr",
  "lb",
  "nb",
  "nh",
  "ov",
  "ut",
  "zh",
  "ze",
] as const;

type ProvinceSlug = (typeof PROVINCE_SLUGS)[number];

export default function Header() {
  const pathnameRaw = usePathname() || "/";

  const base = React.useMemo(() => {
    const clean = pathnameRaw.split("#")[0].split("?")[0] || "/";
    const first = clean.split("/")[1]?.toLowerCase() || "";
    const inProvince = PROVINCE_SLUGS.includes(first as ProvinceSlug);
    return inProvince ? `/${first}` : "/";
  }, [pathnameRaw]);

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [active, setActive] = React.useState<SectionId | null>(null);

  const fixedWrapRef = React.useRef<HTMLDivElement>(null);
  const [fixedH, setFixedH] = React.useState<number>(0);

  const hrefInContext = React.useCallback(
    (id: AnchorId) => `${base === "/" ? "" : base}#${id}`,
    [base]
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    const targets = SECTIONS.map((id) => document.getElementById(id)).filter(
      Boolean
    ) as HTMLElement[];

    if (!targets.length) {
      setActive(null);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (top?.target?.id) {
          setActive(top.target.id as SectionId);
        }
      },
      {
        rootMargin: "-48% 0px -48% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    targets.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, [base]);

  const measure = React.useCallback(() => {
    if (!fixedWrapRef.current) return;
    setFixedH(fixedWrapRef.current.offsetHeight || 0);
  }, []);

  React.useEffect(() => {
    measure();

    const ro = new ResizeObserver(measure);

    if (fixedWrapRef.current) {
      ro.observe(fixedWrapRef.current);
    }

    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, drawerOpen]);

  const linkCls = (id: SectionId) =>
    [
      "relative rounded-full px-2 py-1 text-[13px] font-semibold transition",
      active === id
        ? "text-rose-200"
        : "text-stone-200/85 hover:text-white",
    ].join(" ");

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-stone-900 focus:px-3 focus:py-2 focus:text-white"
      >
        Ga naar inhoud
      </a>

      <div
        ref={fixedWrapRef}
        className="fixed inset-x-0 top-0 z-50 md:sticky md:top-0"
      >
        <header
          role="navigation"
          aria-label="Hoofdnavigatie"
          className="bg-stone-950/92 backdrop-blur-xl"
        >
          <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl shadow-black/30 backdrop-blur-md">
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.12),transparent_42%)]"
              />

              <div className="relative flex h-16 items-center justify-between gap-3 px-4">
                <Link
                  href={base === "/" ? "/" : base}
                  aria-label="D-EscapeRoom home"
                  className="inline-flex items-center"
                >
                  <img
                    src="/logo.svg"
                    alt="D-EscapeRoom"
                    className="h-8 w-auto brightness-0 invert sm:h-10"
                    loading="eager"
                  />
                  <span className="sr-only">D-EscapeRoom</span>
                </Link>

                <nav
                  className="hidden items-center gap-4 md:flex"
                  aria-label="Primaire navigatie"
                >
                  <Link href={hrefInContext("skills")} className={linkCls("skills")}>
                    Vaardigheden
                    {active === "skills" && <ActiveUnderline />}
                  </Link>

                  <Link href={hrefInContext("prijzen")} className={linkCls("prijzen")}>
                    Prijzen
                    {active === "prijzen" && <ActiveUnderline />}
                  </Link>

                  <Link href={hrefInContext("partner")} className={linkCls("partner")}>
                    Hondenscholen
                    {active === "partner" && <ActiveUnderline />}
                  </Link>

                  <Link href={hrefInContext("contact")} className={linkCls("contact")}>
                    Contact
                    {active === "contact" && <ActiveUnderline />}
                  </Link>
                </nav>

                <div className="hidden items-center gap-2 md:flex">
                  <Link
                    href="/partner/login"
                    className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/20"
                  >
                    Partner login
                  </Link>

                  <Link
                    href={hrefInContext("boeken")}
                    className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-pink-600 px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
                  >
                    Boek nu
                  </Link>
                </div>

                <button
                  type="button"
                  aria-label="Menu"
                  aria-expanded={drawerOpen}
                  onClick={() => setDrawerOpen((v) => !v)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/20 md:hidden"
                >
                  <span aria-hidden>{drawerOpen ? "×" : "☰"}</span>
                </button>
              </div>
            </div>
          </div>

          {drawerOpen && (
            <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:hidden lg:px-8">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-stone-950/95 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <nav className="grid gap-1" aria-label="Mobiele navigatie">
                  {SECTIONS.map((id) => (
                    <Link
                      key={id}
                      href={hrefInContext(id)}
                      onClick={() => setDrawerOpen(false)}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-stone-100 transition hover:bg-white/10"
                    >
                      {labelFor(id)}
                    </Link>
                  ))}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link
                      href="/partner/login"
                      onClick={() => setDrawerOpen(false)}
                      className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-center text-sm font-semibold text-white"
                    >
                      Partner login
                    </Link>

                    <Link
                      href={hrefInContext("boeken")}
                      onClick={() => setDrawerOpen(false)}
                      className="rounded-2xl bg-pink-600 px-4 py-2 text-center text-sm font-semibold text-white"
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

      <div className="md:hidden" style={{ height: fixedH }} />
    </>
  );
}

function ActiveUnderline() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -bottom-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-400 via-rose-300 to-pink-400"
    />
  );
}

function labelFor(id: SectionId) {
  switch (id) {
    case "skills":
      return "Vaardigheden";
    case "prijzen":
      return "Prijzen";
    case "partner":
      return "Hondenscholen";
    case "contact":
      return "Contact";
  }
}