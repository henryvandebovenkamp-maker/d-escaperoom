// PATH: src/lib/URL.ts
/**
 * URL helpers met basePath support (standaard "/nl").
 * - getBaseUrl(): origin zonder trailing slash (bv. https://www.d-escaperoom.com)
 * - getBasePath(): basePath met leading slash, "" of "/nl"
 * - withBase(p):   voegt basePath toe → "/nl/..." (relatief voor <Link/> of fetch)
 * - abs(p):        absolute URL → "https://.../nl/..."
 * - api(p):        "/nl/api/..."
 * - absApi(p):     "https://.../nl/api/..."
 *
 * Zet in .env:
 *   NEXT_PUBLIC_BASE_PATH=/nl
 *   NEXT_PUBLIC_APP_URL=https://www.d-escaperoom.com   (aanrader voor e-mails)
 *   # of NEXT_PUBLIC_BASE_URL als je die al gebruikt
 */

const DEFAULT_LOCAL = "http://localhost:3000";

function pickOrigin(): string {
  const app = process.env.NEXT_PUBLIC_APP_URL;
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  const vercel = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined;

  const chosen = app || base || vercel || DEFAULT_LOCAL;
  return stripTrailingSlash(chosen);
}

function pickBasePath(): string {
  // Leest uit env; valt terug op "/nl"
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "/nl";
  if (!raw || raw === "/") return "";
  return `/${raw.replace(/^\/+|\/+$/g, "")}`;
}

function stripTrailingSlash(s: string) {
  return s.replace(/\/+$/, "");
}
function stripBoth(s: string) {
  return s.replace(/^\/+|\/+$/g, "");
}
function ensureLeadingSlash(s: string) {
  return s.startsWith("/") ? s : `/${s}`;
}
function joinUrl(...parts: Array<string | undefined>) {
  const cleaned = parts
    .filter(Boolean)
    .map((p) => stripBoth(String(p)));
  if (cleaned.length === 0) return "";
  return cleaned[0].includes("://")
    ? `${stripTrailingSlash(cleaned[0])}${
        cleaned.length > 1 ? `/${cleaned.slice(1).join("/")}` : ""
      }`
    : `/${cleaned.join("/")}`;
}

/** Bestaande API — blijft werken. */
export function getBaseUrl(): string {
  return pickOrigin();
}

/** Geeft "" of bv. "/nl". */
export function getBasePath(): string {
  return pickBasePath();
}

/** Relative pad mét basePath, bv. "/nl/checkout/123". */
export function withBase(path = "/"): string {
  const base = getBasePath(); // "" of "/nl"
  const rel = path === "/" ? "" : ensureLeadingSlash(path);
  return base ? joinUrl(base, rel) : rel || "/";
}

/** Absolute URL mét basePath, bv. "https://.../nl/checkout/123". */
export function abs(path = "/"): string {
  const origin = getBaseUrl();
  const base = getBasePath();
  const rel = path === "/" ? "" : ensureLeadingSlash(path);
  return joinUrl(origin, base || undefined, rel || undefined);
}

/** Relative API-pad mét basePath, bv. "/nl/api/payments". */
export function api(path = "/"): string {
  const p = path === "/" ? "" : ensureLeadingSlash(path);
  return withBase(`/api${p}`);
}

/** Absolute API-URL mét basePath, bv. "https://.../nl/api/payments". */
export function absApi(path = "/"): string {
  const p = path === "/" ? "" : ensureLeadingSlash(path);
  return abs(`/api${p}`);
}
