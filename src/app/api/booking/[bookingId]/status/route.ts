// PATH: src/app/api/booking/[bookingId]/status/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Params = z.object({ bookingId: z.string().min(1) });

export async function GET(_req: Request, ctx: { params: { bookingId: string } }) {
  try {
    const { bookingId } = Params.parse(ctx.params);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return NextResponse.json({ error: "Booking niet gevonden" }, { status: 404 });

    // optioneel: laatste payment-status erbij
    const latest = await prisma.payment.findFirst({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
      select: { status: true, providerPaymentId: true, paidAt: true },
    });

    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      confirmedAt: booking.confirmedAt,
      depositPaidAt: booking.depositPaidAt,
      payment: latest ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Onbekende fout" }, { status: 400 });
  }
}
