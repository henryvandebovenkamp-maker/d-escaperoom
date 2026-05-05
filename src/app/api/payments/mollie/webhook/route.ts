// PATH: src/app/api/payments/mollie/webhook/route.ts
import { NextResponse, type NextRequest } from "next/server";
import createMollieClient from "@mollie/api-client";
import {
  BookingStatus,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  SlotStatus,
  Prisma,
} from "@prisma/client";

import prisma from "@/lib/prisma";
import { sendBookingEmails } from "@/lib/events/booking-confirmed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type MolliePaymentLike = {
  id: string;
  status?: string;
  method?: string | null;
  paidAt?: string | null;
  metadata?: {
    bookingId?: string;
  } | null;
  amount?: {
    value?: string;
    currency?: string;
  };
};

function mollie() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY ontbreekt");

  return createMollieClient({ apiKey });
}

function toJsonSafe(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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

function isDeadPayment(status?: string) {
  return status === "failed" || status === "canceled" || status === "expired";
}

function amountToCents(value?: string) {
  if (!value) return 0;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;

  return Math.round(parsed * 100);
}

async function getMolliePaymentId(req: NextRequest) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    return (new URLSearchParams(text).get("id") || "").trim();
  }

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as {
      id?: unknown;
      paymentId?: unknown;
      payment_id?: unknown;
    } | null;

    return String(body?.id ?? body?.paymentId ?? body?.payment_id ?? "").trim();
  }

  const formData = await req.formData().catch(() => null);
  return String(formData?.get("id") ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const paymentId = await getMolliePaymentId(req);

    if (!paymentId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const molliePayment = (await mollie().payments.get(
      paymentId
    )) as unknown as MolliePaymentLike;

    const bookingId = molliePayment.metadata?.bookingId ?? null;
    const mappedStatus = mapStatus(molliePayment.status);
    const paidAt = molliePayment.paidAt ? new Date(molliePayment.paidAt) : null;
    const amountCents = amountToCents(molliePayment.amount?.value);
    const currency = molliePayment.amount?.currency ?? "EUR";
    const method = molliePayment.method ?? null;
    const rawPayload = toJsonSafe(molliePayment);

    if (!bookingId) {
      console.warn("[mollie/webhook] payment zonder bookingId metadata", {
        paymentId: molliePayment.id,
        status: molliePayment.status,
      });

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    let justConfirmed = false;
    let bookingForEmailId: string | null = null;

    await prisma.$transaction(
      async (tx) => {
        const booking = await tx.booking.findUnique({
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

        if (!booking) {
          console.warn("[mollie/webhook] booking niet gevonden", {
            bookingId,
            paymentId: molliePayment.id,
          });

          return;
        }

        await tx.payment.upsert({
          where: { providerPaymentId: molliePayment.id },
          create: {
            bookingId: booking.id,
            provider: PaymentProvider.MOLLIE,
            type: PaymentType.DEPOSIT,
            status: mappedStatus,
            providerPaymentId: molliePayment.id,
            method,
            rawPayload,
            currency,
            amountCents,
            paidAt,
          },
          update: {
            bookingId: booking.id,
            status: mappedStatus,
            method,
            rawPayload,
            currency,
            amountCents,
            paidAt,
          },
        });

        if (isDeadPayment(molliePayment.status)) {
          if (booking.status === BookingStatus.PENDING) {
            await tx.booking.update({
              where: { id: booking.id },
              data: {
                status: BookingStatus.CANCELLED,
                cancelledAt: new Date(),
              },
            });

            await tx.slot.update({
              where: { id: booking.slotId },
              data: {
                status: SlotStatus.PUBLISHED,
                bookedAt: null,
              },
            });
          }

          return;
        }

        if (molliePayment.status !== "paid") {
          return;
        }

        if (booking.status === BookingStatus.CONFIRMED) {
          return;
        }

        if (booking.status !== BookingStatus.PENDING) {
          console.warn("[mollie/webhook] betaalde betaling voor niet-PENDING booking", {
            bookingId: booking.id,
            bookingStatus: booking.status,
            paymentId: molliePayment.id,
          });

          return;
        }

        if (!booking.slot) {
          console.warn("[mollie/webhook] booking zonder slot", {
            bookingId: booking.id,
            paymentId: molliePayment.id,
          });

          return;
        }

        if (
          booking.slot.status !== SlotStatus.PUBLISHED &&
          booking.slot.status !== SlotStatus.BOOKED
        ) {
          console.warn("[mollie/webhook] slot niet beschikbaar voor bevestiging", {
            bookingId: booking.id,
            slotId: booking.slot.id,
            slotStatus: booking.slot.status,
            paymentId: molliePayment.id,
          });

          return;
        }

        const updatedBooking = await tx.booking.updateMany({
          where: {
            id: booking.id,
            status: BookingStatus.PENDING,
          },
          data: {
            status: BookingStatus.CONFIRMED,
            confirmedAt: new Date(),
            depositPaidAt: paidAt ?? new Date(),
          },
        });

        if (updatedBooking.count !== 1) {
          return;
        }

        await tx.slot.update({
          where: { id: booking.slot.id },
          data: {
            status: SlotStatus.BOOKED,
            bookedAt: new Date(),
          },
        });

        justConfirmed = true;
        bookingForEmailId = booking.id;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    if (justConfirmed && bookingForEmailId) {
      await sendBookingEmails(bookingForEmailId, { includePartner: true });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("[mollie/webhook] error", err);

    return NextResponse.json({ ok: true }, { status: 200 });
  }
}