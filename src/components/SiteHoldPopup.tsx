// PATH: src/components/SiteHoldPopup.tsx
"use client";

import * as React from "react";

function isEnabled() {
  const v = `${process.env.NEXT_PUBLIC_SITE_POPUP ?? ""}`.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

export default function SiteHoldPopup() {
  const enabled = isEnabled();

  React.useEffect(() => {
    if (!enabled) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden"; // blokkeer scroll
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hold-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative mx-4 w-full max-w-3xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        {/* Western accent */}
        <div className="h-2 bg-gradient-to-r from-pink-500 via-pink-600 to-pink-500" aria-hidden />

        <div className="p-6 sm:p-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-700">
            D-EscapeRoom <span aria-hidden>•</span> The Missing Snack
          </div>

          <h1
            id="hold-title"
            className="mt-3 text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight"
          >
            Binnenkort beschikbaar in jouw provincie
          </h1>

          <p className="mt-3 text-stone-700 leading-relaxed">
            We sleutelen achter de schermen aan de laatste details.{" "}
            <span className="font-medium">Speuren, samenwerken & fun — samen met je hond.</span>{" "}
            Schrijf je in om als eerste de speeldata te ontvangen (sessie ± 45 minuten).
          </p>

          {/* CTA's — netjes en consistent */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {/* Consumenten */}
            <a
              href={`mailto:info@d-escaperoom.com?subject=Houd%20me%20op%20de%20hoogte%20-%20Consument`}
              className="inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-pink-600"
            >
              Houd me op de hoogte
            </a>

            {/* Hondenscholen */}
            <a
              href={`mailto:info@d-escaperoom.com?subject=Informatiepakket%20voor%20hondenscholen`}
              className="inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold bg-black text-white hover:bg-black/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-stone-900"
            >
              Hondenschool? Informatie aanvragen
            </a>

            {/* Bellen */}
            <a
              href="tel:+31683853373"
              className="inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold border border-stone-300 text-stone-900 hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-stone-400"
            >
              Bel: 06-83853373
            </a>
          </div>

          {/* Subtle bullets */}
          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <li className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-xs text-stone-600">Beleving</p>
              <p className="text-sm font-semibold text-stone-900">Echte puzzels & decor</p>
            </li>
            <li className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-xs text-stone-600">Samen</p>
              <p className="text-sm font-semibold text-stone-900">Baas + hond teamwork</p>
            </li>
            <li className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-xs text-stone-600">Duur</p>
              <p className="text-sm font-semibold text-stone-900">± 45 minuten</p>
            </li>
          </ul>

          <p className="mt-4 text-xs text-stone-500">
            © {new Date().getFullYear()} D-EscapeRoom — “The Missing Snack”
          </p>
        </div>
      </div>
    </div>
  );
}
