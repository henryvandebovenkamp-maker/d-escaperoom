// PATH: src/app/api/booking/[bookingId]/status/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { BookingStatus, PaymentStatus, PaymentType } from "@prisma/client";

export const runtime = "nodejs";
const Params = z.object({ bookingId: z.string().min(10) });
type Ctx = { params: Promise<{ bookingId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { bookingId } = Params.parse(await ctx.params);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true, confirmedAt: true, emailsSentAt: true },
  });
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const paid = !!(await prisma.payment.findFirst({
    where: { bookingId, type: PaymentType.DEPOSIT, status: PaymentStatus.PAID },
    select: { id: true },
  }));

  return NextResponse.json({
    id: booking.id,
    status: booking.status,
    confirmed: !!booking.confirmedAt || booking.status === BookingStatus.CONFIRMED || paid,
    emailsSent: !!booking.emailsSentAt,
    emailsSentAt: booking.emailsSentAt,
  });
}
