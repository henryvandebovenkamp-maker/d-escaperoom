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

/* ========= Middleware ========= */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  /* --- 0) OPTIONS & statics altijd doorlaten --- */
  if (
    method === "OPTIONS" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/public/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  /* --- 1) Fix route-groepen zoals /(protected)/ in URL --- */
  // (werkt alleen op paths die door matcher gaan; assets worden al geskipt)
  const cleanedPath = pathname.replace(/\/\(([^)]+)\)(?=\/|$)/g, "");
  if (cleanedPath !== pathname) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = cleanedPath;
    if (process.env.NODE_ENV !== "production") {
      console.log(`[middleware] redirect ${pathname} → ${cleanedPath}`);
    }
    return NextResponse.redirect(redirectUrl);
  }

  /* --- 2) Beschermde API's: alleen voor de gematchte prefixes --- */
  if (pathname.startsWith("/api/")) {
    // Let op: door de matcher komt middleware alleen binnen op:
    // /api/partner/*, /api/admin/*, (optioneel) /api/slots/*
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
    return NextResponse.next();
  }

  /* --- 3) Partner-sectie (pages) --- */
  if (pathname === "/partner" || pathname.startsWith("/partner/")) {
    const sess = await readSession(req);
    if (!sess || sess.role !== "PARTNER") {
      if (method === "GET" || method === "HEAD") {
        if (process.env.NODE_ENV !== "production") {
          console.log("[middleware] redirect → /partner/login");
        }
        return NextResponse.redirect(new URL("/partner/login", req.url));
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  /* --- 4) Admin-sectie (pages) --- */
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const sess = await readSession(req);
    if (!sess || sess.role !== "ADMIN") {
      if (method === "GET" || method === "HEAD") {
        if (process.env.NODE_ENV !== "production") {
          console.log("[middleware] redirect → /admin/login");
        }
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  /* --- 5) Alles overig (pages) is publiek --- */
  return NextResponse.next();
}

/* ========= Scope ========= */
export const config = {
  // 1) Alle PAGES (geen assets) → auth/redirects voor /partner/* en /admin/*
  // 2) Alleen de écht beschermde API-prefixen → voorkomt dat publieke API's
  //    (login, booking, mollie webhook/refresh, etc.) door middleware geraakt worden.
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/api/partner/:path*",
    "/api/admin/:path*",
    "/api/slots/:path*", // laat staan als slots-API intern is; anders weghalen
  ],
};
