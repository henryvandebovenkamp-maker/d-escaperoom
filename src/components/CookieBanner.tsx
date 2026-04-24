// PATH: src/components/CookieBanner.tsx
"use client";

import * as React from "react";
import Link from "next/link";

type Consent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

const COOKIE_NAME = "cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

function getConsent(): Consent | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
  );

  if (!match) return null;

  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function saveConsent(consent: Consent) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(consent)
  )}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;

  window.dispatchEvent(new Event("cookie-consent-changed"));
}

export default function CookieBanner() {
  const [visible, setVisible] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [analytics, setAnalytics] = React.useState(false);
  const [marketing, setMarketing] = React.useState(false);

  React.useEffect(() => {
    const existing = getConsent();
    setVisible(!existing);
  }, []);

  function acceptAll() {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
    });
    setVisible(false);
  }

  function acceptNecessary() {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
    });
    setVisible(false);
  }

  function saveSettings() {
    saveConsent({
      necessary: true,
      analytics,
      marketing,
    });
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 sm:px-6">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-stone-950/95 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/90">
              Cookies
            </p>

            <h2 className="mt-2 text-xl font-black tracking-tight text-rose-300">
              Mogen we cookies gebruiken?
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-300">
              We gebruiken noodzakelijke cookies om de website goed te laten
              werken. Met jouw toestemming gebruiken we ook analytische cookies
              om D-EscapeRoom te verbeteren.
            </p>

            <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-400">
              <Link href="/privacy" className="hover:text-pink-300">
                Privacybeleid
              </Link>
              <Link href="/cookies" className="hover:text-pink-300">
                Cookiebeleid
              </Link>
            </div>

            {showSettings && (
              <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <label className="flex items-start gap-3 text-sm text-stone-200">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-stone-900"
                  />
                  <span>
                    <strong className="text-white">Noodzakelijke cookies</strong>
                    <br />
                    Nodig voor basisfuncties zoals veiligheid en voorkeuren.
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm text-stone-200">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-stone-900 text-pink-600 focus:ring-pink-300"
                  />
                  <span>
                    <strong className="text-white">Analytische cookies</strong>
                    <br />
                    Helpen ons begrijpen hoe bezoekers de website gebruiken.
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm text-stone-200">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-stone-900 text-pink-600 focus:ring-pink-300"
                  />
                  <span>
                    <strong className="text-white">Marketing cookies</strong>
                    <br />
                    Alleen nodig wanneer we advertenties of remarketing inzetten.
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={acceptAll}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
            >
              Accepteer alles
            </button>

            {showSettings ? (
              <button
                type="button"
                onClick={saveSettings}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/20"
              >
                Voorkeuren opslaan
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/20"
              >
                Instellen
              </button>
            )}

            <button
              type="button"
              onClick={acceptNecessary}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-stone-300 transition hover:text-white focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              Alleen noodzakelijk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}