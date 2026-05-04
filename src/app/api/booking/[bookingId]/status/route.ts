// PATH: src/app/api/booking/[bookingId]/status/route.ts
import { NextResponse, type NextRequest } from "next/server";
import createMollieClient from "@mollie/api-client";
import {
  BookingStatus,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  SlotStatus,
} from "@prisma/client";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { sendBookingEmails } from "@/lib/events/booking-confirmed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const Params = z.object({
  bookingId: z.string().min(10),
});

type Ctx = {
  params: Promise<{ bookingId: string }>;
};

function mollie() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY ontbreekt");

  return createMollieClient({ apiKey });
}

function toJsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function mapStatus(status?: string): PaymentStatus {
  switch (status) {
    case "open":
    case "pending":
      return PaymentStatus.PENDING;
    case "paid":
      return PaymentStatus.PAID;
    case "failed":
      return PaymentStatus.FAILED;
    case "canceled":
      return PaymentStatus.CANCELED;
    case "refunded":
    case "charged_back":
      return PaymentStatus.REFUNDED;
    case "expired":
    default:
      return PaymentStatus.FAILED;
  }
}

async function syncLatestMolliePayment(bookingId: string) {
  const latestPayment = await prisma.payment.findFirst({
    where: {
      bookingId,
      provider: PaymentProvider.MOLLIE,
      type: PaymentType.DEPOSIT,
      providerPaymentId: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      providerPaymentId: true,
    },
  });

  if (!latestPayment?.providerPaymentId) return;

  const molliePayment = await mollie().payments.get(
    latestPayment.providerPaymentId
  );

  const mappedStatus = mapStatus(molliePayment.status);

  const paidAt = (molliePayment as any)?.paidAt
    ? new Date((molliePayment as any).paidAt)
    : null;

  const amountCents = molliePayment.amount?.value
    ? Math.round(Number(molliePayment.amount.value) * 100)
    : 0;

  const currency = molliePayment.amount?.currency ?? "EUR";
  const rawPayload = toJsonSafe(molliePayment);

  await prisma.payment.update({
    where: { id: latestPayment.id },
    data: {
      status: mappedStatus,
      method: (molliePayment as any)?.method ?? null,
      rawPayload,
      currency,
      amountCents,
      paidAt,
    },
  });

  if (molliePayment.status !== "paid") return;

  let justConfirmed = false;

  await prisma.$transaction(async (tx) => {
    const freshBooking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        slotId: true,
        slot: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!freshBooking) return;
    if (freshBooking.status === BookingStatus.CONFIRMED) return;
    if (freshBooking.status !== BookingStatus.PENDING) return;
    if (!freshBooking.slot) return;

    if (
      freshBooking.slot.status !== SlotStatus.PUBLISHED &&
      freshBooking.slot.status !== SlotStatus.BOOKED
    ) {
      return;
    }

    await tx.booking.update({
      where: { id: freshBooking.id },
      data: {
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
        depositPaidAt: paidAt ?? new Date(),
      },
    });

    await tx.slot.update({
      where: { id: freshBooking.slot.id },
      data: {
        status: SlotStatus.BOOKED,
        bookedAt: new Date(),
      },
    });

    justConfirmed = true;
  });

  if (justConfirmed) {
    await sendBookingEmails(bookingId, { includePartner: true });
  }
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { bookingId } = Params.parse(await ctx.params);

    await syncLatestMolliePayment(bookingId);

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
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const latestPayment = booking.payments[0] ?? null;

    return NextResponse.json(
      {
        id: booking.id,
        status: booking.status,
        confirmed: booking.status === BookingStatus.CONFIRMED,
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