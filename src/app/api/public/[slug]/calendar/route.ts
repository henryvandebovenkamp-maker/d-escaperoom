import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const QSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tz: z.string().min(1).optional(), // bv. Europe/Amsterdam
});

// Bepaal tz-offset voor een gegeven UTC-datum
function getOffsetMs(utcDate: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(utcDate).map((p) => [p.type, p.value])
  ) as Record<string, string>;
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - utcDate.getTime();
}

// 00:00 in opgegeven tz -> UTC Date
function zonedStartOfDayUTC(dayISO: string, tz: string) {
  const [y, m, d] = dayISO.split("-").map(Number);
  const utcMidnight = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const offset = getOffsetMs(utcMidnight, tz);
  return new Date(utcMidnight.getTime() - offset);
}

// YYYY-MM-DD in opgegeven tz
function dayISOInTZ(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // en-CA => YYYY-MM-DD
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const url = new URL(req.url);
    const parsed = QSchema.safeParse({
      start: url.searchParams.get("start") || "",
      end: url.searchParams.get("end") || "",
      tz: url.searchParams.get("tz") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Ongeldige query parameters" }, { status: 400 });
    }

    const { start, end, tz = "Europe/Amsterdam" } = parsed.data;

    const partner = await prisma.partner.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!partner) return NextResponse.json({ error: "Partner niet gevonden" }, { status: 404 });

    const startUTC = zonedStartOfDayUTC(start, tz);
    const endUTC = zonedStartOfDayUTC(end, tz); // exclusief

    const rows = await prisma.slot.findMany({
      where: {
        partnerId: partner.id,
        startTime: { gte: startUTC, lt: endUTC },
        status: { in: ["PUBLISHED", "BOOKED"] },
      },
      select: { startTime: true, status: true },
      orderBy: { startTime: "asc" },
    });

    const map = new Map<string, { published: number; booked: number; total: number }>();
    for (const r of rows) {
      const key = dayISOInTZ(new Date(r.startTime), tz);
      const cur = map.get(key) || { published: 0, booked: 0, total: 0 };
      if (r.status === "PUBLISHED") cur.published++;
      else if (r.status === "BOOKED") cur.booked++;
      cur.total++;
      map.set(key, cur);
    }

    const items = Array.from(map.entries()).map(([dayISO, counts]) => ({ dayISO, counts }));
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Serverfout" }, { status: 500 });
  }
}
