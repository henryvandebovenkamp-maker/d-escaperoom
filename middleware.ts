// PATH: middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/* ========= Types & constants ========= */
type Role = "ADMIN" | "PARTNER";

const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY  = "de_session";
const SECRET_STRING  = process.env.SESSION_SECRET || "dev-secret-change-me";
const SECRET = new TextEncoder().encode(SECRET_STRING);

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
/** Publieke API-endpoints (geen auth nodig) */
const PUBLIC_API_PATHS: RegExp[] = [
  /^\/api\/public\//,
  /^\/api\/auth\/login\/request$/,
  /^\/api\/auth\/login\/verify$/,
  /^\/api\/auth\/redirect$/,
  /^\/api\/booking\/price$/,
  /^\/api\/booking\/create$/,
  /^\/api\/payments\/mollie\/create$/,
  /^\/api\/payments\/mollie\/webhook$/,
];

/** Beschermde API's (cookie vereist) */
const PROTECTED_API: RegExp[] = [
  /^\/api\/partner\//,   // partner-only API
  /^\/api\/admin\//,     // admin-only API
  /^\/api\/slots\//,     // intern slotsbeheer
];

/* ========= Middleware ========= */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const method = req.method;

  /* --- 0) CORS preflight voor API --- */
  if (pathname.startsWith("/api/") && method === "OPTIONS") {
    return NextResponse.next();
  }

  /* --- 1) API-beleid --- */
  if (pathname.startsWith("/api/")) {
    // Public API's direct doorlaten
    if (isAny(pathname, PUBLIC_API_PATHS)) {
      return NextResponse.next();
    }

    // Protectie voor partner/admin/slots API's
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

    // Alle overige /api/* mogen door
    return NextResponse.next();
  }

  /* --- 2) Partner-sectie --- */
  if (pathname === "/partner" || pathname.startsWith("/partner/")) {
    // Login & Logout altijd vrij
    if (pathname === "/partner/login" || pathname === "/partner/logout") {
      return NextResponse.next();
    }

    const sess = await readSession(req);
    if (!sess || sess.role !== "PARTNER") {
      if (method === "GET" || method === "HEAD") {
        const url = req.nextUrl.clone();
        url.pathname = "/partner/login";
        url.search = "";
        url.searchParams.set("next", pathname + (search || ""));
        return NextResponse.redirect(url);
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  /* --- 3) Admin-sectie --- */
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Login & Logout altijd vrij
    if (pathname === "/admin/login" || pathname === "/admin/logout") {
      return NextResponse.next();
    }

    const sess = await readSession(req);
    if (!sess || sess.role !== "ADMIN") {
      if (method === "GET" || method === "HEAD") {
        const url = req.nextUrl.clone();
        url.pathname = "/admin/login";
        url.search = "";
        url.searchParams.set("next", pathname + (search || ""));
        return NextResponse.redirect(url);
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Overige routes (o.a. /provincie/*) zijn publiek en worden niet geraakt door de matcher.
  return NextResponse.next();
}

/* ========= Scope ========= */
export const config = {
  // Middleware draait alléén op partner, admin en API routes → geen effect op /provincie/*
  matcher: ["/partner/:path*", "/admin/:path*", "/api/:path*"],
};
