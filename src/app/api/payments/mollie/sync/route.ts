// PATH: src/app/api/payments/mollie/sync/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import createMollieClient from "@mollie/api-client";
import { PaymentStatus, PaymentProvider, PaymentType, SlotStatus } from "@prisma/client";

export const runtime = "nodejs";

const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY! });

function mapPaymentStatus(s?: string): PaymentStatus {
  switch (s) {
    case "open":
    case "pending": return PaymentStatus.PENDING;
    case "paid":    return PaymentStatus.PAID;
    case "failed":  return PaymentStatus.FAILED;
    case "canceled":return PaymentStatus.CANCELED;
    case "refunded":
    case "charged_back": return PaymentStatus.REFUNDED;
    case "expired":
    default:        return PaymentStatus.FAILED;
  }
}

export async function POST(req: Request) {
  try {
    const { bookingId, providerPaymentId } = await req.json();

    // 1) Vind het lokale payment
    const paymentLocal = providerPaymentId
      ? await prisma.payment.findUnique({ where: { providerPaymentId } })
      : await prisma.payment.findFirst({
          where: { bookingId },
          orderBy: { createdAt: "desc" },
        });

    if (!paymentLocal) {
      return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
    }

    const molliePaymentId = paymentLocal.providerPaymentId;
    if (!molliePaymentId) {
      return NextResponse.json({ error: "providerPaymentId_missing" }, { status: 400 });
    }

    // 2) Haal actuele status bij Mollie
    const p = await mollie.payments.get(molliePaymentId);
    const mapped = mapPaymentStatus(p.status);
    const paidAt = (p as any)?.paidAt ? new Date((p as any).paidAt) : undefined;
    const amountCents = p.amount?.value ? Math.round(Number(p.amount.value) * 100) : undefined;
    const metaBookingId = (p.metadata as any)?.bookingId as string | undefined;
    const targetBookingId = paymentLocal.bookingId ?? metaBookingId;

    // 3) Updatet lokaal payment
    await prisma.payment.update({
      where: { id: paymentLocal.id },
      data: {
        status: mapped,
        method: (p as any)?.method ?? undefined,
        currency: p.amount?.currency ?? paymentLocal.currency,
        amountCents: amountCents ?? paymentLocal.amountCents,
        paidAt,
        rawPayload: p as any,
      },
    });

    if (!targetBookingId) {
      return NextResponse.json({ ok: true, synced: true });
    }

    // 4) Bij “paid” → booking/slot mail-flow (zoals webhook)
    const booking = await prisma.booking.findUnique({
      where: { id: targetBookingId },
      include: { slot: true },
    });

    if (booking && p.status === "paid" && !booking.confirmedAt) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          depositPaidAt: paidAt ?? new Date(),
        },
      });

      if (booking.slot && booking.slot.status !== SlotStatus.BOOKED) {
        await prisma.slot.update({
          where: { id: booking.slot.id },
          data: { status: SlotStatus.BOOKED, bookedAt: new Date() },
        });
      }
      // (Mails laat ik aan de webhook over; kan je hier ook doen indien gewenst)
    }

    return NextResponse.json({ ok: true, synced: true });
  } catch (e) {
    console.error("[mollie-sync] error", e);
    return NextResponse.json({ ok: false, error: "sync_failed" }, { status: 500 });
  }
}
