// PATH: src/app/api/slots/[partnerSlug]/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SlotStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Europe/Amsterdam";

const BodySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate moet YYYY-MM-DD zijn"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "endDate moet YYYY-MM-DD zijn"),
  weekdays: z
    .array(z.coerce.number().int().min(0).max(6))
    .nonempty("Kies minimaal één weekdag"),
  times: z
    .array(z.string().regex(/^\d{2}:\d{2}$/))
    .nonempty("Kies minimaal één tijd"),
  publish: z.coerce.boolean().default(true),
  capacity: z.coerce.number().int().positive().max(99).default(1),
  maxPlayers: z.coerce.number().int().positive().max(10).default(3),
  durationMinutes: z.coerce.number().int().positive().max(24 * 60).default(60),
});

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function parseYMD(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return { year, month, day };
}

function formatYMD(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function addDays(dateIso: string, amount: number) {
  const { year, month, day } = parseYMD(dateIso);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return formatYMD(date);
}

function getWeekday(dateIso: string) {
  const { year, month, day } = parseYMD(dateIso);
  return new Date(year, month - 1, day).getDay();
}

function amsterdamDateTimeToUtc(dateIso: string, hhmm: string) {
  return fromZonedTime(`${dateIso} ${hhmm}:00`, TIMEZONE);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfDayUtc(dateIso: string) {
  return fromZonedTime(`${dateIso} 00:00:00`, TIMEZONE);
}

function startOfNextDayUtc(dateIso: string) {
  return fromZonedTime(`${addDays(dateIso, 1)} 00:00:00`, TIMEZONE);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { partnerSlug } = await ctx.params;
    const partner = await resolvePartnerForRequest(user, partnerSlug);

    let raw: unknown;

    try {
      raw = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const parsed = BodySchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_BODY",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      startDate,
      endDate,
      weekdays,
      times,
      publish,
      capacity,
      maxPlayers,
      durationMinutes,
    } = parsed.data;

    if (startDate > endDate) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_RANGE",
          message: "startDate moet vóór of gelijk aan endDate zijn.",
        },
        { status: 400 }
      );
    }

    const uniqueWeekdays = Array.from(new Set(weekdays));
    const uniqueTimes = Array.from(new Set(times)).sort();

    const wanted: Array<{ startTime: Date; endTime: Date }> = [];

    let currentDate = startDate;

    while (currentDate <= endDate) {
      const weekday = getWeekday(currentDate);

      if (uniqueWeekdays.includes(weekday)) {
        for (const time of uniqueTimes) {
          const startTime = amsterdamDateTimeToUtc(currentDate, time);
          const endTime = addMinutes(startTime, durationMinutes);

          wanted.push({ startTime, endTime });
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    if (wanted.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "EMPTY_SELECTION",
          message: "Geen datums/tijden in de gekozen range.",
        },
        { status: 400 }
      );
    }

    const status = publish ? SlotStatus.PUBLISHED : SlotStatus.DRAFT;

    const data = wanted.map(({ startTime, endTime }) => ({
      partnerId: partner.id,
      startTime,
      endTime,
      status,
      capacity,
      maxPlayers,
    }));

    const result = await prisma.slot.createMany({
      data,
      skipDuplicates: true,
    });

    const attempted = data.length;
    const created = result.count;
    const skipped = attempted - created;

    const rangeFrom = startOfDayUtc(startDate);
    const rangeTo = startOfNextDayUtc(endDate);

    const fresh = await prisma.slot.findMany({
      where: {
        partnerId: partner.id,
        startTime: {
          gte: rangeFrom,
          lt: rangeTo,
        },
      },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        capacity: true,
        maxPlayers: true,
      },
    });

    return NextResponse.json({
      ok: true,
      attempted,
      created,
      skipped,
      range: { startDate, endDate },
      slots: fresh,
      note:
        skipped > 0
          ? "Bestaande tijden zijn overgeslagen; nieuwe tijden zijn toegevoegd."
          : "Alle gekozen tijden zijn aangemaakt.",
    });
  } catch (err: unknown) {
    console.error("[/api/slots/[partnerSlug]/bulk] Error:", err);

    const message = err instanceof Error ? err.message : "Internal error";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}