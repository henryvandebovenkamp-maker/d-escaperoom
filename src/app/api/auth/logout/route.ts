// PATH: src/app/api/auth/logout/route.ts
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_PRIMARY = (process.env.SESSION_COOKIE_NAME || "session").trim();
const COOKIE_LEGACY  = "de_session";
// Optioneel: zet SESSION_COOKIE_DOMAIN als je subdomeinen gebruikt (bv. .d-escaperoom.com)
const COOKIE_DOMAIN  = process.env.SESSION_COOKIE_DOMAIN?.trim();

/** Probeer een cookie écht te killen (default, + expliciet path, + optioneel domain). */
function killCookie(res: NextResponse, name: string) {
  // Standaard delete
  res.cookies.delete(name);
  // Expliciet path (sommige browsers zijn hier strikter in)
  res.cookies.set(name, "", { path: "/", maxAge: 0 });
  // Expliciet domain indien geconfigureerd
  if (COOKIE_DOMAIN) {
    res.cookies.set(name, "", { path: "/", maxAge: 0, domain: COOKIE_DOMAIN });
  }
}

function redirectHome(req: NextRequest) {
  return NextResponse.redirect(new URL("/", req.url));
}

export async function POST(req: NextRequest) {
  const res = redirectHome(req);
  [COOKIE_PRIMARY, COOKIE_LEGACY].forEach((n) => killCookie(res, n));
  return res;
}

// Optioneel: support voor <Link href="/api/auth/logout">
export async function GET(req: NextRequest) {
  const res = redirectHome(req);
  [COOKIE_PRIMARY, COOKIE_LEGACY].forEach((n) => killCookie(res, n));
  return res;
}
