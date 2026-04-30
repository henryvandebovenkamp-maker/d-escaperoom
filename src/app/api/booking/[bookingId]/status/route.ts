// PATH: src/app/api/booking/[bookingId]/status/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { PaymentType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const Params = z.object({
  bookingId: z.string().min(10),
});

type Ctx = {
  params: Promise<{ bookingId: string }>;
};

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { bookingId } = Params.parse(await ctx.params);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        confirmedAt: true,
        depositPaidAt: true,
        emailsSentAt: true,

        payments: {
          where: {
            type: PaymentType.DEPOSIT,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            status: true,
            providerPaymentId: true,
            paidAt: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "not_found" },
        { status: 404 }
      );
    }

    const latestPayment = booking.payments[0] ?? null;

    return NextResponse.json(
      {
        id: booking.id,
        status: booking.status,
        confirmed: booking.status === "CONFIRMED",
        confirmedAt: booking.confirmedAt,
        depositPaidAt: booking.depositPaidAt,
        emailsSent: !!booking.emailsSentAt,
        emailsSentAt: booking.emailsSentAt,
        payment: latestPayment,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("[booking/status] error", err);

    return NextResponse.json(
      { error: "status_check_failed" },
      { status: 500 }
    );
  }
}