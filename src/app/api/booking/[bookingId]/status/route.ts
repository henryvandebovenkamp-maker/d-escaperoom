// PATH: src/app/api/checkout/[bookingId]/status/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { bookingId: string } }
) {
  const { bookingId } = params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      slot: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const payment = booking.payments[0] ?? null;

  return NextResponse.json({
    booking: {
      id: booking.id,
      status: booking.status,
      depositPaidAt: booking.depositPaidAt,
      confirmedAt: booking.confirmedAt,
    },
    payment: payment
      ? {
        id: payment.id,
        providerPaymentId: payment.providerPaymentId,
        status: payment.status,
        method: payment.method,
        paidAt: payment.paidAt,
      }
      : null,
  });
}
