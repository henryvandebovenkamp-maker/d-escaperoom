// PATH: src/app/api/slots/[partnerSlug]/create/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { SlotStatus } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";

const BodyByDayTime = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  publish: z.boolean().optional().default(false),
  durationMinutes: z.number().int().positive().max(24 * 60).optional().default(60),
});

const BodyByStartISO = z.object({
  startTime: z.string(),
  publish: z.boolean().optional().default(false),
  durationMinutes: z.number().int().positive().max(24 * 60).optional().default(60),
});

const BodySchema = z.union([BodyByDayTime, BodyByStartISO]);

const TZ = "Europe/Amsterdam";

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

function amsterdamDateTimeToUtc(dayISO: string, hhmm: string) {
  return fromZonedTime(`${dayISO} ${hhmm}:00`, TZ);
}

function normalizeStartTime(input: string): Date {
  const short = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input);

  if (short) {
    const [date, hm] = input.split("T");
    return amsterdamDateTimeToUtc(date, hm);
  }

  return new Date(input);
}

function startOfDayUtc(dayISO: string) {
  return fromZonedTime(`${dayISO} 00:00:00`, TZ);
}

function startOfNextDayUtc(dayISO: string) {
  return fromZonedTime(`${addDays(dayISO, 1)} 00:00:00`, TZ);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { partnerSlug } = await ctx.params;
    if (!partnerSlug) {
      return NextResponse.json({ ok: false, error: "MISSING_PARTNER" }, { status: 400 });
    }

    const partner = await prisma.partner.findUnique({
      where: { slug: partnerSlug },
      select: { id: true },
    });

    if (!partner) {
      return NextResponse.json({ ok: false, error: "PARTNER_NOT_FOUND" }, { status: 404 });
    }

    if (user.role === "PARTNER" && user.partnerId !== partner.id) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN_WRONG_PARTNER" }, { status: 403 });
    }

    const url = new URL(req.url);
    const includeDay = url.searchParams.get("includeDay") === "1";

    const bodyRaw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(bodyRaw);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "INVALID_BODY", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const publish = parsed.data.publish ?? false;
    const durationMinutes = parsed.data.durationMinutes ?? 60;

    const startTime =
      "day" in parsed.data
        ? amsterdamDateTimeToUtc(parsed.data.day, parsed.data.time)
        : normalizeStartTime(parsed.data.startTime);

    if (isNaN(startTime.getTime())) {
      return NextResponse.json({ ok: false, error: "INVALID_STARTTIME" }, { status: 400 });
    }

    const now = new Date();
    if (startTime.getTime() <= now.getTime()) {
      return NextResponse.json(
        {
          ok: false,
          error: "PAST_TIME",
          message: "Je kunt geen tijdslot aanmaken of publiceren in het verleden.",
        },
        { status: 400 }
      );
    }

    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);

    const respond = async (payload: any, status = 200) => {
      if (!includeDay) return NextResponse.json(payload, { status });

      let dayIso: string;

      if ("day" in parsed.data) {
        dayIso = parsed.data.day;
      } else {
        const formatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: TZ,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        dayIso = formatter.format(startTime);
      }

      const start = startOfDayUtc(dayIso);
      const end = startOfNextDayUtc(dayIso);

      const daySlots = await prisma.slot.findMany({
        where: {
          partnerId: partner.id,
          startTime: { gte: start, lt: end },
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

      return NextResponse.json({ ...payload, daySlots }, { status });
    };

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
      const existing = await prisma.slot.findUnique({
        where: { partnerId_startTime: { partnerId: partner.id, startTime } },
        select: { id: true, status: true, startTime: true, endTime: true },
      });

      if (!existing) {
        console.error("[slot/create] DB error:", err);
        return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
      }

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