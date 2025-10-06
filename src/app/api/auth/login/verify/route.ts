// PATH: src/app/api/auth/login/verify/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { setSessionCookie, type SessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const isProd = process.env.NODE_ENV === "production";

// Minimal type voor wat we nodig hebben uit de DB
type UserRow = {
  id: string;
  email: string | null;
  name?: string | null;
  role: "ADMIN" | "PARTNER";
  partnerId?: string | null;
  partner?: { slug: string | null } | null;
};

/** Haal user op (appUser of user). Maak PARTNER aan als die nog niet bestaat. */
async function getOrCreateUserByEmail(cleanEmail: string): Promise<{ user: UserRow; created: boolean }> {
  const p: any = prisma as any;
  let created = false;

  if (p.appUser) {
    let u: UserRow | null = await p.appUser.findUnique({
      where: { email: cleanEmail },
      select: {
        id: true, email: true, name: true, role: true,
        partnerId: true,
        partner: { select: { slug: true } },
      },
    });
    if (!u) {
      const partner = await p.partner?.findFirst({ where: { email: cleanEmail }, select: { id: true } });
      u = await p.appUser.create({
        data: {
          email: cleanEmail,
          role: "PARTNER",
          partnerId: partner?.id ?? null,
          lastLoginAt: new Date(),
        },
        select: {
          id: true, email: true, name: true, role: true,
          partnerId: true,
          partner: { select: { slug: true } },
        },
      });
      created = true;
    } else {
      await p.appUser.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
    }
    if (!u) throw new Error("User not found after creation or update.");
    return { user: u, created };
  }

  if (p.user) {
    let u: UserRow | null = await p.user.findUnique({
      where: { email: cleanEmail },
      select: {
        id: true, email: true, name: true, role: true,
        partnerId: true,
        partner: { select: { slug: true } },
      },
    });
    if (!u) {
      const partner = await p.partner?.findFirst({ where: { email: cleanEmail }, select: { id: true } });
      u = await p.user.create({
        data: {
          email: cleanEmail,
          role: "PARTNER",
          partnerId: partner?.id ?? null,
          lastLoginAt: new Date(),
        },
        select: {
          id: true, email: true, name: true, role: true,
          partnerId: true,
          partner: { select: { slug: true } },
        },
      });
      created = true;
    } else {
      await p.user.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
    }
    if (!u) throw new Error("User not found after creation or update.");
    return { user: u, created };
  }

  throw new Error("No User/AppUser model found in Prisma schema.");
}

export async function POST(req: Request) {
  try {
    const { email, code } = (await req.json()) as { email?: string; code?: string };
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanCode = (code || "").trim();

    if (!cleanEmail || !/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }

    const now = new Date();

    // 1) Pak meest recente geldige code — LET OP: alleen codeHash selecteren (geen 'code' veld)
    const loginCode = await prisma.loginCode.findFirst({
      where: { email: cleanEmail, usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      select: { id: true, codeHash: true },
    });
    if (!loginCode) {
      if (!isProd) console.log("[verify] geen geldige code voor", cleanEmail);
      return NextResponse.json({ ok: false, error: "Ongeldige of verlopen code" }, { status: 400 });
    }

    // 2) Vergelijk code (bcrypt of sha256)
    const stored = loginCode.codeHash || "";
    let match = false;
    if (stored.startsWith("$2a$") || stored.startsWith("$2b$")) {
      match = await bcrypt.compare(cleanCode, stored);
    } else {
      match = sha256(cleanCode) === stored;
    }
    if (!match) {
      return NextResponse.json({ ok: false, error: "Ongeldige of verlopen code" }, { status: 400 });
    }

    // 3) Markeer code als gebruikt
    await prisma.loginCode.update({ where: { id: loginCode.id }, data: { usedAt: now } });

    // 4) Haal of maak user (nooit null terug)
    const { user, created } = await getOrCreateUserByEmail(cleanEmail);

    // 5) Zet sessie-cookie
    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
      role: user.role,
      partnerId: user.partnerId ?? null,
      partnerSlug: user.partner?.slug ?? null,
      sub: "", // lib bepaalt sub (partnerSlug of id)
    };
    await setSessionCookie(sessionUser);

    if (!isProd) console.log("[verify] login ok:", user.email, user.role, created ? "(created)" : "");

    // 6) Response — frontend kiest redirect en toont melding bij 'created'
    return NextResponse.json({
      ok: true,
      session: {
        role: sessionUser.role,
        email: sessionUser.email,
        partnerSlug: sessionUser.partnerSlug ?? null,
      },
      created,
    });
  } catch (err) {
    console.error("[/api/auth/login/verify] error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
