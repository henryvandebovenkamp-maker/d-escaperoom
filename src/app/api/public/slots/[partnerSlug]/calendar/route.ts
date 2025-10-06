import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toDayISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function startOfDayLocal(y:number,m:number,d:number) { return new Date(y, m-1, d, 0,0,0,0); }
function endOfDayLocal(y:number,m:number,d:number) { return new Date(y, m-1, d, 23,59,59,999); }

export async function GET(
  req: Request,
  ctx: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const { partnerSlug } = await ctx.params;
    const url = new URL(req.url);
    const startISO = url.searchParams.get("start"); // "YYYY-MM-DD"
    const endISO   = url.searchParams.get("end");   // "YYYY-MM-DD"

    if (!partnerSlug || !startISO || !endISO) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const partner = await prisma.partner.findUnique({
      where: { slug: partnerSlug },
      select: { id: true },
    });
    if (!partner) return NextResponse.json({ items: [] }, { status: 200 });

    const [sy, sm, sd] = startISO.split("-").map(Number);
    const [ey, em, ed] = endISO.split("-").map(Number);
    const start = startOfDayLocal(sy!, sm!, sd!);
    const end   = endOfDayLocal(ey!, em!, ed!);

    // Tel alleen zichtbare statussen (PUBLISHED/BOOKED)
    const rows = await prisma.slot.findMany({
      where: {
        partnerId: partner.id,
        startTime: { gte: start, lte: end },
        status: { in: ["PUBLISHED", "BOOKED"] },
      },
      orderBy: { startTime: "asc" },
      select: { startTime: true, status: true },
    });

    const byDay = new Map<string, { published: number; booked: number; total: number }>();
    for (const r of rows) {
      const k = toDayISO(new Date(r.startTime));
      const cur = byDay.get(k) ?? { published: 0, booked: 0, total: 0 };
      if (r.status === "PUBLISHED") cur.published++;
      else if (r.status === "BOOKED") cur.booked++;
      cur.total = cur.published + cur.booked;
      byDay.set(k, cur);
    }

    const items = Array.from(byDay.entries()).map(([dayISO, counts]) => ({ dayISO, counts }));
    return NextResponse.json({ items }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[/api/public/slots/[partnerSlug]/calendar] Error:", e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
