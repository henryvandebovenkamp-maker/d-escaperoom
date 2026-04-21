
// PATH: src/components/Header.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-stone-950/95 px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4">
      <div
        className={[
          "mx-auto flex h-14 max-w-6xl items-center justify-between rounded-[1.6rem] border px-4 shadow-xl transition-all duration-300 sm:h-16 sm:px-6",
          scrolled
            ? "border-white/10 bg-stone-950/92 shadow-black/40"
            : "border-white/10 bg-stone-950/82 shadow-black/25",
        ].join(" ")}
      >
        <Link href="/" className="shrink-0">
          <div className="text-white">
            <div className="text-xl font-black tracking-tight sm:text-2xl">
              D-Escaperoom
            </div>
            <div className="text-[9px] uppercase tracking-[0.34em] text-white/55 sm:text-[10px]">
              PUZZELEN EN SNUFFELEN
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          <Link
            href="/#skills"
            className="text-sm font-medium text-white/80 transition hover:text-white"
          >
            Vaardigheden
          </Link>

          <Link
            href="/#partner"
            className="text-sm font-medium text-white/80 transition hover:text-white"
          >
            Hondenscholen
          </Link>

          <Link
            href="/#contact"
            className="text-sm font-medium text-white/80 transition hover:text-white"
          >
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/partner/login"
            className="hidden h-10 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-stone-900 transition hover:bg-stone-100 sm:inline-flex"
          >
            Partner login
          </Link>

          <Link
            href="/#boeken"
            className="inline-flex h-10 items-center justify-center rounded-full bg-pink-600 px-5 text-sm font-semibold text-white transition hover:bg-pink-700"
          >
            Boek nu
          </Link>
        </div>
      </div>
    </header>
  );
}