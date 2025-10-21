// PATH: src/components/CookieConsent.tsx
"use client";

import * as React from "react";

/* =========================================
   Types & constants
========================================= */
type ConsentKey = "necessary" | "functional" | "analytics" | "marketing";
type ConsentState = Record<ConsentKey, boolean>;

const CONSENT_COOKIE = "cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // 180 dagen
const POLICY_VERSION = "2025-09"; // update bij beleidswijziging

const DEFAULT_CONSENT: ConsentState = {
  necessary: true, // altijd aan
  functional: false,
  analytics: false,
  marketing: false,
};

/* =========================================
   Cookie helpers
========================================= */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, maxAge = CONSENT_MAX_AGE) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

function loadConsent(): ConsentState | null {
  try {
    const raw = readCookie(CONSENT_COOKIE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONSENT,
      functional: !!parsed.functional,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
    };
  } catch {
    return null;
  }
}

function saveConsent(state: ConsentState) {
  const cleaned: ConsentState = { ...state, necessary: true };
  writeCookie(CONSENT_COOKIE, JSON.stringify(cleaned));
  try {
    localStorage.setItem(CONSENT_COOKIE, JSON.stringify(cleaned));
  } catch {}
  window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: cleaned }));
}

/* =========================================
   Backend logging (bewijsbaarheid AVG)
========================================= */
async function logConsent(prefs: ConsentState) {
  try {
    await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: POLICY_VERSION,
        locale: "nl",
        preferences: prefs,
      }),
      keepalive: true, // ook bij navigatie
    });
  } catch {
    // bewust stil: logging-failure mag UI niet blokkeren
  }
}

/* =========================================
   Component
========================================= */
export default function CookieConsent() {
  const [visible, setVisible] = React.useState(false);
  const [openPrefs, setOpenPrefs] = React.useState(false);
  const [consent, setConsent] = React.useState<ConsentState>(DEFAULT_CONSENT);

  // Public API (voor "Cookievoorkeuren" in footer)
  React.useEffect(() => {
    (window as any).cookieConsent = {
      openPreferences: () => {
        setOpenPrefs(true);
        setVisible(false);
        // focus titel zodra modal opent
        setTimeout(() => document.getElementById("cc-modal-title")?.focus(), 0);
      },
      get: () => loadConsent() ?? DEFAULT_CONSENT,
    };
  }, []);

  // Init: toon banner als er nog geen keuze is
  React.useEffect(() => {
    const stored = loadConsent();
    if (stored) {
      setConsent(stored);
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, []);

  /* ========== Actions ========== */
  async function acceptAll() {
    const next: ConsentState = { necessary: true, functional: true, analytics: true, marketing: true };
    setConsent(next);
    saveConsent(next);
    await logConsent(next);
    setVisible(false);
    setOpenPrefs(false);
  }

  async function rejectAll() {
    const next: ConsentState = { necessary: true, functional: false, analytics: false, marketing: false };
    setConsent(next);
    saveConsent(next);
    await logConsent(next);
    setVisible(false);
    setOpenPrefs(false);
  }

  async function savePreferences() {
    const cleaned = { ...consent, necessary: true };
    setConsent(cleaned);
    saveConsent(cleaned);
    await logConsent(cleaned);
    setOpenPrefs(false);
  }

  if (!visible && !openPrefs) return null;

  return (
    <>
      {/* ===== Banner (compact, zwart, 🍪, roze CTA) ===== */}
      {visible && (
        <div role="dialog" aria-labelledby="cc-title" aria-describedby="cc-desc" className="fixed inset-x-0 bottom-0 z-50">
          <div className="mx-auto max-w-5xl m-3 rounded-xl border border-stone-800 bg-stone-900 text-stone-50 shadow-lg">
            <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="sm:max-w-3xl">
                <p id="cc-title" className="text-[13px] font-semibold">
                  🍪 We zijn een escaperoom — maar onze cookies verstoppen we niet
                </p>
                <p id="cc-desc" className="mt-0.5 text-[11px] leading-4 text-stone-200">
                  We gebruiken noodzakelijke cookies (login, sessies, Mollie). Met jouw toestemming ook
                  functioneel, analytisch en marketing voor een betere ervaring.{" "}
                  <a className="underline underline-offset-2 hover:opacity-80" href="/cookies">Cookiebeleid</a>{" "}
                  ·{" "}
                  <a className="underline underline-offset-2 hover:opacity-80" href="/privacy">Privacy</a>
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:pl-3">
                <button
                  type="button"
                  onClick={() => {
                    setOpenPrefs(true);
                    setVisible(false);
                    setTimeout(() => document.getElementById("cc-modal-title")?.focus(), 0);
                  }}
                  className="rounded-lg border border-stone-500 px-3 py-1.5 text-[11px] font-medium hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500"
                >
                  Voorkeuren
                </button>
                <button
                  type="button"
                  onClick={rejectAll}
                  className="rounded-lg bg-stone-700 px-3 py-1.5 text-[11px] font-semibold hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-700"
                >
                  Alleen noodzakelijk
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="rounded-lg bg-pink-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  Alles accepteren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Voorkeuren-modal (compact, toegankelijk) ===== */}
      {openPrefs && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-3"
        >
          <div className="w-full max-w-lg rounded-xl bg-stone-50 shadow-2xl border border-stone-200">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3
                  id="cc-modal-title"
                  tabIndex={-1}
                  className="text-sm font-extrabold text-stone-900 focus:outline-none"
                >
                  Cookievoorkeuren
                </h3>
                <button
                  type="button"
                  aria-label="Sluiten"
                  onClick={() => setOpenPrefs(false)}
                  className="rounded-lg border border-stone-300 px-2 py-1 text-[11px] hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300"
                >
                  Sluiten
                </button>
              </div>

              <p className="mt-1 text-[11px] text-stone-700">
                <strong>Noodzakelijke</strong> cookies staan altijd aan voor veilige basisfunctionaliteit
                (sessies, login, Mollie).
              </p>

              <div className="mt-3 space-y-2">
                <PrefRow title="Noodzakelijk" desc="Altijd aan: sessies, beveiliging, Mollie." locked checked />
                <PrefRow
                  title="Functioneel"
                  desc="Gebruiksgemak (bijv. voorkeurspartner/hondenschool)."
                  checked={consent.functional}
                  onChange={(v) => setConsent((s) => ({ ...s, functional: v }))}
                />
                <PrefRow
                  title="Analytisch"
                  desc="Anonieme statistieken om de site te verbeteren."
                  checked={consent.analytics}
                  onChange={(v) => setConsent((s) => ({ ...s, analytics: v }))}
                />
                <PrefRow
                  title="Marketing"
                  desc="Gerichte acties en retargeting (alleen met toestemming)."
                  checked={consent.marketing}
                  onChange={(v) => setConsent((s) => ({ ...s, marketing: v }))}
                />
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={rejectAll}
                  className="rounded-lg bg-stone-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900"
                >
                  Alleen noodzakelijk
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="rounded-lg bg-pink-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  Alles accepteren
                </button>
                <button
                  type="button"
                  onClick={savePreferences}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-[11px] font-semibold hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300"
                >
                  Voorkeuren opslaan
                </button>
              </div>

              <p className="mt-3 text-[10px] text-stone-500">
                Zie ook ons{" "}
                <a className="underline underline-offset-2 hover:opacity-80" href="/cookies">cookiebeleid</a> en{" "}
                <a className="underline underline-offset-2 hover:opacity-80" href="/privacy">privacyverklaring</a>.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================
   Subcomponents
========================================= */
function PrefRow({
  title,
  desc,
  checked = false,
  locked = false,
  onChange,
}: {
  title: string;
  desc: string;
  checked?: boolean;
  locked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const id = React.useId();
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-100 px-3 py-2">
      <div>
        <label htmlFor={id} className="block text-[12px] font-semibold text-stone-900">
          {title}
        </label>
        <p className="mt-0.5 text-[11px] text-stone-700">{desc}</p>
      </div>
      {locked ? (
        <span className="rounded-full border border-stone-300 px-2.5 py-0.5 text-[10px] font-medium text-stone-700 bg-white">
          Aan
        </span>
      ) : (
        <input
          id={id}
          type="checkbox"
          className="h-4 w-4 rounded border-stone-300 text-pink-600 focus:ring-pink-500"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
        />
      )}
    </div>
  );
}
