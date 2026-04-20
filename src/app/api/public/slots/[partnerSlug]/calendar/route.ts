import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIMEZONE = "Europe/Amsterdam";

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

function startOfDayUtc(dayIso: string) {
  return fromZonedTime(`${dayIso} 00:00:00`, TIMEZONE);
}

function dayISOInAmsterdam(date: Date) {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const { partnerSlug } = await ctx.params;
    const url = new URL(req.url);
    const startISO = url.searchParams.get("start");
    const endISO = url.searchParams.get("end");

    if (!partnerSlug || !startISO || !endISO) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    if (startISO > endISO) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const partner = await prisma.partner.findUnique({
      where: { slug: partnerSlug },
      select: { id: true },
    });

    if (!partner) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const startUtc = startOfDayUtc(startISO);
    const endExclusiveUtc = startOfDayUtc(addDays(endISO, 1));

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
      orderBy: { startTime: "asc" },
      select: {
        startTime: true,
        status: true,
      },
    });

    const byDay = new Map<
      string,
      { published: number; booked: number; total: number }
    >();

    for (const row of rows) {
      const key = dayISOInAmsterdam(new Date(row.startTime));
      const current = byDay.get(key) ?? {
        published: 0,
        booked: 0,
        total: 0,
      };

      if (row.status === "PUBLISHED") current.published++;
      else if (row.status === "BOOKED") current.booked++;

      current.total = current.published + current.booked;
      byDay.set(key, current);
    }

    const items = Array.from(byDay.entries()).map(([dayISO, counts]) => ({
      dayISO,
      counts,
    }));

    return NextResponse.json(
      { items },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (e) {
    console.error("[/api/public/slots/[partnerSlug]/calendar] Error:", e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}