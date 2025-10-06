// PATH: src/lib/api-auth.ts
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

type Role = "ADMIN" | "PARTNER";
const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY  = "de_session";
const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

export async function readJwtFromRoute(): Promise<null | { sub: string; role: Role; }> {
  const c = cookies();
  const token = (await c).get(COOKIE_PRIMARY)?.value || (await c).get(COOKIE_LEGACY)?.value;
  if (!token) return null;
  try { return jwt.verify(token, SECRET) as { sub: string; role: Role }; }
  catch { return null; }
}

export async function requireAdmin() {
  const s = await readJwtFromRoute();
  if (!s) return { ok: false, status: 401 as const, error: "Unauthorized" };
  if (s.role !== "ADMIN") return { ok: false, status: 403 as const, error: "Forbidden" };
  return { ok: true as const, session: s };
}
