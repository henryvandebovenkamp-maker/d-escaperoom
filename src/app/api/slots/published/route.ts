// src/app/api/slots/published/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const Q = z.object({
  partner: z.string().min(1),               // slug
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
});

function monthRange(monthISO: string) {
  const [y,m] = monthISO.split("-").map((v)=>parseInt(v,10));
  const start = new Date(Date.UTC(y, m-1, 1, 0, 0, 0));
  const end   = new Date(Date.UTC(y, m,   1, 0, 0, 0));
  return { start, end };
}
function dayISO(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth()+1).padStart(2,"0");
  const dd= String(d.getUTCDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = Q.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) return new NextResponse(parsed.error.message, { status: 400 });
    const { partner, month } = parsed.data;

    const p = await prisma.partner.findUnique({ where: { slug: partner }, select: { id: true }});
    if (!p) return new NextResponse("Partner not found", { status: 404 });

    const { start, end } = monthRange(month);

    const rows = await prisma.slot.findMany({
      where: { partnerId: p.id, status: "PUBLISHED", startTime: { gte: start, lt: end } },
      select: { id: true, startTime: true },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(
      rows.map(r => ({ id: r.id, startTime: r.startTime.toISOString(), dayISO: dayISO(new Date(r.startTime)) }))
    );
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
