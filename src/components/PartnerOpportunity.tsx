// PATH: src/components/PartnerWidget.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";

/* =========================================
   Types
========================================= */
type ProvinceCode =
  | "DR" | "FL" | "FR" | "GE" | "GR" | "LB" | "NB" | "NH" | "OV" | "UT" | "ZH" | "ZE";

type Province = {
  code: ProvinceCode;
  name: string;
  taken?: { by: string; note?: string };
};

type Props = {
  /** handmatig overrides per provincie (bijv. bezet zetten) */
  overrides?: Partial<Record<ProvinceCode, { by: string; note?: string }>>;
  className?: string;
};

/* =========================================
   Data
========================================= */
const PROVINCES: Province[] = [
  { code: "DR", name: "Drenthe" },
  { code: "FL", name: "Flevoland" },
  { code: "FR", name: "Friesland" },
  { code: "GE", name: "Gelderland" },
  { code: "GR", name: "Groningen" },
  { code: "LB", name: "Limburg" },
  { code: "NB", name: "Noord-Brabant" },
  { code: "NH", name: "Noord-Holland" },
  { code: "OV", name: "Overijssel" },
  { code: "UT", name: "Utrecht", taken: { by: "WoofExperience", note: "Regio Utrecht is bezet" } },
  { code: "ZH", name: "Zuid-Holland" },
  { code: "ZE", name: "Zeeland" },
];

/* =========================================
   Helpers
========================================= */
function applyOverrides(base: Province[], overrides?: Props["overrides"]): Province[] {
  if (!overrides) return base;
  return base.map((p) =>
    overrides[p.code] ? { ...p, taken: overrides[p.code] || undefined } : p
  );
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function parseMoney(input: string): number {
  if (!input) return 0;
  let s = input.replace(/[^\d,.\-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function formatEUR(n: number) {
  try {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
  } catch {
    return `€ ${n.toFixed(2)}`;
  }
}

/** ClientOnly: rendert kinderen pas na mount (voorkomt SSR-hydration issues bij inputs) */
function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}

/* =========================================
   Component
========================================= */
export default function PartnerWidget({ overrides, className = "" }: Props) {
  const items = React.useMemo(() => applyOverrides(PROVINCES, overrides), [overrides]);

  // Mini-calculator — altijd controlled (geen undefined)
  const [sessionsPerWeek, setSessionsPerWeek] = React.useState<number>(4);
  const [avgPlayers, setAvgPlayers] = React.useState<number>(3);
  const [pricePerPlayer, setPricePerPlayer] = React.useState<number>(39.95);

  const weekly = React.useMemo(
    () => sessionsPerWeek * avgPlayers * pricePerPlayer,
    [sessionsPerWeek, avgPlayers, pricePerPlayer]
  );
  const monthly = React.useMemo(() => weekly * 4, [weekly]);

  return (
    <section
      aria-labelledby="partner-widget-title"
      className={[
        "space-y-4 rounded-2xl border border-stone-200 bg-white/95 p-3 md:p-4 shadow-md backdrop-blur-sm",
        className,
      ].join(" ")}
    >
      {/* ======= HEADER ======= */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200">
        {/* Afbeelding met iets minder overlay → duidelijker */}
        <div className="absolute inset-0">
          <Image
            src="/images/header-foto.png"
            alt="Western thema decor voor D-EscapeRoom"
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1200px"
          />
          {/* subtiele dual-overlay voor contrast zonder te grijpen */}
          <div className="absolute inset-0 bg-gradient-to-r from-rose-50/65 via-pink-50/55 to-stone-50/70" />
          <div className="absolute inset-0 bg-black/10 mix-blend-multiply" aria-hidden />
        </div>

        <div className="relative z-10 p-4 text-center">
          <h2
            id="partner-widget-title"
            className="text-xl md:text-2xl font-black leading-tight tracking-tight text-stone-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]"
          >
            Bied jouw klanten deze unieke beleving
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-[13px] text-stone-800">
            D-EscapeRoom “The Missing Snack” — Western-styled, veilig en leuk voor hond &amp; baas.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl">
        {/* === TOP: propositie + rekenmodule === */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Propositie */}
          <div
            className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
            aria-labelledby="prop-title"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-stone-200" />
            <div aria-hidden className="pointer-events-none absolute -inset-px rounded-[14px] bg-gradient-to-br from-rose-50/70 via-pink-50/40 to-stone-50/30" />
            <div className="relative z-10 space-y-2">
              <h3
                id="prop-title"
                className="text-base font-extrabold leading-tight tracking-tight text-stone-900"
              >
                De ‘Missing Snack’ op jouw locatie
              </h3>
              <p className="text-[13px] text-stone-700">
                Speelse, veilige beleving die moeiteloos in je rooster past.
              </p>

              <ul className="space-y-2">
                <li>
                  <div className="flex items-baseline gap-2">
                    <span aria-hidden>🐶</span>
                    <span className="text-[13px] font-semibold text-stone-900">Unieke beleving</span>
                  </div>
                  <p className="pl-6 text-[13px] text-stone-700">
                    hond &amp; baas werken samen, leuk voor gezinnen en vriendengroepen.
                  </p>
                </li>
                <li>
                  <div className="flex items-baseline gap-2">
                    <span aria-hidden>📅</span>
                    <span className="text-[13px] font-semibold text-stone-900">Past in je rooster</span>
                  </div>
                  <p className="pl-6 text-[13px] text-stone-700">
                    sessies naast je reguliere lessen, met heldere tijdslots.
                  </p>
                </li>
                <li>
                  <div className="flex items-baseline gap-2">
                    <span aria-hidden>🧰</span>
                    <span className="text-[13px] font-semibold text-stone-900">Gemak</span>
                  </div>
                  <p className="pl-6 text-[13px] text-stone-700">
                    Jij host; wij leveren concept, materialen en styling.
                  </p>
                </li>
                <li>
                  <div className="flex items-baseline gap-2">
                    <span aria-hidden>🏅</span>
                    <span className="text-[13px] font-semibold text-stone-900">Exclusief</span>
                  </div>
                  <p className="pl-6 text-[13px] text-stone-700">
                    maximaal één partner per provincie voor scherpe positionering.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          {/* Rekenmodule (client-only om hydration mismatches door extensies te voorkomen) */}
          <div
            className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
            aria-labelledby="calc-title"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-stone-200" />
            <div aria-hidden className="pointer-events-none absolute -inset-px rounded-[14px] bg-gradient-to-br from-rose-50/70 via-pink-50/40 to-stone-50/30" />
            <div className="relative z-10 space-y-2">
              <h3
                id="calc-title"
                className="text-base font-extrabold leading-tight tracking-tight text-stone-900"
              >
                Extra omzet — rekenmodule
              </h3>
              <p className="text-[13px] text-stone-700">
                Pas je aannames aan en zie direct wat het kan opleveren.
              </p>

              <ClientOnly
                fallback={
                  // Skeleton tijdens SSR (geen inputs → geen hydration-issues)
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-12 rounded-lg bg-stone-100 border border-stone-200 animate-pulse" />
                      <div className="h-12 rounded-lg bg-stone-100 border border-stone-200 animate-pulse" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-10 rounded-lg bg-stone-100 border border-stone-200 animate-pulse" />
                      <div className="h-10 rounded-lg bg-stone-100 border border-stone-200 animate-pulse" />
                      <div className="h-10 rounded-lg bg-stone-100 border border-stone-200 animate-pulse" />
                    </div>
                  </div>
                }
              >
                {/* KPI's */}
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Omzet indicatie">
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                    <div className="text-[11px] text-stone-600">Per week</div>
                    <div className="text-lg font-extrabold text-stone-900">
                      {formatEUR(weekly)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                    <div className="text-[11px] text-stone-600">Per maand</div>
                    <div className="text-lg font-extrabold text-stone-900">
                      {formatEUR(monthly)}
                    </div>
                  </div>
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-3 gap-2">
                  <LabeledNumber
                    label="Sessies"
                    value={sessionsPerWeek}
                    onChange={(v) => setSessionsPerWeek(clamp(v, 1, 40))}
                    min={1}
                    max={40}
                  />
                  <LabeledNumber
                    label="Gem. pers."
                    value={avgPlayers}
                    onChange={(v) => setAvgPlayers(clamp(v, 1, 8))}
                    min={1}
                    max={8}
                  />
                  <LabeledMoney
                    label="€ p.p."
                    value={pricePerPlayer}
                    onValue={(n) => setPricePerPlayer(clamp(n, 0, 500))}
                  />
                </div>
              </ClientOnly>

              <p className="text-[11px] text-stone-600">
                Indicatief, excl. toeslagen/kortingen. Werkelijke omzet kan verschillen.
              </p>

              {/* CTA */}
              <div className="pt-1">
                <Link
                  href="/partner/aanmelden"
                  className="inline-flex h-10 items-center justify-center rounded-2xl bg-black px-4 text-sm font-semibold text-white shadow hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-stone-400 focus:ring-offset-2 focus:ring-offset-white transition"
                >
                  Plan een demo
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Provincies */}
        <div className="mt-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-800">Beschikbaarheid per provincie</h3>
            <div className="text-[10px] text-stone-600" aria-hidden>
              Groen = vrij • Oranje = bezet
            </div>
          </div>

          <ul className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {items.map((p) => {
              const isTaken = Boolean(p.taken);
              const isUtrecht = p.code === "UT";
              const href = `/partner/provincie/${p.code.toLowerCase()}`;

              const statusLabel = isTaken ? "Bezet" : isUtrecht ? "Boek" : "Open";
              const srStatus = isTaken
                ? `Bezet — ${p.taken?.by ?? "reeds ingevuld"}`
                : isUtrecht
                ? "Nu te boeken"
                : "Beschikbaar";

              return (
                <li key={p.code}>
                  <Link
                    href={href}
                    className={[
                      "group relative flex items-center justify-between gap-2 rounded-xl border px-3 py-2",
                      "transition-transform hover:-translate-y-0.5 hover:shadow-md",
                      "focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 focus:ring-offset-white",
                      isTaken
                        ? "border-orange-300 bg-orange-100"
                        : "border-emerald-300 bg-emerald-50",
                    ].join(" ")}
                    aria-label={`${p.name}: ${srStatus}`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-medium text-stone-900">
                        {p.name}
                      </div>
                      <div className="truncate text-[10px] text-stone-700">
                        {isTaken ? `Bezet • ${p.taken?.by}` : isUtrecht ? "Nu te boeken" : "Beschikbaar"}
                      </div>
                    </div>

                    <span
                      className={[
                        "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                        isTaken
                          ? "border-orange-300 bg-orange-100 text-orange-900"
                          : isUtrecht
                          ? "border-pink-600 bg-pink-50 text-pink-700"
                          : "border-emerald-300 bg-emerald-50 text-emerald-900",
                      ].join(" ")}
                      aria-hidden
                    >
                      {statusLabel}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* =========================================
   Subcomponents — ALTIJD CONTROLLED
========================================= */
function LabeledNumber({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;                // altijd een getal (nooit undefined)
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const id = React.useId();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const n = raw === "" ? 0 : Number(raw);
    if (Number.isNaN(n)) return;
    let next = n;
    if (typeof min === "number") next = Math.max(min, next);
    if (typeof max === "number") next = Math.min(max, next);
    onChange(next);
  }

  return (
    <label className="block text-xs font-medium text-stone-800" htmlFor={id}>
      {label}
      <input
        id={id}
        type="number"
        step={step}
        min={min}
        max={max}
        inputMode="numeric"
        className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none transition focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
        value={String(value)}                 // controlled
        onChange={handleChange}
        aria-label={label}
      />
    </label>
  );
}

function LabeledMoney({
  label,
  value,
  onValue,
}: {
  label: string;
  value: number;                 // altijd een getal
  onValue: (n: number) => void;
}) {
  const id = React.useId();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onValue(parseMoney(e.target.value));
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    onValue(parseMoney(e.target.value));
  }

  // We geven gewoon de numerieke string weer; op blur/typen parsen we netjes.
  // (Geen server-side geformatteerde string → minder kans op mismatches.)
  const display = String(value);

  return (
    <label className="block text-xs font-medium text-stone-800" htmlFor={id}>
      {label}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none transition focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
        value={display}                       // controlled
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label={label}
      />
    </label>
  );
}
