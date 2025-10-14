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

type CalcConfig = {
  /** UI startwaarden */
  initialSessions?: number; // default 4
  initialPlayers?: number;  // default 2
  /** Grenzen */
  minSessions?: number;     // default 1
  maxSessions?: number;     // default 40
  minPlayers?: number;      // default 1
  maxPlayers?: number;      // default 8
  /** Prijs per persoon (vast; read-only in UI) */
  pricePerPlayer?: number;  // default 39.95
};

type Props = {
  overrides?: Partial<Record<ProvinceCode, { by: string; note?: string }>>;
  className?: string;
  calcConfig?: CalcConfig;
  onCalcChange?: (state: {
    sessionsPerWeek: number;
    avgPlayers: number;
    pricePerPlayer: number;
    weekly: number;
    monthly: number;
  }) => void;
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

function formatEUR(n: number) {
  try {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
  } catch {
    return `€ ${n.toFixed(2)}`;
  }
}

/** ClientOnly om hydration issues te voorkomen */
function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}

/* =========================================
   Component
========================================= */
export default function PartnerWidget({
  overrides,
  className = "",
  calcConfig,
  onCalcChange,
}: Props) {
  const items = React.useMemo(() => applyOverrides(PROVINCES, overrides), [overrides]);

  const {
    initialSessions = 4,
    initialPlayers  = 2,
    minSessions = 1,
    maxSessions = 40,
    minPlayers = 1,
    maxPlayers = 8,
    pricePerPlayer = 39.95,
  } = calcConfig || {};

  const [sessionsPerWeek, setSessionsPerWeek] =
    React.useState<number>(clamp(initialSessions, minSessions, maxSessions));
  const [avgPlayers, setAvgPlayers] =
    React.useState<number>(clamp(initialPlayers,  minPlayers,  maxPlayers));

  const weekly = React.useMemo(
    () => sessionsPerWeek * avgPlayers * pricePerPlayer,
    [sessionsPerWeek, avgPlayers, pricePerPlayer]
  );
  const monthly = React.useMemo(() => weekly * 4, [weekly]);

  React.useEffect(() => {
    onCalcChange?.({ sessionsPerWeek, avgPlayers, pricePerPlayer, weekly, monthly });
  }, [sessionsPerWeek, avgPlayers, pricePerPlayer, weekly, monthly, onCalcChange]);

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
        <div aria-hidden className="absolute inset-0">
          <Image
            src="/images/header-foto.png"
            alt="Western thema decor voor D-EscapeRoom"
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1200px"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-rose-50/65 via-pink-50/55 to-stone-50/70" />
          <div className="absolute inset-0 bg-black/10 mix-blend-multiply" aria-hidden />
        </div>

        <div className="relative z-10 p-4 text-center">
          <h2
            id="partner-widget-title"
            className="text-xl md:text-2xl font-black leading-tight tracking-tight text-stone-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]"
          >
            Beleving die doorverteld wordt
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-[13px] text-stone-800">
            D-EscapeRoom “The Missing Snack” — Samenwerken, puzzelen en plezier maken.
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
              <h3 id="prop-title" className="text-base font-extrabold leading-tight tracking-tight text-stone-900">
                D-Escaperoom op jouw locatie?
              </h3>
              <p className="text-[13px] text-stone-700">
                Deze unieke beleving op jouw locatie?
              </p>

              <ul className="space-y-2">
                <li>
                  <div className="flex items-baseline gap-2">
                    <span aria-hidden>🐶</span>
                    <span className="text-[13px] font-semibold text-stone-900">Beleving</span>
                  </div>
                  <p className="pl-6 text-[13px] text-stone-700">
                    Hond en mens werken samen, we samen aan een nog betere band.
                  </p>
                </li>
                <li>
                  <div className="flex items-baseline gap-2">
                    <span aria-hidden>📅</span>
                    <span className="text-[13px] font-semibold text-stone-900">Past in je rooster</span>
                  </div>
                  <p className="pl-6 text-[13px] text-stone-700">
                    Past goed in je bestaande lesaanbod.
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
                    Maximaal D-Escaperoom per provincie
                  </p>
                </li>
              </ul>
            </div>
          </div>

          {/* Rekenmodule */}
          <div
            className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
            aria-labelledby="calc-title"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-stone-200" />
            <div aria-hidden className="pointer-events-none absolute -inset-px rounded-[14px] bg-gradient-to-br from-rose-50/70 via-pink-50/40 to-stone-50/30" />
            <div className="relative z-10 space-y-2">
              <h3 id="calc-title" className="text-base font-extrabold leading-tight tracking-tight text-stone-900">
                Rekenmodule
              </h3>
              <p className="text-[13px] text-stone-700">
                Kijk wat D-escaperoom jou kan opleveren.
              </p>

              <ClientOnly
                fallback={
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
                    <div className="text-lg font-extrabold text-stone-900">{formatEUR(weekly)}</div>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                    <div className="text-[11px] text-stone-600">Per maand</div>
                    <div className="text-lg font-extrabold text-stone-900">{formatEUR(monthly)}</div>
                  </div>
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-3 gap-2">
                  <LabeledStepper
                    label="Sessies"
                    value={sessionsPerWeek}
                    onChange={(v) => setSessionsPerWeek(clamp(v, minSessions, maxSessions))}
                    min={minSessions}
                    max={maxSessions}
                  />
                  <LabeledStepper
                    label="Gem. pers."
                    value={avgPlayers}
                    onChange={(v) => setAvgPlayers(clamp(v, minPlayers, maxPlayers))}
                    min={minPlayers}
                    max={maxPlayers}
                  />
                  <ReadOnlyMoney label="€ p.p." value={pricePerPlayer} />
                </div>
              </ClientOnly>

              <p className="text-[11px] text-stone-600">
                Indicatief, excl. toeslagen/kortingen. Werkelijke omzet kan verschillen.
              </p>

              {/* CTA */}
              <div className="pt-1">
                <Link
                  href="#contact"
                  className="inline-flex h-10 items-center justify-center rounded-2xl bg-black px-4 text-sm font-semibold text-white shadow hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-stone-400 focus:ring-offset-2 focus:ring-offset-white transition"
                  aria-label="Neem contact op"
                >
                  neem contact op
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
                      <div className="truncate text-[12px] font-medium text-stone-900">{p.name}</div>
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
   Subcomponents
========================================= */
function LabeledStepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = Number.POSITIVE_INFINITY,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const id = React.useId();

  const inc = React.useCallback(
    () => onChange(clamp(value + step, min, max)),
    [value, step, min, max, onChange]
  );
  const dec = React.useCallback(
    () => onChange(clamp(value - step, min, max)),
    [value, step, min, max, onChange]
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowUp") { e.preventDefault(); inc(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); dec(); }
    else if (e.key === "Home" && Number.isFinite(min)) { e.preventDefault(); onChange(min); }
    else if (e.key === "End" && Number.isFinite(max)) { e.preventDefault(); onChange(max); }
  }

  return (
    <label className="block text-xs font-medium text-stone-800" htmlFor={id}>
      {label}
      {/* Wrapper die het inputveld + absolute pijlen bevat */}
      <div
        role="spinbutton"
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        className="relative mt-1"
      >
        {/* Waarde (readOnly input) */}
        <input
          id={id}
          readOnly
          value={String(value)}
          inputMode="numeric"
          className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 pr-10 text-sm outline-none transition focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
          aria-hidden
        />

        {/* Pijlen rechts binnen het veld (1 stap per klik) */}
        <div className="absolute inset-y-0 right-0 w-10 border-l border-stone-300 text-stone-700 dark:text-stone-200">
          <button
            type="button"
            onClick={inc}
            className="flex h-1/2 w-full items-center justify-center rounded-tr-lg hover:bg-stone-50 active:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
            aria-label={`${label} verhogen`}
            title="Verhogen"
          >
            <svg className="block h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="sr-only">Omhoog</span>
          </button>
          <button
            type="button"
            onClick={dec}
            className="flex h-1/2 w-full items-center justify-center rounded-br-lg hover:bg-stone-50 active:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
            aria-label={`${label} verlagen`}
            title="Verlagen"
          >
            <svg className="block h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path d="M18 9l-6 6-6-6" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="sr-only">Omlaag</span>
          </button>
        </div>
      </div>
    </label>
  );
}

function ReadOnlyMoney({ label, value }: { label: string; value: number }) {
  const id = React.useId();
  return (
    <div className="block text-xs font-medium text-stone-800" aria-labelledby={id}>
      <span id={id}>{label}</span>
      <div
        className="mt-1 flex h-10 items-center justify-between rounded-lg border border-stone-300 bg-stone-50 px-3 text-sm text-stone-900"
        aria-readonly="true"
        title="Prijs per persoon (vast)"
      >
        <span className="font-semibold">{formatEUR(value)}</span>
        <span className="text-[11px] text-stone-600">p.p.</span>
      </div>
    </div>
  );
}
