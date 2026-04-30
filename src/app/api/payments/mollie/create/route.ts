// PATH: src/app/api/payments/mollie/create/route.ts
import { NextResponse } from "next/server";
import createMollieClient from "@mollie/api-client";
import {
  BookingStatus,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  SlotStatus,
} from "@prisma/client";

import prisma from "@/lib/prisma";
import { APP_ORIGIN } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PENDING_BOOKING_TTL_MINUTES = 15;

function mollie() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY ontbreekt");
  return createMollieClient({ apiKey });
}

function isExpiredPendingBooking(booking: { createdAt: Date }) {
  return (
    Date.now() >
    booking.createdAt.getTime() + PENDING_BOOKING_TTL_MINUTES * 60 * 1000
  );
}

function toMollieAmountValue(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json(
        { ok: false, error: "bookingId ontbreekt" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        partner: { select: { name: true } },
        slot: { select: { id: true, status: true } },
        payments: {
          where: {
            provider: PaymentProvider.MOLLIE,
            type: PaymentType.DEPOSIT,
            status: {
              in: [
                PaymentStatus.CREATED,
                PaymentStatus.PENDING,
                PaymentStatus.PAID,
              ],
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!booking || !booking.partner || !booking.slot) {
      return NextResponse.json(
        { ok: false, error: "Boeking niet gevonden" },
        { status: 404 }
      );
    }

    if (booking.status !== BookingStatus.PENDING) {
      return NextResponse.json(
        { ok: false, error: "Deze boeking kan niet meer betaald worden" },
        { status: 409 }
      );
    }

    if (isExpiredPendingBooking(booking)) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          ok: false,
          error:
            "Deze tijdelijke reservering is verlopen. Kies het tijdslot opnieuw.",
        },
        { status: 409 }
      );
    }

    /**
     * Belangrijk:
     * Sommige flows zetten het slot al op BOOKED zodra de pending booking is aangemaakt.
     * Dan mag deze betaling WEL starten voor deze eigen pending booking.
     */
    if (
      booking.slot.status !== SlotStatus.PUBLISHED &&
      booking.slot.status !== SlotStatus.BOOKED
    ) {
      return NextResponse.json(
        { ok: false, error: "Dit tijdslot is niet meer beschikbaar" },
        { status: 409 }
      );
    }

    const confirmedBookingForSlot = await prisma.booking.findFirst({
      where: {
        slotId: booking.slot.id,
        status: BookingStatus.CONFIRMED,
        id: { not: booking.id },
      },
      select: { id: true },
    });

    if (confirmedBookingForSlot) {
      return NextResponse.json(
        { ok: false, error: "Dit tijdslot is inmiddels geboekt" },
        { status: 409 }
      );
    }

    const existingPayment = booking.payments[0];

    if (existingPayment?.status === PaymentStatus.PAID) {
      return NextResponse.json(
        { ok: false, error: "Deze boeking is al betaald" },
        { status: 409 }
      );
    }

    const amountCents = Number(booking.depositAmountCents);
    const currency = booking.currency || "EUR";

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        { ok: false, error: "Ongeldig aanbetalingsbedrag" },
        { status: 400 }
      );
    }

    const origin = APP_ORIGIN || "https://d-escaperoom.com";

    const payment = await mollie().payments.create({
      amount: {
        currency,
        value: toMollieAmountValue(amountCents),
      },
      description: `Aanbetaling D-EscapeRoom - ${booking.partner.name}`,
      redirectUrl: `${origin}/checkout/${booking.id}/return`,
      webhookUrl: `${origin}/api/payments/mollie/webhook`,
      metadata: {
        bookingId: booking.id,
      },
    });

    const checkoutUrl = payment._links?.checkout?.href;

    if (!checkoutUrl) {
      return NextResponse.json(
        { ok: false, error: "Geen checkout URL ontvangen van Mollie" },
        { status: 502 }
      );
    }

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: PaymentProvider.MOLLIE,
        type: PaymentType.DEPOSIT,
        status: PaymentStatus.CREATED,
        currency,
        amountCents,
        providerPaymentId: payment.id,
        rawPayload: payment as any,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        url: checkoutUrl,
        paymentId: payment.id,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("[mollie/create] error", err);

    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Kon betaling niet starten",
      },
      { status: 500 }
    );
  }
}