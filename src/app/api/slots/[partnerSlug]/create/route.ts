// PATH: src/app/api/slots/[partnerSlug]/create/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { SlotStatus } from "@prisma/client";

/* ============================
   Zod: twee body-varianten
============================ */
const BodyByDayTime = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),   // "2025-10-17"
  time: z.string().regex(/^\d{2}:\d{2}$/),        // "09:00"
  publish: z.boolean().optional().default(false),
  durationMinutes: z.number().int().positive().max(24 * 60).optional().default(60),
});

const BodyByStartISO = z.object({
  startTime: z.string(),                           // "2025-10-17T09:00" of volledige ISO
  publish: z.boolean().optional().default(false),
  durationMinutes: z.number().int().positive().max(24 * 60).optional().default(60),
});

const BodySchema = z.union([BodyByDayTime, BodyByStartISO]);

/* ============================
   Helpers (Europe/Amsterdam)
============================ */
const TZ = "Europe/Amsterdam";

/** Interpreteer "YYYY-MM-DDTHH:mm" als Amsterdam-wandkloktijd en geef juiste UTC-instant terug. */
function fromAmsterdamLocal(ymd: string, hm: string) {
  const base = `${ymd}T${hm}:00`;
  // Trick: parse als Date en herinterpreteer die als TZ=Amsterdam
  // Dit levert een Date op die exact de Amsterdam-tijd representeert als UTC-instant.
  return new Date(new Date(base).toLocaleString("en-US", { timeZone: TZ }));
}

/** Interpreteer "YYYY-MM-DD" + "HH:mm" in Amsterdam-tijd. */
function toUtcFromDayTime(dayISO: string, hhmm: string) {
  return fromAmsterdamLocal(dayISO, hhmm);
}

/** Normaliseer startTime string:
 * - Als "YYYY-MM-DDTHH:mm" (zonder Z/offset): interpreteer als Amsterdam-tijd
 * - Anders: laat Date zelf parsen (ISO met offset/Z blijft werken)
 */
function normalizeStartTime(input: string) {
  const looksLikeShort = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input);
  if (looksLikeShort) {
    const [date, hm] = input.split("T");
    return fromAmsterdamLocal(date, hm);
  }
  return new Date(input);
}

/** Randen van de dag in Amsterdam-tijd voor een gegeven datum (UTC instant). */
function tzDayRangeAmsterdam(d: Date) {
  // Pak Y-M-D in Amsterdam via formatter (DST-proof).
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const [y, m, day] = fmt.format(d).split("-"); // "YYYY-MM-DD"
  const start = fromAmsterdamLocal(`${y}-${m}-${day}`, "00:00");
  const end = fromAmsterdamLocal(`${y}-${m}-${day}`, "23:59");
  return { start, end };
}

/* ============================
   Route
============================ */
export async function POST(
  req: Request,
  { params }: { params: { partnerSlug: string } }
) {
  try {
    // Auth
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const { partnerSlug } = params;
    if (!partnerSlug) return NextResponse.json({ ok: false, error: "MISSING_PARTNER" }, { status: 400 });

    const partner = await prisma.partner.findUnique({
      where: { slug: partnerSlug },
      select: { id: true },
    });
    if (!partner) return NextResponse.json({ ok: false, error: "PARTNER_NOT_FOUND" }, { status: 404 });

    // Role guard
    if (user.role === "PARTNER" && user.partnerId !== partner.id) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN_WRONG_PARTNER" }, { status: 403 });
    }

    // Query param: includeDay=1 → dagoverzicht meesturen
    const url = new URL(req.url);
    const includeDay = url.searchParams.get("includeDay") === "1";

    // Body
    const bodyRaw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_BODY", issues: parsed.error.flatten() }, { status: 400 });
    }

    const publish = parsed.data.publish ?? false;
    const durationMinutes = parsed.data.durationMinutes ?? 60;

    const startTime =
      "day" in parsed.data
        ? toUtcFromDayTime(parsed.data.day, parsed.data.time)            // ✅ Amsterdam → juiste UTC instant
        : normalizeStartTime(parsed.data.startTime);                     // ✅ korte vorm = Amsterdam

    if (isNaN(startTime.getTime())) {
      return NextResponse.json({ ok: false, error: "INVALID_STARTTIME" }, { status: 400 });
    }

    // Niet in het verleden (ook vandaag maar al geweest)
    const now = new Date();
    if (startTime.getTime() <= now.getTime()) {
      return NextResponse.json(
        { ok: false, error: "PAST_TIME", message: "Je kunt geen tijdslot aanmaken of publiceren in het verleden." },
        { status: 400 }
      );
    }

    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);

    // Helper: response met optioneel dagoverzicht
    const respond = async (payload: any, status = 200) => {
      if (!includeDay) return NextResponse.json(payload, { status });

      // ✅ Gebruik Amsterdam-dagrand, niet pure UTC
      const { start, end } = tzDayRangeAmsterdam(startTime);

      const daySlots = await prisma.slot.findMany({
        where: {
          partnerId: partner.id,
          startTime: { gte: start, lte: end },
        },
        orderBy: { startTime: "asc" },
        select: {
          id: true, startTime: true, endTime: true, status: true, capacity: true, maxPlayers: true,
        },
      });

      return NextResponse.json({ ...payload, daySlots }, { status });
    };

    // Creëer (idempotent: duplicate → geen error)
    try {
      const created = await prisma.slot.create({
        data: {
          partnerId: partner.id,
          startTime,
          endTime,
          status: publish ? SlotStatus.PUBLISHED : SlotStatus.DRAFT,
        },
        select: { id: true, startTime: true, endTime: true, status: true },
      });

      return await respond(
        {
          ok: true,
          created: true,
          alreadyExisted: false,
          promotedFromDraft: 0,
          slot: {
            id: created.id,
            startTime: created.startTime.toISOString(),
            endTime: created.endTime.toISOString(),
            status: created.status,
          },
          message: "Tijdslot aangemaakt.",
        },
        201
      );
    } catch (err: any) {
      // Waarschijnlijk unique-constraint → haal bestaande op en handel af
      const existing = await prisma.slot.findUnique({
        where: { partnerId_startTime: { partnerId: partner.id, startTime } },
        select: { id: true, status: true, startTime: true, endTime: true },
      });

      if (!existing) {
        console.error("[slot/create] DB error:", err);
        return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
      }

      // Promotiepad (DRAFT → PUBLISHED), nog steeds geen verleden toestaan
      if (publish && existing.status === SlotStatus.DRAFT) {
        if (existing.startTime.getTime() <= now.getTime()) {
          return await respond(
            {
              ok: false,
              created: false,
              alreadyExisted: true,
              promotedFromDraft: 0,
              slot: {
                id: existing.id,
                startTime: existing.startTime.toISOString(),
                endTime: (existing.endTime ?? existing.startTime).toISOString(),
                status: existing.status,
              },
              message: "Slot bestaat al en ligt in het verleden; niet gepubliceerd.",
            },
            400
          );
        }

        const res = await prisma.slot.update({
          where: { id: existing.id },
          data: { status: SlotStatus.PUBLISHED },
          select: { id: true, status: true, startTime: true, endTime: true },
        });

        return await respond(
          {
            ok: true,
            created: false,
            alreadyExisted: true,
            promotedFromDraft: 1,
            slot: {
              id: res.id,
              startTime: res.startTime.toISOString(),
              endTime: res.endTime.toISOString(),
              status: res.status,
            },
            message: "Bestaand conceptslot gepubliceerd.",
          },
          200
        );
      }

      // Bestond al (PUBLISHED/BOOKED of publish=false) → stil OK
      return await respond(
        {
          ok: true,
          created: false,
          alreadyExisted: true,
          promotedFromDraft: 0,
          slot: {
            id: existing.id,
            startTime: existing.startTime.toISOString(),
            endTime: (existing.endTime ?? existing.startTime).toISOString(),
            status: existing.status,
          },
          message: "Dit tijdslot bestond al — niets gewijzigd.",
        },
        200
      );
    }
  } catch (err: any) {
    console.error("create route error", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
