// PATH: middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/* ========= Types & constants ========= */
type Role = "ADMIN" | "PARTNER";

const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY = "de_session";
const SECRET_STRING = process.env.SESSION_SECRET || "dev-secret-change-me";
const SECRET = new TextEncoder().encode(SECRET_STRING);

/** i18n */
const LOCALES = ["nl", "en", "es"] as const;
type Locale = (typeof LOCALES)[number];

const PUBLIC_FILE = /\.(.*)$/;

/* ========= Helpers ========= */
async function readSession(
  req: NextRequest
): Promise<null | { sub: string; role: Role; partnerId?: string | null }> {
  const token =
    req.cookies.get(COOKIE_PRIMARY)?.value ??
    req.cookies.get(COOKIE_LEGACY)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const sub = String(payload.sub || "");
    const role = String(payload.role || "");
    const partnerId = (payload.partnerId ? String(payload.partnerId) : null) ?? null;
    if (!sub || (role !== "ADMIN" && role !== "PARTNER")) return null;
    return { sub, role: role as Role, partnerId };
  } catch {
    return null;
  }
}

function isAny(pathname: string, patterns: RegExp[]) {
  return patterns.some((re) => re.test(pathname));
}

function firstSegment(pathname: string) {
  return pathname.split("/")[1] || "";
}

function hasLocalePrefix(pathname: string) {
  const first = firstSegment(pathname);
  return LOCALES.includes(first as Locale);
}

/** Alleen echte 2-letter locale kandidaten (letters), bv "fr" */
function isTwoLetterLocaleCandidate(pathname: string) {
  const first = firstSegment(pathname);
  return /^[a-zA-Z]{2}$/.test(first);
}

function stripLocale(pathname: string) {
  if (!hasLocalePrefix(pathname)) return pathname;
  const parts = pathname.split("/");
  parts.splice(1, 1); // remove locale
  const stripped = parts.join("/") || "/";
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

/* ========= Route sets ========= */
const PUBLIC_PATHS: RegExp[] = [
  /^\/$/, // home

  // eigen not-found route (moet publiek blijven)
  /^\/not-found-route$/,

  // expliciet public API's
  /^\/api\/public\//,
  /^\/api\/auth\/login\/request$/,
  /^\/api\/auth\/login\/verify$/,
  /^\/api\/auth\/redirect$/,
  /^\/api\/booking\/price$/,
  /^\/api\/booking\/create$/,
  /^\/api\/payments\/mollie\/create$/,
  /^\/api\/payments\/mollie\/webhook$/,

  // login pagina's
  /^\/partner\/login$/,
  /^\/admin\/login$/,
];

const PROTECTED_API: RegExp[] = [
  /^\/api\/partner\//,
  /^\/api\/admin\//,
  /^\/api\/slots\//,
];

/* ========= Middleware ========= */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  /* --- 0) Skip statics, files, preflight --- */
  if (
    method === "OPTIONS" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  /* --- 1) Fix oude route-groepen zoals /(protected)/ --- */
  const cleanedPath = pathname.replace(/\/\(([^)]+)\)(?=\/|$)/g, "");
  if (cleanedPath !== pathname) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = cleanedPath;
    return NextResponse.redirect(redirectUrl);
  }

  /* --- 2) i18n: blokkeer onbekende 2-letter prefixes zoals /fr, /de etc. --- */
  if (isTwoLetterLocaleCandidate(pathname) && !hasLocalePrefix(pathname)) {
    // ✅ Betrouwbaar: rewrite naar een echte pagina die jij beheert
    const url = req.nextUrl.clone();
    url.pathname = "/not-found-route";
    return NextResponse.rewrite(url);
  }

  const pathForAuth = stripLocale(pathname);

  /* --- 3) Public whitelist --- */
  if (isAny(pathForAuth, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  /* --- 4) API-protectie (zonder redirect) --- */
  if (pathForAuth.startsWith("/api/")) {
    if (isAny(pathForAuth, PROTECTED_API)) {
      const sess = await readSession(req);
      if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      if (pathForAuth.startsWith("/api/admin/") && sess.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (pathForAuth.startsWith("/api/partner/") && sess.role !== "PARTNER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  /* --- 5) Partner-sectie --- */
  if (pathForAuth === "/partner" || pathForAuth.startsWith("/partner/")) {
    const sess = await readSession(req);
    if (!sess || sess.role !== "PARTNER") {
      if (method === "GET" || method === "HEAD") {
        const maybeLocale = hasLocalePrefix(pathname) ? `/${firstSegment(pathname)}` : "";
        return NextResponse.redirect(new URL(`${maybeLocale}/partner/login`, req.url));
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  /* --- 6) Admin-sectie --- */
  if (pathForAuth === "/admin" || pathForAuth.startsWith("/admin/")) {
    const sess = await readSession(req);
    if (!sess || sess.role !== "ADMIN") {
      if (method === "GET" || method === "HEAD") {
        const maybeLocale = hasLocalePrefix(pathname) ? `/${firstSegment(pathname)}` : "";
        return NextResponse.redirect(new URL(`${maybeLocale}/admin/login`, req.url));
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

/* ========= Scope ========= */
export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
