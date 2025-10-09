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
   Helpers
============================ */
function toUtcFromDayTime(dayISO: string, hhmm: string) {
  const [y, m, d] = dayISO.split("-").map((v) => parseInt(v, 10));
  const [hh, mm] = hhmm.split(":").map((v) => parseInt(v, 10));
  // Construeer als UTC (eenduidig opslagformaat)
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
}

function normalizeStartTime(input: string) {
  // Accepteer "YYYY-MM-DDTHH:MM" (zonder Z/offset) of volledige ISO.
  // Zonder offset → behandel als lokale tijd en cast naar UTC.
  const looksLikeShort = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input);
  if (looksLikeShort) {
    const [date, hm] = input.split("T");
    return toUtcFromDayTime(date, hm);
  }
  return new Date(input);
}

function startOfUtcDay(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
function endOfUtcDay(d: Date) {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
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
        ? toUtcFromDayTime(parsed.data.day, parsed.data.time)
        : normalizeStartTime(parsed.data.startTime);

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

      const daySlots = await prisma.slot.findMany({
        where: {
          partnerId: partner.id,
          startTime: { gte: startOfUtcDay(startTime), lte: endOfUtcDay(startTime) },
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
