// PATH: src/app/api/discounts/list/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * GET /api/discounts/list
 * Query:
 * - partnerId?: string        (ADMIN: optioneel → alle partners)
 * - partnerSlug?: string      (ADMIN-alias; vertaalt naar partnerId)
 * - active?: "1" | "0"        (default "1" → alleen actieve)
 * - validNow?: "1" | "0"      (default "0"; 1 = geldig op dit moment obv datum)
 * - q?: string                (zoek in code, case-insensitive)
 * - limit?: number            (default 500, max 2000)
 */
export async function GET(req: Request) {
  const u = await getSessionUser();
  if (!u) return json({ error: "Unauthorized" }, 401);

  const { searchParams } = new URL(req.url);

  // Role scoping
  let partnerId: string | undefined = searchParams.get("partnerId") || undefined;
  const partnerSlug = searchParams.get("partnerSlug") || undefined;

  if (u.role === "PARTNER") {
    if (!u.partnerId) return json({ error: "Partneraccount mist koppeling (partnerId)." }, 403);
    partnerId = u.partnerId; // geforceerd op eigen partner
  } else if (u.role === "ADMIN") {
    // ADMIN: partnerId optioneel (alle partners); partnerSlug → partnerId
    if (!partnerId && partnerSlug) {
      const p = await prisma.partner.findUnique({ where: { slug: partnerSlug }, select: { id: true } });
      if (p) partnerId = p.id;
    }
  } else {
    return json({ error: "Forbidden" }, 403);
  }

  const active = (searchParams.get("active") ?? "1") === "1";
  const validNow = (searchParams.get("validNow") ?? "0") === "1";
  const q = searchParams.get("q")?.trim() || "";
  const limitRaw = Number(searchParams.get("limit") || 500);
  const take = Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 500), 2000);

  const now = new Date();

  const where: any = {};
  if (typeof partnerId === "string") where.partnerId = partnerId;
  if (active) where.active = true;

  if (validNow) {
    where.AND = [
      { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
      { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
    ];
  }

  if (q) where.code = { contains: q.toUpperCase(), mode: "insensitive" as const };

  try {
    const rows = await prisma.discountCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        code: true,
        type: true,
        percent: true,
        amountCents: true,
        validFrom: true,
        validUntil: true,
        maxRedemptions: true,
        redeemedCount: true,
        active: true,
        partnerId: true,
        createdAt: true,
        updatedAt: true,
        partner: { select: { name: true, slug: true } },
      },
    });

    return json({
      ok: true,
      items: rows.map((r) => ({
        ...r,
        partnerName: r.partner?.name ?? null,
        partnerSlug: r.partner?.slug ?? null,
      })),
    });
  } catch (err) {
    console.error("discounts/list error", err);
    return json({ error: "Server error" }, 500);
  }
}
