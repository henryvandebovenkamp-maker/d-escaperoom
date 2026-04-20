// PATH: src/app/api/slots/[partnerSlug]/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";
import { z } from "zod";
import type { SlotStatus } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";

/** Body:
 *  - startDate / endDate: "YYYY-MM-DD"
 *  - weekdays: JS-day nummers (0=zo..6=za), minimaal 1
 *  - times: "HH:MM" (bijv. "09:00"), minimaal 1
 *  - publish: boolean
 *  - optioneel: capacity, maxPlayers, durationMinutes
 */
const BodySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate moet YYYY-MM-DD zijn"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "endDate moet YYYY-MM-DD zijn"),
  weekdays: z
    .array(z.number().int().min(0).max(6))
    .nonempty("Kies minimaal één weekdag"),
  times: z
    .array(z.string().regex(/^\d{2}:\d{2}$/))
    .nonempty("Kies minimaal één tijd"),
  publish: z.boolean().default(true),
  capacity: z.number().int().positive().max(99).default(1).optional(),
  maxPlayers: z.number().int().positive().max(10).default(3).optional(),
  durationMinutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60)
    .default(60)
    .optional(),
});

const TIMEZONE = "Europe/Amsterdam";

function parseYMD(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return { year, month, day };
}

function formatYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateIso: string, amount: number) {
  const { year, month, day } = parseYMD(dateIso);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return formatYMD(date);
}

function getWeekday(dateIso: string) {
  const { year, month, day } = parseYMD(dateIso);
  return new Date(year, month - 1, day).getDay(); // 0=zo..6=za
}

function amsterdamDateTimeToUtc(dateIso: string, hhmm: string) {
  return fromZonedTime(`${dateIso} ${hhmm}:00`, TIMEZONE);
}

function addMinutes(date: Date, mins: number) {
  return new Date(date.getTime() + mins * 60_000);
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
      capacity = 1,
      maxPlayers = 3,
      durationMinutes = 60,
    } = parsed.data;

    if (startDate > endDate) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_RANGE",
          message: "startDate moet ≤ endDate zijn",
        },
        { status: 400 }
      );
    }

    const uniqueTimes = Array.from(new Set(times)).sort();
    const wanted: Array<{ startTime: Date; endTime: Date }> = [];

    let currentDate = startDate;
    while (currentDate <= endDate) {
      const weekday = getWeekday(currentDate);

      if (weekdays.includes(weekday)) {
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
          message: "Geen datums/tijden in de gekozen range",
        },
        { status: 400 }
      );
    }

    const data = wanted.map(({ startTime, endTime }) => ({
      partnerId: partner.id,
      startTime,
      endTime,
      status: publish
        ? ("PUBLISHED" as SlotStatus)
        : ("PUBLISHED" as SlotStatus), // laat staan zolang DB geen DRAFT kent
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
  } catch (err: any) {
    console.error("[/api/slots/[partnerSlug]/bulk] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}