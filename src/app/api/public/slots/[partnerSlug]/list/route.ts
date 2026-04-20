import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fromZonedTime } from "date-fns-tz";

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

    const partner = await prisma.partner.findUnique({
      where: { slug: partnerSlug },
      select: { id: true },
    });

    if (!partner) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const startUtc = startOfDayUtc(dayISO);
    const endExclusiveUtc = startOfDayUtc(addDays(dayISO, 1));

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
        id: true,
        startTime: true,
        status: true,
      },
    });

    return NextResponse.json(
      { items: rows },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (e) {
    console.error("[/api/public/slots/[partnerSlug]/list] Error:", e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}