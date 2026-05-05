// PATH: src/app/api/slots/[partnerSlug]/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, SlotStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";
import { z } from "zod";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PENDING_BOOKING_TTL_SECONDS = 90;

const QuerySchema = z.object({
  scope: z.enum(["day", "month"]).optional(),
  mode: z.enum(["day", "month"]).optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  base: z.coerce.number().int().min(1).max(48).optional(),
});

const TIMES_12 = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
] as const;

const TIMEZONE = "Europe/Amsterdam";

function parseQuery(req: NextRequest) {
  const u = new URL(req.url);
  const raw = Object.fromEntries(u.searchParams.entries());
  const q = QuerySchema.parse(raw);
  return { ...q, scopeOrMode: q.scope ?? q.mode };
}

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

function getDaysInMonth(monthIso: string) {
  const [year, month] = monthIso.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    return `${year}-${String(month).padStart(2, "0")}-${String(
      index + 1
    ).padStart(2, "0")}`;
  });
}

function startOfDayUtc(dayIso: string) {
  return fromZonedTime(`${dayIso} 00:00:00`, TIMEZONE);
}

function startOfNextDayUtc(dayIso: string) {
  return fromZonedTime(`${addDays(dayIso, 1)} 00:00:00`, TIMEZONE);
}

function startOfMonthUtc(monthIso: string) {
  return fromZonedTime(`${monthIso}-01 00:00:00`, TIMEZONE);
}

function startOfNextMonthUtc(monthIso: string) {
  const [year, month] = monthIso.split("-").map(Number);
  const nextMonthDate = new Date(year, month - 1, 1);
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

  const nextMonthIso = `${nextMonthDate.getFullYear()}-${String(
    nextMonthDate.getMonth() + 1
  ).padStart(2, "0")}`;

  return fromZonedTime(`${nextMonthIso}-01 00:00:00`, TIMEZONE);
}

function combineDateTimeUtc(dayIso: string, hhmm: string) {
  return fromZonedTime(`${dayIso} ${hhmm}:00`, TIMEZONE);
}

function addMinutes(date: Date, mins: number) {
  return new Date(date.getTime() + mins * 60_000);
}

function dayKeyInAmsterdam(date: Date) {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

function timeLabelInAmsterdam(date: Date) {
  return formatInTimeZone(date, TIMEZONE, "HH:mm");
}

type EffStatus = "DRAFT" | "PUBLISHED" | "BOOKED";
type DayStatus = "AVAILABLE" | "FULL" | "NO_SLOTS";

function getDayStatus(params: {
  publishedCount: number;
  bookedCount: number;
}): DayStatus {
  const { publishedCount, bookedCount } = params;

  if (publishedCount > 0) return "AVAILABLE";
  if (bookedCount > 0) return "FULL";
  return "NO_SLOTS";
}

function effectiveStatus(
  dbStatus: "DRAFT" | "PUBLISHED" | "BOOKED",
  bookingStatus?: BookingStatus | null
): EffStatus {
  if (bookingStatus === BookingStatus.CONFIRMED) return "BOOKED";
  if (dbStatus === "PUBLISHED" || dbStatus === "BOOKED") return "PUBLISHED";
  return "DRAFT";
}

async function cleanupExpiredPendingBookings(params: {
  partnerId?: string;
  from: Date;
  to: Date;
}) {
  const expiresBefore = new Date(
    Date.now() - PENDING_BOOKING_TTL_SECONDS * 1000
  );

  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.PENDING,
      createdAt: {
        lt: expiresBefore,
      },
      slot: {
        startTime: {
          gte: params.from,
          lt: params.to,
        },
        ...(params.partnerId ? { partnerId: params.partnerId } : {}),
      },
    },
    select: {
      id: true,
      slotId: true,
    },
  });

  if (!expiredBookings.length) return;

  const bookingIds = expiredBookings.map((booking) => booking.id);
  const slotIds = expiredBookings.map((booking) => booking.slotId);

  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany({
      where: {
        bookingId: {
          in: bookingIds,
        },
      },
    });

    await tx.booking.deleteMany({
      where: {
        id: {
          in: bookingIds,
        },
      },
    });

    await tx.slot.updateMany({
      where: {
        id: {
          in: slotIds,
        },
        status: {
          not: SlotStatus.DRAFT,
        },
      },
      data: {
        status: SlotStatus.PUBLISHED,
        bookedAt: null,
      },
    });
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partnerSlug } = await ctx.params;
    const q = parseQuery(req);
    const scope = q.scopeOrMode as "day" | "month" | undefined;
    const BASE = q.base ?? 12;

    if (scope !== "day") {
      if (!q.month) {
        return NextResponse.json(
          { error: "Missing 'month' (YYYY-MM)" },
          { status: 400 }
        );
      }

      const from = startOfMonthUtc(q.month);
      const to = startOfNextMonthUtc(q.month);

      const whereSlots: any = {
        startTime: {
          gte: from,
          lt: to,
        },
      };

      let cleanupPartnerId: string | undefined;

      if (user.role === "PARTNER") {
        const partner = await resolvePartnerForRequest(user, partnerSlug);
        whereSlots.partnerId = partner.id;
        cleanupPartnerId = partner.id;
      } else if (user.role === "ADMIN" && partnerSlug !== "all") {
        const partner = await prisma.partner.findUnique({
          where: { slug: partnerSlug },
          select: { id: true },
        });

        if (partner) {
          whereSlots.partnerId = partner.id;
          cleanupPartnerId = partner.id;
        } else {
          whereSlots.partner = { slug: partnerSlug };
        }
      }

      await cleanupExpiredPendingBookings({
        partnerId: cleanupPartnerId,
        from,
        to,
      });

      const monthSlots = await prisma.slot.findMany({
        where: whereSlots,
        orderBy: { startTime: "asc" },
        select: {
          startTime: true,
          status: true,
          booking: { select: { status: true } },
        },
      });

      const daysInMonth = getDaysInMonth(q.month);

      const byDay: Record<
        string,
        {
          day: string;
          PUBLISHED: number;
          BOOKED: number;
          DRAFT: number;
        }
      > = {};

      for (const day of daysInMonth) {
        byDay[day] = {
          day,
          PUBLISHED: 0,
          BOOKED: 0,
          DRAFT: BASE,
        };
      }

      for (const slot of monthSlots) {
        const key = dayKeyInAmsterdam(new Date(slot.startTime));
        if (!byDay[key]) continue;

        const eff = effectiveStatus(
          slot.status as EffStatus,
          slot.booking?.status
        );

        if (eff === "BOOKED") {
          byDay[key].BOOKED++;
        } else if (eff === "PUBLISHED") {
          byDay[key].PUBLISHED++;
        }

        if (eff !== "DRAFT") {
          byDay[key].DRAFT = Math.max(0, byDay[key].DRAFT - 1);
        }
      }

      const days = Object.values(byDay)
        .map((d) => ({
          ...d,
          dayStatus: getDayStatus({
            publishedCount: d.PUBLISHED,
            bookedCount: d.BOOKED,
          }),
        }))
        .sort((a, b) => a.day.localeCompare(b.day));

      const res = NextResponse.json({
        ok: true,
        scope: "month",
        month: q.month,
        base: BASE,
        days,
        publishedDays: days.map((d) => ({
          date: d.day,
          publishedCount: d.PUBLISHED,
          bookedCount: d.BOOKED,
          dayStatus: d.dayStatus,
        })),
      });

      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    if (!q.day) {
      return NextResponse.json(
        { error: "Missing 'day' (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (user.role === "ADMIN" && partnerSlug === "all") {
      const baseTimes = (TIMES_12 as readonly string[]).slice(0, BASE);

      const dayStatus = getDayStatus({
        publishedCount: 0,
        bookedCount: 0,
      });

      const res = NextResponse.json({
        ok: true,
        scope: "day",
        day: q.day,
        dayStatus,
        needsPartner: true,
        counts: { DRAFT: baseTimes.length, PUBLISHED: 0, BOOKED: 0 },
        slots: [],
        list: [],
        items: [],
      });

      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    const partner = await resolvePartnerForRequest(user, partnerSlug);
    const from = startOfDayUtc(q.day);
    const to = startOfNextDayUtc(q.day);

    await cleanupExpiredPendingBookings({
      partnerId: partner.id,
      from,
      to,
    });

    const realAll = await prisma.slot.findMany({
      where: {
        partnerId: partner.id,
        startTime: {
          gte: from,
          lt: to,
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
        booking: { select: { id: true, status: true } },
      },
    });

    const items = realAll.map((slot) => {
      const eff = effectiveStatus(
        slot.status as EffStatus,
        slot.booking?.status
      );

      return {
        id: slot.id,
        startTime: new Date(slot.startTime).toISOString(),
        endTime: slot.endTime
          ? new Date(slot.endTime).toISOString()
          : undefined,
        status: eff,
        capacity: slot.capacity ?? null,
        maxPlayers: slot.maxPlayers ?? null,
        virtual: false,
      };
    });

    const baseTimes = (TIMES_12 as readonly string[]).slice(0, BASE);

    const occupiedHHMM = new Set<string>(
      realAll.map((slot) => timeLabelInAmsterdam(new Date(slot.startTime)))
    );

    const virtualDrafts = baseTimes
      .filter((time) => !occupiedHHMM.has(time))
      .map((time) => {
        const start = combineDateTimeUtc(q.day!, time);

        return {
          id: null as string | null,
          startTime: start.toISOString(),
          endTime: addMinutes(start, 60).toISOString(),
          status: "DRAFT" as const,
          capacity: 1,
          maxPlayers: 3,
          virtual: true,
          timeLabel: time,
        };
      });

    const publishedBookable = realAll
      .map((slot) => {
        const eff = effectiveStatus(
          slot.status as EffStatus,
          slot.booking?.status
        );

        if (eff !== "PUBLISHED") return null;

        return {
          id: slot.id,
          startTime: new Date(slot.startTime).toISOString(),
          endTime: slot.endTime ? new Date(slot.endTime).toISOString() : null,
          status: "PUBLISHED" as const,
          capacity: slot.capacity ?? null,
          maxPlayers: slot.maxPlayers ?? null,
          virtual: false,
          timeLabel: timeLabelInAmsterdam(new Date(slot.startTime)),
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      startTime: string;
      endTime: string | null;
      status: "PUBLISHED";
      capacity: number | null;
      maxPlayers: number | null;
      virtual: false;
      timeLabel: string;
    }>;

    const slots = [...virtualDrafts, ...publishedBookable].sort(
      (a, b) => +new Date(a.startTime) - +new Date(b.startTime)
    );

    const publishedCount = items.filter((x) => x.status === "PUBLISHED").length;
    const bookedCount = items.filter((x) => x.status === "BOOKED").length;
    const draftCount = Math.max(
      0,
      baseTimes.length - (publishedCount + bookedCount)
    );

    const dayStatus = getDayStatus({
      publishedCount,
      bookedCount,
    });

    const res = NextResponse.json({
      ok: true,
      scope: "day",
      day: q.day,
      dayStatus,
      counts: {
        DRAFT: draftCount,
        PUBLISHED: publishedCount,
        BOOKED: bookedCount,
      },
      slots,
      list: slots,
      items,
    });

    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err: any) {
    console.error("[/api/slots/[partnerSlug]/list] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}