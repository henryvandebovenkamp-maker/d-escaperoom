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

const TIMEZONE = "Europe/Amsterdam";

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
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

function getWeekday(dateIso: string) {
  const { year, month, day } = parseIsoDate(dateIso);

  return new Date(year, month - 1, day).getDay();
}

function toUtcSlotTime(dateIso: string, totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return fromZonedTime(`${dateIso} ${hh}:${mm}:00`, TIMEZONE);
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    const body = BodySchema.parse(await req.json());

    const partnerBase = await resolvePartnerForRequest(user, body.partnerSlug);
    const partnerFull = await prisma.partner.findUnique({
      where: { id: partnerBase.id },
      select: { id: true, slotDurationMinutes: true, dayStartTime: true, dayEndTime: true },
    });
    const partner = partnerBase;
    const slotDurationMinutes = partnerFull?.slotDurationMinutes ?? 60;
    const dayStartMinutes = hhmmToMinutes(partnerFull?.dayStartTime ?? "09:00");
    const dayEndMinutes = hhmmToMinutes(partnerFull?.dayEndTime ?? "21:00");

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
        // Genereer non-overlappende slots van dayStartTime, slotEnd <= dayEndTime
        let startMinutes = dayStartMinutes;
        while (startMinutes + slotDurationMinutes <= dayEndMinutes) {
          const endMinutes = startMinutes + slotDurationMinutes;

          const startTime = toUtcSlotTime(currentDate, startMinutes);
          const endTime = toUtcSlotTime(currentDate, endMinutes);

          const exists = await prisma.slot.findFirst({
            where: { partnerId: partner.id, startTime },
            select: { id: true },
          });

          if (exists) {
            skippedExisting++;
          } else {
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

          startMinutes += slotDurationMinutes;
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    return NextResponse.json({
      ok: true,
      created,
      skippedExisting,
      slotDurationMinutes,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal Server Error" },
      { status: 400 }
    );
  }
}