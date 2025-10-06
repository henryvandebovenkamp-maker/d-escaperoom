// PATH: src/app/api/slots/month/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

/** Query params */
const Query = z.object({
  partner: z.string().min(1, "partner slug is verplicht"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
  /** Default 12 (09..20) */
  capacityPerDay: z.coerce.number().int().positive().default(12),
  /** Alleen voor lokale dag-aggregatie; default Europe/Amsterdam */
  tz: z.string().default("Europe/Amsterdam"),
});

/** Helpers voor TZ-robuste datum/tijd */
function toLocalISODate(d: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d); // "YYYY-MM-DD"
}

function getLocalHour(d: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  });
  return parseInt(fmt.format(d), 10); // 0..23
}

/** UTC range die de hele lokale maand dekt */
function monthUtcRange(monthISO: string) {
  const [Y, M] = monthISO.split("-").map((v) => parseInt(v, 10));
  // Inclusief: 1e dag 00:00:00.000Z
  const startUTC = new Date(Date.UTC(Y, M - 1, 1, 0, 0, 0, 0));
  // Exclusief: 1e dag van volgende maand 00:00:00.000Z
  const endUTC = new Date(Date.UTC(Y, M, 1, 0, 0, 0, 0));
  return { startUTC, endUTC };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parse = Query.safeParse({
      partner: url.searchParams.get("partner"),
      month: url.searchParams.get("month"),
      capacityPerDay: url.searchParams.get("capacityPerDay") ?? undefined,
      tz: url.searchParams.get("tz") ?? undefined,
    });
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({ error: parse.error.flatten() }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }
    const { partner, month, capacityPerDay, tz } = parse.data;

    // DB-range voor alle slots binnen de maand
    const { startUTC, endUTC } = monthUtcRange(month);

    // Haal alle slots op (status + startTime genoeg)
    const slots = await prisma.slot.findMany({
      where: {
        partner: { slug: partner },
        startTime: { gte: startUTC, lt: endUTC },
      },
      select: { startTime: true, status: true },
      orderBy: { startTime: "asc" },
    });

    // Tellen per lokale dag (alleen uren 09..20)
    type DayAgg = { published: number; booked: number };
    const byLocalDay = new Map<string, DayAgg>();

    for (const s of slots) {
      const localHour = getLocalHour(s.startTime, tz);
      if (localHour < 9 || localHour > 20) continue; // guard: tel alleen 09..20

      const day = toLocalISODate(s.startTime, tz); // "YYYY-MM-DD" in TZ
      const entry = byLocalDay.get(day) ?? { published: 0, booked: 0 };
      if (s.status === "PUBLISHED") entry.published += 1;
      if (s.status === "BOOKED") entry.booked += 1;
      byLocalDay.set(day, entry);
    }

    // Complete maandlijst opbouwen (ook dagen zonder slots)
    const firstOfMonthUTC = new Date(`${month}-01T00:00:00Z`);
    const Y = firstOfMonthUTC.getUTCFullYear();
    const M = firstOfMonthUTC.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate();

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const utcNoon = new Date(Date.UTC(Y, M, d, 12, 0, 0)); // 12:00 UTC -> stabiel
      const date = toLocalISODate(utcNoon, tz);
      const agg = byLocalDay.get(date) ?? { published: 0, booked: 0 };

      const G = Math.max(0, agg.published);
      const P = Math.max(0, agg.booked);
      const O = Math.max(0, capacityPerDay - (G + P)); // ORANJE = rest

      days.push({
        date,                    // "YYYY-MM-DD" (lokale dag)
        draftCount: O,           // ORANJE (beschikbaar/draft)
        publishedCount: G,       // GROEN  (boekbaar)
        bookedCount: P,          // PAARS  (geboekt)
        hasDraft: O > 0,
        hasPublished: G > 0,
        hasBooked: P > 0,
        capacityPerDay,
      });
    }

    return NextResponse.json({ days, meta: { partner, month, tz, capacityPerDay } });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
