// PATH: src/lib/consent.ts
export type ConsentKey = "necessary" | "functional" | "analytics" | "marketing";
export type ConsentState = Record<ConsentKey, boolean>;

export const CONSENT_COOKIE = "cookie_consent";

export function getConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  if (!m) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(m[1]));
    // safety: necessary altijd true afdwingen
    return { necessary: true, functional: !!parsed.functional, analytics: !!parsed.analytics, marketing: !!parsed.marketing };
  } catch {
    return null;
  }
}
