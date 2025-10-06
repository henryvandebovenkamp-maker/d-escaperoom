import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/** Daggrenzen in local time */
function dayRange(dayISO: string) {
  const [y, m, d] = dayISO.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  const end = new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999);
  return { start, end };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const { partnerSlug } = await ctx.params;
    const url = new URL(req.url);
    const dayISO = url.searchParams.get("day");

    if (!partnerSlug || !dayISO) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    // Partner via slug
    const partner = await prisma.partner.findUnique({
      where: { slug: partnerSlug },
      select: { id: true },
    });
    if (!partner) return NextResponse.json({ items: [] }, { status: 200 });

    const { start, end } = dayRange(dayISO);

    // Publiek: alleen PUBLISHED of BOOKED tonen
    const rows = await prisma.slot.findMany({
      where: {
        partnerId: partner.id,
        startTime: { gte: start, lte: end },
        status: { in: ["PUBLISHED", "BOOKED"] },
      },
      orderBy: { startTime: "asc" },
      select: { id: true, startTime: true, status: true },
    });

    return NextResponse.json(
      { items: rows },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[/api/public/slots/[partnerSlug]/list] Error:", e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
