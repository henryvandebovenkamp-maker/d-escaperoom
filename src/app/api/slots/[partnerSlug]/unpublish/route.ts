import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolvePartnerForRequest } from "@/lib/partner";
import { releaseSlotIfUnpaid } from "@/lib/slots";
import { BookingStatus, SlotStatus } from "@prisma/client";

/* ================================
   Validatie
================================== */
const BodySchema = z.object({
  slotId: z.string().min(6, "slotId is required"),
  /** soft unpublish (DRAFT) = default; hardDelete = echt verwijderen */
  hardDelete: z.boolean().optional().default(false),
});

/* ================================
   Handler
================================== */
export async function POST(
  req: NextRequest,
  { params }: { params: { partnerSlug: string } }
) {
  try {
    // 1) Auth + partner
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const partner = await resolvePartnerForRequest(user, params.partnerSlug);

    // 2) Body
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { slotId, hardDelete } = parsed.data;

    // 3) Slot + eventuele (laatste) booking ophalen
    const slot = await prisma.slot.findFirst({
      where: { id: slotId, partnerId: partner.id },
      select: {
        id: true,
        status: true,
        partnerId: true,
        startTime: true,
      },
    });

    if (!slot) {
      return NextResponse.json(
        { error: "Slot not found for this partner" },
        { status: 404 }
      );
    }

    // Fetch latest booking for this slot
    const latestBooking = await prisma.booking.findFirst({
      where: { slotId: slot.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
      },
    });

    // 4) Als BOOKED: probeer eerst "onbetaalde" case vrij te geven
    if (slot.status === SlotStatus.BOOKED) {
      if (latestBooking && latestBooking.status !== BookingStatus.CONFIRMED) {
        try {
          await releaseSlotIfUnpaid(latestBooking.id);
        } catch (e) {
          // loggen maar niet direct falen: we checken zo opnieuw de status
          console.error("[unpublish] releaseSlotIfUnpaid error:", e);
        }
      }

      // Refetch om nieuwe status te zien
      const after = await prisma.slot.findUnique({
        where: { id: slot.id },
        select: { id: true, status: true },
      });

      if (after?.status === SlotStatus.BOOKED) {
        // Nog steeds bezet → blokkeren
        return NextResponse.json(
          { error: "Cannot unpublish/delete a booked slot" },
          { status: 409 }
        );
      }
    }

    // 5) Soft unpublish (default) of hard delete
    if (!hardDelete) {
      // Zet op DRAFT (niet boekbaar, wel bewaard)
      const updated = await prisma.slot.update({
        where: { id: slot.id },
        data: { status: SlotStatus.DRAFT },
        select: { id: true, status: true },
      });
      return NextResponse.json({
        ok: true,
        action: "unpublished",
        slot: updated,
      });
    }

    // 6) Hard delete: alleen verwijderen als er geen niet-geannuleerde boekingen aan hangen
    const activeBooking = await prisma.booking.findFirst({
      where: {
        slotId: slot.id,
        status: { not: BookingStatus.CANCELLED },
      },
      select: { id: true, status: true },
    });

    if (activeBooking) {
      // Veiligheidsnet: als er nog een actieve booking is, niet verwijderen
      return NextResponse.json(
        {
          error:
            "Cannot delete slot with active booking. Annuleer eerst de boeking.",
          bookingId: activeBooking.id,
          bookingStatus: activeBooking.status,
        },
        { status: 409 }
      );
    }

    await prisma.slot.delete({ where: { id: slot.id } });
    return NextResponse.json({
      ok: true,
      action: "deleted",
      slotId: slot.id,
    });
  } catch (err: any) {
    console.error("[/api/slots/[partnerSlug]/unpublish] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
