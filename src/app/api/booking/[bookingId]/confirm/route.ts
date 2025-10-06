import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Body: alle velden optioneel, we vullen alleen door wat is meegegeven
const BodySchema = z.object({
  dogAllergies: z.string().trim().max(500).optional(),
  dogFears: z.string().trim().max(500).optional(),
  // vrij tekstveld in schema -> we canonicaliseren naar een van deze waarden
  dogTrackingLevel: z
    .enum(["none", "beginner", "amateur", "pro"])
    .optional()
    .or(z.string().trim().toLowerCase().optional()), // laat desnoods alles toe, we mappen hieronder
});

/**
 * POST /api/booking/:bookingId/confirm
 * - Slaat (optioneel) hond-velden op
 * - Laat status verder ongemoeid (blijft PENDING zolang er geen Mollie is)
 * - Retourneert de volledige booking payload die je checkout nodig heeft
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await ctx.params;
    if (!bookingId) {
      return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message ?? "INVALID_BODY" },
        { status: 400 }
      );
    }

    const body = parsed.data;

    // canonicaliseer tracking level (NL labels -> interne waarde)
    const levelRaw = (body.dogTrackingLevel ?? "").toString().toLowerCase();
    const level =
      levelRaw === "nee" || levelRaw === "none" ? "none" :
      levelRaw === "beginner" ? "beginner" :
      levelRaw === "amateur" ? "amateur" :
      levelRaw === "pro" ? "pro" :
      undefined;

    const data: Record<string, any> = {};
    if (typeof body.dogAllergies === "string") data.dogAllergies = body.dogAllergies;
    if (typeof body.dogFears === "string") data.dogFears = body.dogFears;
    if (level) data.dogTrackingLevel = level;

    // Alleen updaten als er iets te updaten valt
    const updated = Object.keys(data).length
      ? await prisma.booking.update({
          where: { id: bookingId },
          data,
          include: {
            partner: { select: { id: true, name: true, feePercent: true } },
            slot: { select: { startTime: true, endTime: true } },
            customer: { select: { name: true, email: true } },
          },
        })
      : await prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            partner: { select: { id: true, name: true, feePercent: true } },
            slot: { select: { startTime: true, endTime: true } },
            customer: { select: { name: true, email: true } },
          },
        });

    if (!updated) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const payload = {
      id: updated.id,
      status: updated.status,
      partner: {
        id: updated.partner.id,
        name: updated.partner.name,
        feePercent: updated.partner.feePercent,
      },
      slot: {
        startTime: updated.slot?.startTime?.toISOString() ?? null,
        endTime: updated.slot?.endTime?.toISOString() ?? null,
      },
      playersCount: updated.playersCount,
      dogName: updated.dogName ?? null,
      dogAllergies: (updated as any).dogAllergies ?? null,
      dogFears: (updated as any).dogFears ?? null,
      dogTrackingLevel: (updated as any).dogTrackingLevel ?? null,
      customer: {
        name: updated.customer?.name ?? null,
        email: updated.customer?.email ?? "",
      },
      totalAmountCents: updated.totalAmountCents,
      depositAmountCents: updated.depositAmountCents,
      restAmountCents: updated.restAmountCents,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    const res = NextResponse.json({ ok: true, booking: payload });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err: any) {
    console.error("[POST /api/booking/:id/confirm] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
