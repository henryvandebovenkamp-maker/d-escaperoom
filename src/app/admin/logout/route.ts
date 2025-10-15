// PATH: src/app/admin/logout/route.ts
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY  = "de_session";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url));

  const common = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
  };
  res.cookies.set(COOKIE_PRIMARY, "", common);
  res.cookies.set(COOKIE_LEGACY,  "", common);

  return res;
}
