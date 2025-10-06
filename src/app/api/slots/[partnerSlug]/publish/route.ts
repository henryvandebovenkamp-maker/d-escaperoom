// PATH: src/app/api/slots/[partnerSlug]/publish/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";
import { z } from "zod";

/**
 * Input schema
 * - Kies óf een bestaand draft slot via slotId
 * - Óf maak/publiceer via startTimeISO (+ optioneel end/duration/capacities)
 */
const BodySchema = z.object({
  slotId: z.string().uuid().optional(),

  // Wanneer geen slotId is meegegeven:
  startTimeISO: z.string().datetime({ offset: true }).optional(),
  endTimeISO: z.string().datetime({ offset: true }).optional(),
  durationMinutes: z.number().int().positive().max(24 * 60).default(60).optional(),

  capacity: z.number().int().positive().max(99).default(1).optional(),
  maxPlayers: z.number().int().positive().max(10).default(3).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ⬇️ Next.js 15 dynamic params moeten ge-‘await’ worden
    const { partnerSlug } = await ctx.params;

    // ⬇️ Koppel altijd aan de juiste partner (PARTNER=altijd eigen, ADMIN=via slug)
    const partner = await resolvePartnerForRequest(user, partnerSlug);

    const bodyRaw = await req.json();
    const body = BodySchema.parse(bodyRaw);

    // Helper om endTime te bepalen
    const toDate = (iso: string) => new Date(iso);
    const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

    // === 1) Publiceer een bestaand DRAFT slot (via slotId) ===
    if (body.slotId) {
      const existing = await prisma.slot.findFirst({
        where: { id: body.slotId, partnerId: partner.id },
        select: { id: true, status: true },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Slot not found for this partner" },
          { status: 404 }
        );
      }

      // Alleen toestaan om DRAFT → PUBLISHED te zetten (BOOKED blijft met rust)
      if (existing.status === "BOOKED") {
        return NextResponse.json(
          { error: "Cannot publish a booked slot" },
          { status: 400 }
        );
      }

      const slot = await prisma.slot.update({
        where: { id: existing.id },
        data: { status: "PUBLISHED" },
      });

      return NextResponse.json({ ok: true, slot });
    }

    // === 2) Publiceer door nieuw slot aan te maken / te upserten ===
    if (!body.startTimeISO) {
      return NextResponse.json(
        { error: "startTimeISO is required when slotId is not provided" },
        { status: 400 }
      );
    }

    const start = toDate(body.startTimeISO);
    const end =
      body.endTimeISO
        ? toDate(body.endTimeISO)
        : addMinutes(start, body.durationMinutes ?? 60);

    // Optioneel: zorg dat er niet per ongeluk dubbele slots ontstaan.
    // Aanbevolen unieke index in Prisma: @@unique([partnerId, startTime])
    const existingSameStart = await prisma.slot.findFirst({
      where: { partnerId: partner.id, startTime: start },
      select: { id: true, status: true },
    });

    let slot;
    if (existingSameStart) {
      // Upgrade naar PUBLISHED (tenzij al BOOKED)
      if (existingSameStart.status === "BOOKED") {
        return NextResponse.json(
          { error: "Slot at this time is already booked" },
          { status: 400 }
        );
      }
      slot = await prisma.slot.update({
        where: { id: existingSameStart.id },
        data: {
          endTime: end,
          capacity: body.capacity ?? 1,
          maxPlayers: body.maxPlayers ?? 3,
          status: "PUBLISHED",
        },
      });
    } else {
      // Nieuw slot, direct PUBLISHED
      slot = await prisma.slot.create({
        data: {
          partnerId: partner.id,
          startTime: start,
          endTime: end,
          status: "PUBLISHED",
          capacity: body.capacity ?? 1,
          maxPlayers: body.maxPlayers ?? 3,
        },
      });
    }

    return NextResponse.json({ ok: true, slot });
  } catch (err: any) {
    console.error("[/api/slots/[partnerSlug]/publish] Error:", err);
    const msg = err?.message ?? "Internal error";
    // Geef zinnige fout door aan de client voor debugging
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
