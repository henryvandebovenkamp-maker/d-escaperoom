import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await ctx.params;
    if (!bookingId) {
      return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        partner:  { select: { id: true, name: true, feePercent: true } },
        slot:     { select: { startTime: true, endTime: true } },
        customer: { select: { name: true, email: true } },
        discountCode: {
          select: { code: true, type: true, percent: true, amountCents: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // Tip: zolang Prisma types nog stale zijn kun je onderstaande 3 velden via `as any` casten.
    const b: any = booking;

    const json = {
      id: booking.id,
      status: booking.status,
      partner: booking.partner, // { id, name, feePercent }
      slot: {
        startTime: booking.slot?.startTime?.toISOString() ?? null,
        endTime: booking.slot?.endTime?.toISOString() ?? null,
      },
      playersCount: booking.playersCount,

      // Hond-velden (optioneel in DB)
      dogName: booking.dogName ?? null,
      dogAllergies: (b.dogAllergies ?? null) as string | null,
      dogFears: (b.dogFears ?? null) as string | null,
      dogTrackingLevel: (b.dogTrackingLevel ?? null) as
        | "NONE"
        | "BEGINNER"
        | "AMATEUR"
        | "PRO"
        | null,

      // Klant
      customer: booking.customer, // { name, email }

      // Prijzen
      totalAmountCents: booking.totalAmountCents,
      depositAmountCents: booking.depositAmountCents,
      restAmountCents: booking.restAmountCents,

      // Korting (optioneel)
      discount: booking.discountCode
        ? {
            code: booking.discountCode.code,
            type: booking.discountCode.type,
            percent: booking.discountCode.percent,
            amountCents: booking.discountCode.amountCents,
            appliedCents: booking.discountAmountCents ?? 0,
          }
        : null,

      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };

    const res = NextResponse.json(json, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err: any) {
    console.error("[GET /api/booking/[bookingId]] error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: err?.message },
      { status: 500 }
    );
  }
}
