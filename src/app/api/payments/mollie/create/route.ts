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

const PENDING_BOOKING_TTL_MINUTES = 30;
const TERMS_VERSION = "2026-05";

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

function toJsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, acceptedTerms } = body;

    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json(
        { ok: false, code: "MISSING_BOOKING_ID", error: "bookingId ontbreekt" },
        { status: 400 }
      );
    }

    if (acceptedTerms !== true) {
      return NextResponse.json(
        {
          ok: false,
          code: "TERMS_NOT_ACCEPTED",
          error: "Je moet akkoord gaan met de algemene voorwaarden.",
        },
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
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!booking || !booking.partner || !booking.slot) {
      return NextResponse.json(
        { ok: false, code: "BOOKING_NOT_FOUND", error: "Boeking niet gevonden" },
        { status: 404 }
      );
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      return NextResponse.json(
        {
          ok: false,
          code: "BOOKING_ALREADY_CONFIRMED",
          error: "Deze boeking is al bevestigd",
        },
        { status: 409 }
      );
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return NextResponse.json(
        {
          ok: false,
          code: "BOOKING_CANCELLED",
          error: "Deze boeking is geannuleerd. Kies het tijdslot opnieuw.",
        },
        { status: 409 }
      );
    }

    if (booking.status !== BookingStatus.PENDING) {
      return NextResponse.json(
        {
          ok: false,
          code: "BOOKING_NOT_PAYABLE",
          error: "Deze boeking kan niet meer betaald worden",
        },
        { status: 409 }
      );
    }

    if (isExpiredPendingBooking(booking)) {
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });

        const confirmedBookingForSlot = await tx.booking.findFirst({
          where: {
            slotId: booking.slot.id,
            status: BookingStatus.CONFIRMED,
            id: { not: booking.id },
          },
          select: { id: true },
        });

        if (!confirmedBookingForSlot) {
          await tx.slot.update({
            where: { id: booking.slot.id },
            data: { status: SlotStatus.PUBLISHED },
          });
        }
      });

      return NextResponse.json(
        {
          ok: false,
          code: "BOOKING_EXPIRED",
          error:
            "Deze tijdelijke reservering is verlopen. Het tijdslot is weer vrijgegeven. Kies het tijdslot opnieuw.",
        },
        { status: 409 }
      );
    }

    if (
      booking.slot.status !== SlotStatus.PUBLISHED &&
      booking.slot.status !== SlotStatus.BOOKED
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "SLOT_NOT_AVAILABLE",
          error: "Dit tijdslot is niet meer beschikbaar",
        },
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
        {
          ok: false,
          code: "SLOT_ALREADY_CONFIRMED",
          error: "Dit tijdslot is inmiddels geboekt",
        },
        { status: 409 }
      );
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        acceptedTerms: true,
        acceptedTermsAt: new Date(),
        acceptedTermsVersion: TERMS_VERSION,
      },
    });

    const paidPayment = booking.payments.find(
      (payment) => payment.status === PaymentStatus.PAID
    );

    if (paidPayment) {
      return NextResponse.json(
        {
          ok: false,
          code: "PAYMENT_ALREADY_PAID",
          error: "Deze boeking is al betaald",
        },
        { status: 409 }
      );
    }

    const reusablePayment = booking.payments.find(
      (payment) =>
        payment.providerPaymentId &&
        (payment.status === PaymentStatus.CREATED ||
          payment.status === PaymentStatus.PENDING)
    );

    if (reusablePayment?.providerPaymentId) {
      try {
        const molliePayment = await mollie().payments.get(
          reusablePayment.providerPaymentId
        );

        const checkoutUrl = molliePayment._links?.checkout?.href;

        if (
          checkoutUrl &&
          molliePayment.status !== "expired" &&
          molliePayment.status !== "canceled" &&
          molliePayment.status !== "failed" &&
          molliePayment.status !== "paid"
        ) {
          return NextResponse.json(
            {
              ok: true,
              url: checkoutUrl,
              paymentId: molliePayment.id,
              reused: true,
            },
            {
              headers: {
                "Cache-Control": "no-store",
              },
            }
          );
        }

        await prisma.payment.update({
          where: { id: reusablePayment.id },
          data: {
            status: PaymentStatus.CANCELED,
            rawPayload: toJsonSafe(molliePayment),
          },
        });
      } catch (error) {
        console.error("[mollie/create] bestaande betaling ophalen mislukt", {
          bookingId: booking.id,
          providerPaymentId: reusablePayment.providerPaymentId,
          error,
        });

        await prisma.payment.update({
          where: { id: reusablePayment.id },
          data: {
            status: PaymentStatus.FAILED,
          },
        });
      }
    }

    const amountCents = Number(booking.depositAmountCents);
    const currency = booking.currency || "EUR";

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_DEPOSIT_AMOUNT",
          error: "Ongeldig aanbetalingsbedrag",
        },
        { status: 400 }
      );
    }

    const origin = (APP_ORIGIN || "https://www.d-escaperoom.com").replace(
      /\/$/,
      ""
    );

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
        {
          ok: false,
          code: "MOLLIE_CHECKOUT_URL_MISSING",
          error: "Geen checkout URL ontvangen van Mollie",
        },
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
        rawPayload: toJsonSafe(payment),
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
        code: "PAYMENT_CREATE_FAILED",
        error: err instanceof Error ? err.message : "Kon betaling niet starten",
      },
      { status: 500 }
    );
  }
}