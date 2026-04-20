// PATH: src/app/api/public/slots/[slug]/list/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";

const QSchema = z.object({
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige dag, gebruik YYYY-MM-DD"),
  includeDraft: z.enum(["0", "1"]).optional(),
});

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

function addDays(dateIso: string, amount: number) {
  const { year, month, day } = parseIsoDate(dateIso);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return formatIsoDate(date);
}

function startOfDayUtc(dayIso: string) {
  return fromZonedTime(`${dayIso} 00:00:00`, TIMEZONE);
}

function startOfNextDayUtc(dayIso: string) {
  return fromZonedTime(`${addDays(dayIso, 1)} 00:00:00`, TIMEZONE);
}

function toIsoString(date: Date) {
  return new Date(date).toISOString();
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const url = new URL(req.url);

    const parsed = QSchema.safeParse({
      day: url.searchParams.get("day") ?? "",
      includeDraft: url.searchParams.get("includeDraft") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Ongeldige parameters",
        },
        { status: 400 }
      );
    }

    const { day, includeDraft } = parsed.data;
    const { slug } = await ctx.params;

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

    const start = startOfDayUtc(day);
    const end = startOfNextDayUtc(day);

    const statuses =
      includeDraft === "1"
        ? (["DRAFT", "PUBLISHED", "BOOKED"] as const)
        : (["PUBLISHED", "BOOKED"] as const);

    const rows = await prisma.slot.findMany({
      where: {
        partnerId: partner.id,
        startTime: {
          gte: start,
          lt: end,
        },
        status: {
          in: statuses as any,
        },
      },
      select: {
        id: true,
        startTime: true,
        status: true,
      },
      orderBy: { startTime: "asc" },
    });

    const items = rows.map((row) => ({
      id: row.id,
      startTime: toIsoString(row.startTime),
      status: row.status,
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
      { error: err?.message ?? "Serverfout" },
      { status: 500 }
    );
  }
}