// PATH: src/lib/auth.ts
import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";

/* ============================
   Types
============================ */
export type RoleName = "ADMIN" | "PARTNER";

export type SessionPayload = {
  sub: string;                // user id of partner slug
  role: RoleName;
  iat?: number;
  exp?: number;
};

export type SessionUser = {
  sub: string;
  id: string;
  email: string | null;
  name: string | null;
  role: RoleName;
  partnerId: string | null;
  partnerSlug: string | null;
};

/* ============================
   Config
============================ */
const COOKIE = process.env.SESSION_COOKIE_NAME || "session";
const SECRET = process.env.SESSION_SECRET || "";
if (!SECRET) throw new Error("SESSION_SECRET missing");

const MAX_AGE = 60 * 60 * 24 * 180; // 180 dagen

/* ============================
   Helpers
============================ */
function normEmail(e: string) {
  return e.trim().toLowerCase();
}

function adminList(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function isHttpsLike(): Promise<boolean> {
  // Vercel / proxies geven dit door
  const h = headers();
  const proto = (await h).get("x-forwarded-proto")?.toLowerCase();
  const host = (await h).get("host")?.toLowerCase() || "";
  if (proto === "https") return true;
  if (host.endsWith(".ngrok-free.app") || host.includes(".ngrok")) return true;
  return process.env.NODE_ENV === "production";
}

function signJwt(payload: Omit<SessionPayload, "iat" | "exp">, maxAgeSec = MAX_AGE) {
  return jwt.sign(payload, SECRET, { expiresIn: `${maxAgeSec}s` });
}
function verifyJwt(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

async function cookieOptions(maxAgeSec: number) {
  const secure = await isHttpsLike();
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure,
    path: "/" as const,
    maxAge: maxAgeSec,
  };
}

/* ============================
   Cookie API
============================ */
export async function setSessionCookieFromToken(token: string, maxAgeSec = MAX_AGE) {
  const jar = cookies();
  (await jar).set(COOKIE, token, await cookieOptions(maxAgeSec));
}

export async function clearSessionCookie() {
  const jar = cookies();
  (await jar).set(COOKIE, "", { ...(await cookieOptions(0)), maxAge: 0 });
}

/* ============================
   Public Session API
============================ */
export async function establishSession(payload: Omit<SessionPayload, "iat" | "exp">, maxAgeSec = MAX_AGE) {
  const token = signJwt(payload, maxAgeSec);
  await setSessionCookieFromToken(token, maxAgeSec);
  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = cookies();
  const token = (await jar).get(COOKIE)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

/* ============================
   Prisma helpers — Compat met user of appUser
============================ */
type AnyUser = {
  id: string;
  email: string | null;
  name?: string | null;
  role: RoleName;
  partnerId?: string | null;
  partner?: { slug: string | null } | null;
};

async function findUserByEmail(email: string): Promise<AnyUser | null> {
  const p: any = prisma as any;

  // Probeer appUser
  if (p.appUser) {
    const u = await p.appUser.findUnique({
      where: { email },
      select: {
        id: true, email: true, name: true, role: true,
        partnerId: true,
        partner: { select: { slug: true } },
      },
    });
    if (u) return u as AnyUser;
  }

  // Fallback: User
  if (p.user) {
    const u = await p.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, name: true, role: true,
        partnerId: true,
        partner: { select: { slug: true } },
      },
    });
    if (u) return u as AnyUser;
  }

  return null;
}

async function findUserByIdOrPartnerSlug(sub: string): Promise<AnyUser | null> {
  const p: any = prisma as any;

  // appUser
  if (p.appUser) {
    const u = await p.appUser.findFirst({
      where: { OR: [{ id: sub }, { partner: { slug: sub } }] },
      select: {
        id: true, email: true, name: true, role: true,
        partnerId: true,
        partner: { select: { slug: true } },
      },
    });
    if (u) return u as AnyUser;
  }

  // User
  if (p.user) {
    const u = await p.user.findFirst({
      where: { OR: [{ id: sub }, { partner: { slug: sub } }] },
      select: {
        id: true, email: true, name: true, role: true,
        partnerId: true,
        partner: { select: { slug: true } },
      },
    });
    if (u) return u as AnyUser;
  }

  return null;
}

async function upsertUserForLogin(email: string): Promise<AnyUser> {
  const p: any = prisma as any;
  const admins = adminList();
  const nextRole: RoleName = admins.has(email) ? "ADMIN" : "PARTNER";

  // Zoek partner met zelfde e-mail (optioneel)
  let partner: { id: string; slug: string | null } | null = null;
  if (p.partner) {
    partner = await p.partner.findFirst({
      where: { email },
      select: { id: true, slug: true },
    });
  }

  // appUser prefereren
  if (p.appUser) {
    const existing = await p.appUser.findUnique({ where: { email } });
    if (existing) {
      const updated = await p.appUser.update({
        where: { email },
        data: { role: nextRole, lastLoginAt: new Date(), partnerId: existing.partnerId ?? partner?.id ?? null },
        select: {
          id: true, email: true, name: true, role: true,
          partnerId: true,
          partner: { select: { slug: true } },
        },
      });
      return updated as AnyUser;
    }
    const created = await p.appUser.create({
      data: {
        email,
        role: nextRole,
        partnerId: partner?.id ?? null,
        lastLoginAt: new Date(),
      },
      select: {
        id: true, email: true, name: true, role: true,
        partnerId: true,
        partner: { select: { slug: true } },
      },
    });
    return created as AnyUser;
  }

  // Fallback: User
  if (p.user) {
    const existing = await p.user.findUnique({ where: { email } });
    if (existing) {
      const updated = await p.user.update({
        where: { email },
        data: { role: nextRole, lastLoginAt: new Date(), partnerId: existing.partnerId ?? partner?.id ?? null },
        select: {
          id: true, email: true, name: true, role: true,
          partnerId: true,
          partner: { select: { slug: true } },
        },
      });
      return updated as AnyUser;
    }
    const created = await p.user.create({
      data: {
        email,
        role: nextRole,
        partnerId: partner?.id ?? null,
        lastLoginAt: new Date(),
      },
      select: {
        id: true, email: true, name: true, role: true,
        partnerId: true,
        partner: { select: { slug: true } },
      },
    });
    return created as AnyUser;
  }

  throw new Error("No User model (user/appUser) found in Prisma schema");
}

/* ============================
   Rijke user helpers
============================ */
export async function getSessionUser(): Promise<SessionUser | null> {
  const minimal = await getSession();
  if (!minimal) return null;

  const u = await findUserByIdOrPartnerSlug(minimal.sub);
  if (!u) {
    // Minimale fallback zodat guards blijven werken
    return {
      sub: minimal.sub,
      id: minimal.sub,
      email: null,
      name: null,
      role: minimal.role,
      partnerId: null,
      partnerSlug: minimal.role === "PARTNER" ? minimal.sub : null,
    };
  }

  return {
    sub: minimal.role === "PARTNER" ? (u.partner?.slug ?? u.id) : u.id,
    id: u.id,
    email: u.email ?? null,
    name: u.name ?? null,
    role: u.role as RoleName,
    partnerId: u.partnerId ?? null,
    partnerSlug: u.partner?.slug ?? null,
  };
}

/** Zet sessie-cookie vanuit een rijk user-object (frontdoor) */
export async function setSessionCookie(user: SessionUser, maxAgeSec = MAX_AGE) {
  const sub = user.role === "PARTNER" ? (user.partnerSlug ?? user.id) : user.id;
  const token = signJwt({ sub, role: user.role }, maxAgeSec);
  await setSessionCookieFromToken(token, maxAgeSec);
}

/** Verwijder sessie (server action-vriendelijk) */
export async function signOut() {
  "use server";
  await clearSessionCookie();
}

/* ============================
   Login bootstrap helpers
============================ */
/** Wordt aangeroepen na geldige magic code: maakt/gebruikt user en zet cookie */
export async function createSession(emailRaw: string): Promise<SessionUser> {
  const email = normEmail(emailRaw);
  const user = await upsertUserForLogin(email);

  const sessUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    role: user.role as RoleName,
    partnerId: user.partnerId ?? null,
    partnerSlug: user.partner?.slug ?? null,
    sub: user.role === "PARTNER" ? (user.partner?.slug ?? user.id) : user.id,
  };

  await setSessionCookie(sessUser);
  return sessUser;
}

/* ============================
   Guards
============================ */
export async function requireUser(roles?: RoleName[]) {
  const s = await getSession();
  if (!s) redirect("/admin/login"); // algemene login
  if (roles && !roles.includes(s.role)) redirect("/admin/login");
  return s;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Response("Unauthorized", { status: 401 });
  if (s.role !== "ADMIN") throw new Response("Forbidden", { status: 403 });
  return s;
}

export async function requireAdminOrPartner(opts?: { partnerSlug?: string | null }) {
  const s = await getSession();
  if (!s) throw new Response("Unauthorized", { status: 401 });
  if (s.role === "ADMIN") return s;
  if (s.role !== "PARTNER") throw new Response("Forbidden", { status: 403 });
  if (opts?.partnerSlug && opts.partnerSlug !== s.sub) {
    throw new Response("Forbidden: wrong partner scope", { status: 403 });
  }
  return s;
}
