// PATH: src/app/api/auth/redirect/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

type Role = "ADMIN" | "PARTNER";

const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY  = "de_session";
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me");

async function readSessionFromCookie(): Promise<null | { sub: string; role: Role }> {
  const c = cookies();
  const token = (await c).get(COOKIE_PRIMARY)?.value ?? (await c).get(COOKIE_LEGACY)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const sub = String(payload.sub || "");
    const role = String(payload.role || "");
    if (!sub || (role !== "ADMIN" && role !== "PARTNER")) return null;
    return { sub, role: role as Role };
  } catch {
    return null;
  }
}

export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const nextParam = url.searchParams.get("next"); // optioneel override

  const session = await readSessionFromCookie();

  // Geen sessie → kies login obv gewenste pad (of default admin login)
  if (!session) {
    // als next=/partner* → partner/login, anders admin/login
    if (nextParam?.startsWith("/partner")) {
      return NextResponse.redirect(new URL("/partner/login", req.url));
    }
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  // Met sessie → kies veilige bestemming
  const role = session.role;
  // Als next is gezet en toegestaan voor deze rol, gebruik die
  if (nextParam) {
    if (nextParam.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    if (nextParam.startsWith("/partner") && role !== "PARTNER") {
      return NextResponse.redirect(new URL("/partner/login", req.url));
    }
    return NextResponse.redirect(new URL(nextParam, req.url));
  }

  // Geen next → stuur naar standaard dashboard per rol
  const target = role === "ADMIN" ? "/admin/dashboard" : "/partner/dashboard";
  return NextResponse.redirect(new URL(target, req.url));
}
