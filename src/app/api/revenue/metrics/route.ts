// PATH: src/app/api/revenue/metrics/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { SlotStatus } from "@prisma/client";

/**
 * Query:
 *  - partnerSlug?: string
 *  - dateFrom?: YYYY-MM-DD
 *  - dateTo?:   YYYY-MM-DD (exclusive)
 */
export async function GET(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const partnerSlug = searchParams.get("partnerSlug");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  // Scope afdwingen
  let partnerWhere: any = {};
  if (u.role === "PARTNER" && u.partnerId) {
    partnerWhere.partnerId = u.partnerId;
  } else if (u.role === "ADMIN" && partnerSlug) {
    const p = await prisma.partner.findUnique({ where: { slug: partnerSlug }, select: { id: true } });
    if (!p) return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    partnerWhere.partnerId = p.id;
  }

  const timeWhere =
    dateFrom || dateTo
      ? {
          startTime: {
            ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
            ...(dateTo ? { lt: new Date(`${dateTo}T00:00:00.000Z`) } : {}),
          },
        }
      : {};

  const grouped = await prisma.slot.groupBy({
    by: ["status"],
    where: { ...partnerWhere, ...timeWhere },
    _count: { status: true },
  });

  const countBy = (s: SlotStatus) => grouped.find((g) => g.status === s)?._count.status ?? 0;

  const published = countBy(SlotStatus.PUBLISHED);
  const booked = countBy(SlotStatus.BOOKED);

  const occupancyRate = published > 0 ? Math.round((booked / published) * 100) : 0;

  return NextResponse.json({
    ok: true,
    metrics: {
      slotsPublished: published,
      slotsBooked: booked,
      occupancyRate,
    },
  });
}
