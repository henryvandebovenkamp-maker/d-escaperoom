export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mollie } from "@/lib/mollie";
import { BookingStatus, PaymentStatus, PaymentProvider, PaymentType, SlotStatus } from "@prisma/client";
import { releaseSlotIfUnpaid } from "@/lib/slots";

/* ================================
   Helpers
================================== */

// Mollie → eigen PaymentStatus mapping (alle relevante statussen)
const MOLLIE_TO_PAYMENT: Record<string, PaymentStatus> = {
  created:   PaymentStatus.PENDING,
  open:      PaymentStatus.PENDING,
  pending:   PaymentStatus.PENDING,
  authorized:PaymentStatus.PAID,     // (komt zelden terug bij gewone payments)
  paid:      PaymentStatus.PAID,
  failed:    PaymentStatus.FAILED,
  canceled:  PaymentStatus.CANCELED,
  expired:   PaymentStatus.CANCELED, // je kunt ook eigen EXPIRED enum hebben
  refunded:  PaymentStatus.REFUNDED,
  charged_back: PaymentStatus.FAILED,
};

const isTerminal = (s: PaymentStatus) =>
  s === PaymentStatus.PAID ||
  s === PaymentStatus.FAILED ||
  s === PaymentStatus.CANCELED ||
  s === PaymentStatus.REFUNDED;

/** Terminal & niet-betaald vanuit Mollie */
function isTerminalUnpaidMollie(status?: string) {
  return status === "failed" || status === "canceled" || status === "expired" || status === "charged_back";
}

/** Safe JSON voor Prisma Json veld */
function safeJson(obj: unknown) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return undefined;
  }
}

/* ================================
   POST /api/payments/refresh
   Body: { bookingId: string }
================================== */
export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ ok: false, error: "bookingId ontbreekt" }, { status: 400 });
    }

    // Haal booking + laatste DEPOSIT payments op
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        slot: true,
        payments: {
          where: { type: PaymentType.DEPOSIT },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!booking) {
      return NextResponse.json({ ok: false, error: "Booking niet gevonden" }, { status: 404 });
    }

    // Als er geen deposit bekend is → beschouw als onbetaald en vrijgeven (failsafe)
    if (!booking.payments.length) {
      await releaseSlotIfUnpaid(booking.id);
      return NextResponse.json({
        ok: true,
        refreshed: 0,
        terminal: true,
        released: true,
        booking: { id: booking.id, status: BookingStatus.CANCELLED },
        payment: null,
      });
    }

    // Verwerk ALLE deposit payments (meestal 1, maar toch robuust)
    let refreshed = 0;
    let anyPaid = false;
    let lastPaymentUpdated = booking.payments[0]; // meest recente

    for (const p of booking.payments) {
      let newStatus = p.status;

      if (p.provider === PaymentProvider.MOLLIE && p.providerPaymentId) {
        const mp = await mollie.payments.get(p.providerPaymentId);

        // bepaal nieuwe status + extra velden
        newStatus = MOLLIE_TO_PAYMENT[mp.status] ?? p.status;
        const currency = mp.amount?.currency ?? p.currency ?? "EUR";
        const amountCents = mp.amount?.value ? Math.round(Number(mp.amount.value) * 100) : p.amountCents ?? 0;
        const paidAt = (mp as any)?.paidAt ? new Date((mp as any).paidAt as string) : p.paidAt ?? undefined;
        const rawPayload = safeJson(mp);

        // Updaten indien gewijzigd of payload ontbreekt
        if (
          newStatus !== p.status ||
          p.currency !== currency ||
          (amountCents && amountCents !== p.amountCents) ||
          (paidAt && (!p.paidAt || +paidAt !== +p.paidAt)) ||
          rawPayload
        ) {
          lastPaymentUpdated = await prisma.payment.update({
            where: { id: p.id },
            data: {
              status: newStatus,
              currency,
              amountCents,
              paidAt,
              rawPayload: rawPayload ?? p.rawPayload,
            },
          });
          refreshed++;
        } else {
          lastPaymentUpdated = p;
        }

        if (mp.status === "paid") anyPaid = true;
      } else {
        // Niet-Mollie: niks te verversen
        lastPaymentUpdated = p;
      }
    }

    // Als een van de payments PAID is → booking confirm + slot BOOKED
    if (anyPaid) {
      // idempotent bevestigen
      const alreadyConfirmed = booking.status === BookingStatus.CONFIRMED || !!booking.depositPaidAt;

      if (!alreadyConfirmed) {
        await prisma.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.CONFIRMED,
              confirmedAt: new Date(),
              depositPaidAt: new Date(),
            },
          });

          if (booking.slot && booking.slot.status !== SlotStatus.BOOKED) {
            await tx.slot.update({
              where: { id: booking.slot.id },
              data: { status: SlotStatus.BOOKED, bookedAt: new Date() },
            });
          }
        });
      }

      return NextResponse.json({
        ok: true,
        refreshed,
        terminal: true,
        confirmed: true,
        released: false,
        booking: { id: booking.id, status: BookingStatus.CONFIRMED },
        payment: { id: lastPaymentUpdated.id, status: PaymentStatus.PAID },
      });
    }

    // Geen PAID gevonden. Check of de meest recente Mollie-status terminal & onbetaald is → release
    let released = false;
    let terminal = false;

    const mostRecent = lastPaymentUpdated;
    if (mostRecent.provider === PaymentProvider.MOLLIE && mostRecent.providerPaymentId) {
      // Haal laatste Mollie status nogmaals (zou al actueel moeten zijn, maar oké)
      const mp = await mollie.payments.get(mostRecent.providerPaymentId);
      terminal = isTerminal(MOLLIE_TO_PAYMENT[mp.status] ?? mostRecent.status);

      if (isTerminalUnpaidMollie(mp.status)) {
        await releaseSlotIfUnpaid(booking.id);
        released = true;
      }
    } else {
      // Niet-Mollie: terminal = huidige status
      terminal = isTerminal(mostRecent.status);
      // Je kunt beleid kiezen om bij FAILED/CANCELED ook vrij te geven:
      if (mostRecent.status === PaymentStatus.FAILED || mostRecent.status === PaymentStatus.CANCELED) {
        await releaseSlotIfUnpaid(booking.id);
        released = true;
      }
    }

    // Response
    return NextResponse.json({
      ok: true,
      refreshed,
      terminal,
      released,
      booking: { id: booking.id, status: released ? BookingStatus.CANCELLED : booking.status },
      payment: { id: mostRecent.id, status: mostRecent.status },
    });
  } catch (e) {
    console.error("payments/refresh error", e);
    return NextResponse.json({ ok: false, error: "Interne fout" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Gebruik POST." }, { status: 405 });
}
