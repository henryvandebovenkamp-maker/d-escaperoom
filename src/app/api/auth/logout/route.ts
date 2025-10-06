// PATH: src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY = "de_session";

// ✅ Gebruik de request-URL als base → geen "Invalid URL"
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url));

  // Cookies wissen
  res.cookies.delete(COOKIE_PRIMARY);
  res.cookies.delete(COOKIE_LEGACY);

  return res;
}

// Optioneel: support voor <Link href="/api/auth/logout">
// zodat je geen fetch(POST) hoeft te doen.
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.delete(COOKIE_PRIMARY);
  res.cookies.delete(COOKIE_LEGACY);
  return res;
}
