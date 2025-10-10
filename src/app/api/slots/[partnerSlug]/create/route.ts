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
   Helpers (Europe/Amsterdam, DST-proof)
============================ */
const TZ = "Europe/Amsterdam";

/**
 * Construeer een UTC instant zó dat hij in TZ als de gewenste wandkloktijd verschijnt.
 * Dit is server-safe en werkt op Vercel/Node zonder moment/temporal.
 */
function zonedDateFromLocal(dayISO: string, hhmm: string, tz = TZ): Date {
  const [y, m, d] = dayISO.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);

  // Start met een UTC-guess op dezelfde "klok"tijd
  const utcGuess = Date.UTC(y, (m - 1), d, hh, mm, 0, 0);

  // Wat is de tijd van deze UTC-guess in de beoogde timezone?
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = dtf.formatToParts(new Date(utcGuess));
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const actualHH = parseInt(map.hour, 10);
  const actualMM = parseInt(map.minute, 10);

  // Verschil tussen gewenste kloktijd en huidige kloktijd in TZ → correctie in minuten
  const intendedMin = hh * 60 + mm;
  const actualMin = actualHH * 60 + actualMM;
  const diffMin = intendedMin - actualMin;

  return new Date(utcGuess + diffMin * 60_000);
}

/** "YYYY-MM-DDTHH:mm" zonder offset → behandel als lokale Amsterdam-tijd. */
function normalizeStartTime(input: string): Date {
  const short = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input);
  if (short) {
    const [date, hm] = input.split("T");
    return zonedDateFromLocal(date, hm, TZ);
  }
  // ISO met offset/Z blijft ondersteund
  return new Date(input);
}

/** Dag-randen (00:00–23:59) in Amsterdam voor de datum van 'd'. */
function tzDayRangeAmsterdam(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const [y, m, day] = fmt.format(d).split("-");           // "YYYY-MM-DD"
  const start = zonedDateFromLocal(`${y}-${m}-${day}`, "00:00");
  const end   = zonedDateFromLocal(`${y}-${m}-${day}`, "23:59");
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
        ? zonedDateFromLocal(parsed.data.day, parsed.data.time, TZ) // ✅ echte Amsterdam-lokaliteit → correcte UTC instant
        : normalizeStartTime(parsed.data.startTime);                 // ✅ korte vorm → Amsterdam

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

      const { start, end } = tzDayRangeAmsterdam(startTime); // ✅ dag in Amsterdam

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
