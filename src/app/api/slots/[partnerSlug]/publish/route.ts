// PATH: src/app/api/slots/[partnerSlug]/publish/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SlotStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";
import { z } from "zod";

const BodySchema = z
  .object({
    slotId: z.string().uuid().optional(),

    startTimeISO: z.string().datetime({ offset: true }).optional(),
    endTimeISO: z.string().datetime({ offset: true }).optional(),
    durationMinutes: z.coerce.number().int().positive().max(24 * 60).default(60),

    capacity: z.coerce.number().int().positive().max(99).default(1),
    maxPlayers: z.coerce.number().int().positive().max(10).default(3),
  })
  .superRefine((val, ctx) => {
    if (!val.slotId && !val.startTimeISO) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTimeISO"],
        message: "startTimeISO is verplicht wanneer slotId ontbreekt.",
      });
    }
  });

function parseValidDate(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Ongeldige datum/tijd.");
  }

  return date;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partnerSlug } = await ctx.params;
    const partner = await resolvePartnerForRequest(user, partnerSlug);

    const bodyRaw = await req.json();
    const body = BodySchema.parse(bodyRaw);

    if (body.slotId) {
      const existing = await prisma.slot.findFirst({
        where: {
          id: body.slotId,
          partnerId: partner.id,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Slot not found for this partner" },
          { status: 404 }
        );
      }

      if (existing.status === SlotStatus.BOOKED) {
        return NextResponse.json(
          { error: "Cannot publish a booked slot" },
          { status: 400 }
        );
      }

      const slot = await prisma.slot.update({
        where: { id: existing.id },
        data: { status: SlotStatus.PUBLISHED },
      });

      return NextResponse.json({ ok: true, slot });
    }

    const start = parseValidDate(body.startTimeISO!);
    const end = body.endTimeISO
      ? parseValidDate(body.endTimeISO)
      : addMinutes(start, body.durationMinutes);

    if (end <= start) {
      return NextResponse.json(
        { error: "endTimeISO moet na startTimeISO liggen" },
        { status: 400 }
      );
    }

    const existingSameStart = await prisma.slot.findFirst({
      where: {
        partnerId: partner.id,
        startTime: start,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingSameStart) {
      if (existingSameStart.status === SlotStatus.BOOKED) {
        return NextResponse.json(
          { error: "Slot at this time is already booked" },
          { status: 400 }
        );
      }

      const slot = await prisma.slot.update({
        where: { id: existingSameStart.id },
        data: {
          endTime: end,
          capacity: body.capacity,
          maxPlayers: body.maxPlayers,
          status: SlotStatus.PUBLISHED,
        },
      });

      return NextResponse.json({ ok: true, slot });
    }

    const slot = await prisma.slot.create({
      data: {
        partnerId: partner.id,
        startTime: start,
        endTime: end,
        status: SlotStatus.PUBLISHED,
        capacity: body.capacity,
        maxPlayers: body.maxPlayers,
      },
    });

    return NextResponse.json({ ok: true, slot });
  } catch (err: unknown) {
    console.error("[/api/slots/[partnerSlug]/publish] Error:", err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validatie fout",
          details: err.issues,
        },
        { status: 400 }
      );
    }

    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}