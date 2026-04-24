// PATH: src/app/api/payments/mollie/webhook/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import createMollieClient from "@mollie/api-client";
import {
  PaymentStatus,
  PaymentProvider,
  PaymentType,
  SlotStatus,
  BookingStatus,
} from "@prisma/client";

import { sendBookingEmails } from "@/lib/events/booking-confirmed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mollie() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY ontbreekt");

  return createMollieClient({ apiKey });
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

async function getMolliePaymentId(req: NextRequest) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    return (new URLSearchParams(text).get("id") || "").trim();
  }

  if (contentType.includes("application/json")) {
    const body = await req.json();
    return (body?.id || body?.paymentId || body?.payment_id || "")
      .toString()
      .trim();
  }

  const formData = await req.formData();
  return (formData.get("id") || "").toString().trim();
}

export async function POST(req: NextRequest) {
  try {
    const paymentId = await getMolliePaymentId(req);

    if (!paymentId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const molliePayment = await mollie().payments.get(paymentId);

    const bookingId = (molliePayment.metadata as any)?.bookingId as
      | string
      | undefined;

    const mappedStatus = mapStatus(molliePayment.status);

    const paidAt = (molliePayment as any)?.paidAt
      ? new Date((molliePayment as any).paidAt)
      : undefined;

    const amountCents = molliePayment.amount?.value
      ? Math.round(Number(molliePayment.amount.value) * 100)
      : 0;

    const currency = molliePayment.amount?.currency ?? "EUR";
    const rawPayload = JSON.parse(JSON.stringify(molliePayment));

    if (!bookingId) {
      console.warn("[mollie/webhook] payment zonder bookingId metadata", {
        paymentId: molliePayment.id,
        status: molliePayment.status,
      });

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        slotId: true,
      },
    });

    if (!booking) {
      console.warn("[mollie/webhook] booking niet gevonden", {
        bookingId,
        paymentId: molliePayment.id,
      });

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    await prisma.payment.upsert({
      where: { providerPaymentId: molliePayment.id },
      create: {
        bookingId: booking.id,
        provider: PaymentProvider.MOLLIE,
        type: PaymentType.DEPOSIT,
        status: mappedStatus,
        providerPaymentId: molliePayment.id,
        method: (molliePayment as any)?.method ?? undefined,
        rawPayload,
        currency,
        amountCents,
        paidAt,
      },
      update: {
        bookingId: booking.id,
        status: mappedStatus,
        method: (molliePayment as any)?.method ?? undefined,
        rawPayload,
        currency,
        amountCents,
        paidAt,
      },
    });

    if (molliePayment.status !== "paid") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    let justConfirmed = false;

    await prisma.$transaction(async (tx) => {
      const freshBooking = await tx.booking.findUnique({
        where: { id: booking.id },
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

      // Al bevestigd? Dan niets opnieuw doen.
      if (freshBooking.status === BookingStatus.CONFIRMED) {
        return;
      }

      // Belangrijk:
      // Alleen PENDING bookings mogen naar CONFIRMED.
      // CANCELLED/EXPIRED/andere statussen niet alsnog bevestigen.
      if (freshBooking.status !== BookingStatus.PENDING) {
        console.warn("[mollie/webhook] paid payment voor niet-PENDING booking", {
          bookingId: freshBooking.id,
          bookingStatus: freshBooking.status,
          paymentId: molliePayment.id,
        });

        return;
      }

      if (!freshBooking.slot) {
        console.warn("[mollie/webhook] booking zonder slot", {
          bookingId: freshBooking.id,
          paymentId: molliePayment.id,
        });

        return;
      }

      if (freshBooking.slot.status === SlotStatus.BOOKED) {
        console.warn("[mollie/webhook] slot is al BOOKED", {
          bookingId: freshBooking.id,
          slotId: freshBooking.slot.id,
          paymentId: molliePayment.id,
        });

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
      await sendBookingEmails(booking.id, { includePartner: true });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[mollie/webhook] error", err);

    return NextResponse.json({ ok: true }, { status: 200 });
  }
}