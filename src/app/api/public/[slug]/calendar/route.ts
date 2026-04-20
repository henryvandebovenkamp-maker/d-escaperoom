// PATH: src/app/api/public/slots/[slug]/calendar/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

const QSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tz: z.string().min(1).optional(),
});

const DEFAULT_TIMEZONE = "Europe/Amsterdam";

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dayIso: string, amount: number) {
  const { year, month, day } = parseIsoDate(dayIso);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return formatIsoDate(date);
}

function startOfDayUtc(dayIso: string, timeZone: string) {
  return fromZonedTime(`${dayIso} 00:00:00`, timeZone);
}

function dayISOInTimeZone(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const url = new URL(req.url);

    const parsed = QSchema.safeParse({
      start: url.searchParams.get("start") || "",
      end: url.searchParams.get("end") || "",
      tz: url.searchParams.get("tz") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ongeldige query parameters" },
        { status: 400 }
      );
    }

    const { start, end, tz = DEFAULT_TIMEZONE } = parsed.data;
    const { slug } = await ctx.params;

    if (start > end) {
      return NextResponse.json(
        { error: "start mag niet na end liggen" },
        { status: 400 }
      );
    }

    const partner = await prisma.partner.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!partner) {
      return NextResponse.json(
        { error: "Partner niet gevonden" },
        { status: 404 }
      );
    }

    const startUtc = startOfDayUtc(start, tz);
    const endExclusiveUtc = startOfDayUtc(addDays(end, 1), tz);

    const rows = await prisma.slot.findMany({
      where: {
        partnerId: partner.id,
        startTime: {
          gte: startUtc,
          lt: endExclusiveUtc,
        },
        status: {
          in: ["PUBLISHED", "BOOKED"],
        },
      },
      select: {
        startTime: true,
        status: true,
      },
      orderBy: { startTime: "asc" },
    });

    const map = new Map<
      string,
      { published: number; booked: number; total: number }
    >();

    for (const row of rows) {
      const key = dayISOInTimeZone(new Date(row.startTime), tz);
      const current = map.get(key) || {
        published: 0,
        booked: 0,
        total: 0,
      };

      if (row.status === "PUBLISHED") {
        current.published++;
      } else if (row.status === "BOOKED") {
        current.booked++;
      }

      current.total++;
      map.set(key, current);
    }

    const items = Array.from(map.entries()).map(([dayISO, counts]) => ({
      dayISO,
      counts,
    }));

    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Serverfout" },
      { status: 500 }
    );
  }
}