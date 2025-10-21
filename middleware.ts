// PATH: middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/* ========= Auth types & constants ========= */
type Role = "ADMIN" | "PARTNER";

const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY  = "de_session";
const SECRET_STRING  = process.env.SESSION_SECRET || "dev-secret-change-me";
const SECRET = new TextEncoder().encode(SECRET_STRING);

/* ========= i18n constants ========= */
const SUPPORTED_LOCALES = ["nl", "en", "de", "es"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = "nl";
const LOCALE_COOKIE = "NEXT_LOCALE"; // compatibel met next-intl
const I18N_ENFORCE = (process.env.I18N_ENFORCE ?? "true") !== "false";

/* ========= Helpers: auth ========= */
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

/* ========= Helpers: i18n ========= */
function isSupportedLocale(l?: string | null): l is Locale {
  return !!l && (SUPPORTED_LOCALES as readonly string[]).includes(l);
}

function extractLocale(pathname: string): { locale: Locale | null; rest: string } {
  const m = pathname.match(/^\/([a-z]{2})(?=\/|$)/i);
  if (!m) return { locale: null, rest: pathname };
  const loc = m[1].toLowerCase();
  if (isSupportedLocale(loc)) {
    const rest = pathname.slice(1 + loc.length) || "/";
    return { locale: loc, rest };
  }
  return { locale: null, rest: pathname };
}

function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  // basic negotiatie: pak de eerste taal die we ondersteunen
  const parts = header.split(",").map(s => s.trim().split(";")[0].toLowerCase());
  for (const p of parts) {
    const base = p.split("-")[0];
    if (isSupportedLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

function isExcludedFromI18n(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/partner") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/public/") ||
    pathname === "/favicon.ico"
  );
}

const ONE_YEAR = 60 * 60 * 24 * 365;
function setLocaleCookie(res: NextResponse, locale: Locale) {
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    httpOnly: false,
    sameSite: "lax"
  });
  return res;
}

/* ========= Route sets ========= */
/** Altijd publiek: geen auth */
const PUBLIC_PATHS: RegExp[] = [
  /^\/$/,                         // home (wordt door i18n afgevangen)
  /^\/_next\//,
  /^\/images\//,
  /^\/public\//,
  /^\/favicon\.ico$/,

  // expliciet public API's (booking widget + auth + mollie)
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
  /^\/admin\/login$/
];

/** Beschermde API's (cookie vereist) */
const PROTECTED_API: RegExp[] = [
  /^\/api\/partner\//,
  /^\/api\/admin\//,
  /^\/api\/slots\//
];

/* ========= Middleware ========= */
export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const method = req.method;

  /* --- 0) Verwijder oude route-groepen zoals /(protected)/ etc. --- */
  const cleanedPath = pathname.replace(/\/\(([^)]+)\)(?=\/|$)/g, "");
  if (cleanedPath !== pathname) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = cleanedPath;
    return NextResponse.redirect(redirectUrl);
  }

  /* --- 1) CORS preflight & statics (no-op) --- */
  if (
    method === "OPTIONS" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/public/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  /* --- 2) i18n URL-handling (alleen voor publieke site, NIET voor /api|/partner|/admin) --- */
  if (!isExcludedFromI18n(pathname)) {
    const langParam = searchParams.get("lang");
    const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value ?? null;
    const { locale: pathLocale } = extractLocale(pathname);

    // A) expliciet wisselen via ?lang=
    if (isSupportedLocale(langParam)) {
      let nextPath = pathname;
      const { locale: currLocale, rest } = extractLocale(pathname);
      if (currLocale) nextPath = `/${langParam}${rest === "/" ? "" : rest}`;
      else if (I18N_ENFORCE || pathname === "/") nextPath = `/${langParam}${pathname === "/" ? "" : pathname}`;

      const url = req.nextUrl.clone();
      url.pathname = nextPath;
      url.searchParams.delete("lang");
      const res = NextResponse.redirect(url);
      return setLocaleCookie(res, langParam);
    }

    // B) enforce locale prefix (compat-modus laat niet-geprefixt vaak nog door)
    if (!pathLocale) {
      if (I18N_ENFORCE || pathname === "/") {
        const best: Locale =
          (isSupportedLocale(cookieLocale) ? cookieLocale : null) ??
          parseAcceptLanguage(req.headers.get("accept-language"));

        const url = req.nextUrl.clone();
        url.pathname = `/${best}${pathname === "/" ? "" : pathname}`;
        const res = NextResponse.redirect(url);
        return setLocaleCookie(res, best);
      }
      // compat: laat niet-geprefixt door zonder redirect
    } else {
      // Zorg dat de cookie up-to-date is
      if (cookieLocale !== pathLocale) {
        const res = NextResponse.next();
        return setLocaleCookie(res, pathLocale);
      }
    }
  }

  /* --- 3) Public whitelist --- */
  if (isAny(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  /* --- 4) API-protectie (zonder redirect) --- */
  if (pathname.startsWith("/api/")) {
    if (isAny(pathname, PROTECTED_API)) {
      const sess = await readSession(req);
      if (!sess) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (pathname.startsWith("/api/admin/") && sess.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (pathname.startsWith("/api/partner/") && sess.role !== "PARTNER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  /* --- 5) Partner-sectie --- */
  if (pathname === "/partner" || pathname.startsWith("/partner/")) {
    const sess = await readSession(req);
    if (!sess || sess.role !== "PARTNER") {
      if (method === "GET" || method === "HEAD") {
        return NextResponse.redirect(new URL("/partner/login", req.url));
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  /* --- 6) Admin-sectie --- */
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const sess = await readSession(req);
    if (!sess || sess.role !== "ADMIN") {
      if (method === "GET" || method === "HEAD") {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  /* --- 7) Alles overig is publiek --- */
  return NextResponse.next();
}

/* ========= Scope ========= */
export const config = {
  // match alle routes behalve statische assets, inclusief route-groepen zoals (protected)
  matcher: ["/((?!_next|.*\\..*).*)"],
};
