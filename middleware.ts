// PATH: middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/* ========= Types & constants ========= */
type Role = "ADMIN" | "PARTNER";

const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY  = "de_session";
const SECRET_STRING  = process.env.SESSION_SECRET || "dev-secret-change-me";
const SECRET = new TextEncoder().encode(SECRET_STRING);

// Hold toggle (env: SITE_HOLD=1 => site op slot, behalve allowlist)
const HOLD_ENABLED = process.env.SITE_HOLD === "1";

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

/* ========= Route sets ========= */
/** Altijd publiek: geen auth */
const PUBLIC_PATHS: RegExp[] = [
  /^\/$/,                         // home
  /^\/_next\//,                   // Next assets
  /^\/images\//,                  // public images
  /^\/public\//,                  // extra public
  /^\/favicon\.ico$/,

  // expliciet public API's (booking widget + auth + mollie)
  /^\/api\/public\//,
  /^\/api\/auth\/login\/request$/,
  /^\/api\/auth\/login\/verify$/,
  /^\/api\/auth\/redirect$/,      // ✅ toegevoegd
  /^\/api\/booking\/price$/,
  /^\/api\/booking\/create$/,
  /^\/api\/payments\/mollie\/create$/,
  /^\/api\/payments\/mollie\/webhook$/,

  // login pagina's
  /^\/partner\/login$/,
  /^\/admin\/login$/,
];

/** Beschermde API's (cookie vereist) */
const PROTECTED_API: RegExp[] = [
  /^\/api\/partner\//,            // partner-only API
  /^\/api\/admin\//,              // admin-only API
  /^\/api\/slots\//,              // intern slotsbeheer
];

/** Hold-allowlist: wat mag zichtbaar blijven bij SITE_HOLD=1 */
const HOLD_ALLOW: RegExp[] = [
  /^\/hold(?:\/)?$/,              // de hold-pagina zelf
  /^\/_next\//,                   // assets
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
  /^\/images\//,
  /^\/public\//,
];

/* ========= Middleware ========= */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  /* --- 0) Fix oude route-groepen zoals /(protected)/ --- */
  const cleanedPath = pathname.replace(/\/\(([^)]+)\)(?=\/|$)/g, "");
  if (cleanedPath !== pathname) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = cleanedPath;
    console.log(`[middleware] redirecting ${pathname} → ${cleanedPath}`);
    return NextResponse.redirect(redirectUrl);
  }

  /* --- 1) CORS preflight & statics --- */
  if (
    method === "OPTIONS" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/public/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  /* --- 1.5) HOLD MODE: pagina's dicht, behalve allowlist (API's blijven werken) --- */
  if (HOLD_ENABLED && !pathname.startsWith("/api/")) {
    if (!isAny(pathname, HOLD_ALLOW)) {
      const url = req.nextUrl.clone();
      url.pathname = "/hold";
      return NextResponse.rewrite(url);
    }
  }

  /* --- 2) Public whitelist --- */
  if (isAny(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  /* --- 3) API-protectie (zonder redirect) --- */
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

  /* --- 4) Partner-sectie --- */
  if (pathname === "/partner" || pathname.startsWith("/partner/")) {
    const sess = await readSession(req);
    if (!sess || sess.role !== "PARTNER") {
      if (method === "GET" || method === "HEAD") {
        console.log("[middleware] redirect → /partner/login");
        return NextResponse.redirect(new URL("/partner/login", req.url));
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  /* --- 5) Admin-sectie --- */
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const sess = await readSession(req);
    if (!sess || sess.role !== "ADMIN") {
      if (method === "GET" || method === "HEAD") {
        console.log("[middleware] redirect → /admin/login");
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  /* --- 6) Alles overig is publiek --- */
  return NextResponse.next();
}

/* ========= Scope ========= */
export const config = {
  // match alle routes behalve statische assets, inclusief route-groepen zoals (protected)
  matcher: ["/((?!_next|.*\\..*).*)"],
};
