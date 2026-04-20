// PATH: src/app/api/slots/series/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";
import { fromZonedTime } from "date-fns-tz";

const BodySchema = z.object({
  partnerSlug: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  publish: z.boolean().optional(),
});

const FIRST_HOUR = 9;
const LAST_HOUR = 20;
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

function getWeekday(dateIso: string) {
  const { year, month, day } = parseIsoDate(dateIso);

  return new Date(year, month - 1, day).getDay();
}

function toUtcSlotDate(dateIso: string, hour: number, minute = 0) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");

  return fromZonedTime(`${dateIso} ${hh}:${mm}:00`, TIMEZONE);
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    const body = BodySchema.parse(await req.json());

    const partner = await resolvePartnerForRequest(user, body.partnerSlug);
    const weekdays = body.weekdays ?? [1, 2, 3, 4, 5, 6, 0];

    if (body.startDate > body.endDate) {
      return NextResponse.json(
        { error: "startDate mag niet na endDate liggen." },
        { status: 400 }
      );
    }

    let created = 0;
    let skippedExisting = 0;
    let currentDate = body.startDate;

    while (currentDate <= body.endDate) {
      const weekday = getWeekday(currentDate);

      if (weekdays.includes(weekday)) {
        for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour++) {
          const startTime = toUtcSlotDate(currentDate, hour, 0);
          const endTime = toUtcSlotDate(currentDate, hour + 1, 0);

          const exists = await prisma.slot.findFirst({
            where: {
              partnerId: partner.id,
              startTime,
            },
            select: { id: true },
          });

          if (exists) {
            skippedExisting++;
            continue;
          }

          await prisma.slot.create({
            data: {
              partnerId: partner.id,
              startTime,
              endTime,
              status: body.publish ? "PUBLISHED" : "DRAFT",
              capacity: 1,
              maxPlayers: 3,
            },
          });

          created++;
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    return NextResponse.json({
      ok: true,
      created,
      skippedExisting,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal Server Error" },
      { status: 400 }
    );
  }
}