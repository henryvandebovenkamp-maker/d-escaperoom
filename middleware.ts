// PATH: middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/* ========= Auth types & constants ========= */
type Role = "ADMIN" | "PARTNER";

const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY = "de_session";
const SECRET_STRING = process.env.SESSION_SECRET || "dev-secret-change-me";
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
    const partnerId = payload.partnerId ? String(payload.partnerId) : null;

    if (!sub || (role !== "ADMIN" && role !== "PARTNER")) {
      return null;
    }

    return {
      sub,
      role: role as Role,
      partnerId,
    };
  } catch {
    return null;
  }
}

function isAny(pathname: string, patterns: RegExp[]) {
  return patterns.some((re) => re.test(pathname));
}

/* ========= Route sets ========= */
const PUBLIC_PATHS: RegExp[] = [
  /^\/$/,
  /^\/checkout\/[^/]+$/,
  /^\/checkout\/[^/]+\/return$/,

  /^\/_next\//,
  /^\/images\//,
  /^\/public\//,
  /^\/favicon\.ico$/,

  /^\/api\/public\//,
  /^\/api\/auth\/login\/request$/,
  /^\/api\/auth\/login\/verify$/,
  /^\/api\/auth\/redirect$/,
  /^\/api\/booking\/price$/,
  /^\/api\/booking\/create$/,
  /^\/api\/booking\/update-dog$/,
  /^\/api\/payments\/mollie\/create$/,
  /^\/api\/payments\/mollie\/webhook$/,

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

  // Verwijder oude route-groepen zoals /(protected)/
  const cleanedPath = pathname.replace(/\/\(([^)]+)\)(?=\/|$)/g, "");

  if (cleanedPath !== pathname) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = cleanedPath;
    return NextResponse.redirect(redirectUrl);
  }

  // CORS preflight & statics
  if (
    method === "OPTIONS" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/public/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Public whitelist
  if (isAny(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  // API-protectie
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

  // Partner-sectie
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

  // Admin-sectie
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};