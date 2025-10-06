// PATH: src/app/api/slots/[partnerSlug]/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";
import { z } from "zod";
import type { SlotStatus } from "@prisma/client";

/** Body:
 *  - startDate / endDate: "YYYY-MM-DD" (lokaal)
 *  - weekdays: JS-day nummers (0=zo..6=za), minimaal 1
 *  - times: "HH:MM" (bijv. "09:00"), minimaal 1
 *  - publish: altijd true (DB heeft alleen PUBLISHED/BOOKED)
 *  - optioneel: capacity, maxPlayers, durationMinutes
 */
const BodySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate moet YYYY-MM-DD zijn"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate moet YYYY-MM-DD zijn"),
  weekdays: z.array(z.number().int().min(0).max(6)).nonempty("Kies minimaal één weekdag"),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).nonempty("Kies minimaal één tijd"),
  publish: z.boolean().default(true),
  capacity: z.number().int().positive().max(99).default(1).optional(),
  maxPlayers: z.number().int().positive().max(10).default(3).optional(),
  durationMinutes: z.number().int().positive().max(24 * 60).default(60).optional(),
});

function parseYMD(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d }; // m=1..12
}
function makeLocalDate(y: number, m1_12: number, d: number, hh = 0, mm = 0) {
  return new Date(y, m1_12 - 1, d, hh, mm, 0, 0); // lokale TZ
}
function* eachDate(start: Date, end: Date) {
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const stop = new Date(end);
  stop.setHours(0, 0, 0, 0);
  while (cur <= stop) {
    yield new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    // Auth
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Next.js 15: params awaiten
    const { partnerSlug } = await ctx.params;
    const partner = await resolvePartnerForRequest(user, partnerSlug);

    // Body parsen/valideren
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const {
      startDate, endDate, weekdays, times, publish,
      capacity = 1, maxPlayers = 3, durationMinutes = 60,
    } = parsed.data;

    // Datums
    const { y: y1, m: m1, d: d1 } = parseYMD(startDate);
    const { y: y2, m: m2, d: d2 } = parseYMD(endDate);
    const from = makeLocalDate(y1, m1, d1, 0, 0);
    const to = makeLocalDate(y2, m2, d2, 23, 59);
    if (from > to) {
      return NextResponse.json({ error: "startDate moet ≤ endDate zijn" }, { status: 400 });
    }

    // Genereer gewenste slots (lokale tijd)
    const wanted: Array<{ startTime: Date; endTime: Date }> = [];
    for (const day of eachDate(from, to)) {
      if (!weekdays.includes(day.getDay())) continue; // 0=zo..6=za
      const y = day.getFullYear();
      const m = day.getMonth() + 1;
      const d = day.getDate();
      for (const t of times) {
        const [hh, mm] = t.split(":").map(Number);
        const startTime = makeLocalDate(y, m, d, hh, mm);
        const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);
        wanted.push({ startTime, endTime });
      }
    }

    if (wanted.length === 0) {
      return NextResponse.json({ error: "Geen datums/tijden in de gekozen range" }, { status: 400 });
    }

    const data = wanted.map(({ startTime, endTime }) => ({
      partnerId: partner.id,
      startTime,
      endTime,
      status: publish ? ("PUBLISHED" as SlotStatus) : ("PUBLISHED" as SlotStatus), // DB kent geen DRAFT
      capacity,
      maxPlayers,
    }));

    // ===== Schrijven met deduplicatie =====
    // Vereist in Prisma schema:
    //   @@unique([partnerId, startTime])
    // Hierdoor kunnen we skipDuplicates gebruiken.
    let createdCount = 0;
    try {
      const result = await prisma.slot.createMany({
        data,
      });
      createdCount = result.count;
    } catch (err: any) {
      // Prisma/DB duplicate errors → nette melding
      // Prisma: err.code === "P2002"
      // SQLite (via libsql/sqlite): err.message kan "UNIQUE constraint failed" bevatten
      const msg = String(err?.message ?? "");
      if (err?.code === "P2002" || msg.includes("UNIQUE constraint failed") || msg.includes("unique constraint")) {
        return NextResponse.json(
          {
            error: "Dubbele tijdsloten",
            message:
              "Een of meerdere gekozen tijdsloten bestaan al en zijn overgeslagen. Controleer de geselecteerde dagen/tijden.",
          },
          { status: 400 }
        );
      }
      // Anders: onbekende fout
      console.error("[bulk] createMany error:", err);
      return NextResponse.json({ error: "Onbekende fout bij aanmaken slots" }, { status: 500 });
    }

    const attempted = data.length;
    const skipped = attempted - createdCount;

    // Actuele stand in range ophalen (DB = bron van waarheid)
    const fresh = await prisma.slot.findMany({
      where: {
        partnerId: partner.id,
        startTime: { gte: from, lte: to },
      },
      orderBy: { startTime: "asc" },
      select: {
        id: true, startTime: true, endTime: true, status: true, capacity: true, maxPlayers: true,
      },
    });

    return NextResponse.json({
      ok: true,
      attempted,
      created: createdCount,
      skipped,
      range: { startDate, endDate },
      slots: fresh,
      note: skipped > 0
        ? "Sommige tijden bestonden al en zijn niet opnieuw aangemaakt."
        : undefined,
    });
  } catch (err: any) {
    console.error("[/api/slots/[partnerSlug]/bulk] Error:", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
