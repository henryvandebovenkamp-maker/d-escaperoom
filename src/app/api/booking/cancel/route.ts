// PATH: src/app/api/booking/cancel/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { mollie } from "@/lib/mollie";
import { BookingStatus, PaymentStatus, PaymentType, SlotStatus } from "@prisma/client";

/* ========== Helpers ========== */
const BodySchema = z.object({
  bookingId: z.string().min(1),
  // Client hint; server beslist definitief:
  refundEligible: z.boolean().optional(),
});

function hoursUntil(iso: string) {
  const now = Date.now();
  const start = new Date(iso).getTime();
  return (start - now) / (1000 * 60 * 60);
}
// Policy: restitutie bij annuleren ≥ 24 uur vóór start
function isRefundWindow(iso: string) {
  const h = hoursUntil(iso);
  return h >= 24;
}
function centsToValue(cents: number) {
  return (Math.max(0, cents) / 100).toFixed(2);
}

/**
 * Probeer een refund aan te maken via Mollie, compatibel met verschillende client-wrappers.
 * Retourneert een object met { ok, id? }.
 */
async function createMollieRefund(opts: {
  providerPaymentId: string;
  currency: string;
  value: string; // "12.34"
  description: string;
}): Promise<{ ok: boolean; id?: string }> {
  const { providerPaymentId, currency, value, description } = opts;

  // @mollie/api-client varianten die we vaak tegenkomen:
  // - mollie.payments_refunds.create({ paymentId, amount, description })
  // - mollie.paymentRefunds.create({ paymentId, amount, description })
  // - mollie.payments.refunds.create(paymentId, { amount, description })  (oudere stijl)
  try {
    if ((mollie as any)?.payments_refunds?.create) {
      const r = await (mollie as any).payments_refunds.create({
        paymentId: providerPaymentId,
        amount: { currency, value },
        description,
      });
      return { ok: true, id: r?.id };
    }
  } catch (e) {
    console.error("Refund via payments_refunds.create faalde:", e);
  }

  try {
    if ((mollie as any)?.paymentRefunds?.create) {
      const r = await (mollie as any).paymentRefunds.create({
        paymentId: providerPaymentId,
        amount: { currency, value },
        description,
      });
      return { ok: true, id: r?.id };
    }
  } catch (e) {
    console.error("Refund via paymentRefunds.create faalde:", e);
  }

  try {
    if ((mollie as any)?.payments?.refunds?.create) {
      const r = await (mollie as any).payments.refunds.create(providerPaymentId, {
        amount: { currency, value },
        description,
      });
      return { ok: true, id: r?.id };
    }
  } catch (e) {
    console.error("Refund via payments.refunds.create faalde:", e);
  }

  return { ok: false };
}

/* ========== POST /api/booking/cancel ========== */
export async function POST(req: Request) {
  try {
    const { bookingId } = BodySchema.parse(await req.json());

    // 1) Haal booking + slot + partner + payments + bestaande refunds op
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        slot: true,
        partner: true,
        payments: true,
        refunds: true, // audit records
      },
    });

    if (!booking || !booking.slot) {
      return NextResponse.json({ ok: false, error: "Boeking niet gevonden" }, { status: 404 });
    }

    // Blokkeer annuleren wanneer het event al is gestart/voorbij is (UI doet dit ook)
    const startISO = booking.slot.startTime.toISOString?.() ?? String(booking.slot.startTime);
    if (hoursUntil(startISO) <= 0) {
      return NextResponse.json(
        { ok: false, error: "De starttijd is verstreken; annuleren is niet meer mogelijk." },
        { status: 400 }
      );
    }

    const alreadyCancelled = booking.status === BookingStatus.CANCELLED;

    // 2) Bepaal refund window definitief op server
    const refundEligible = isRefundWindow(startISO);

    // 3) Bepaal maximaal terug te betalen bedrag (aanbetaling) en reeds gerefund deel
    const depositCents = Math.max(0, booking.depositAmountCents ?? 0);
    const currency = booking.currency ?? "EUR";

    const alreadyRefundedForBooking =
      (booking.refunds ?? []).reduce((sum, r) => sum + Math.max(0, r.amountCents || 0), 0) || 0;

    let remainingToRefund = Math.max(0, depositCents - alreadyRefundedForBooking);

    // 4) Selecteer betaalde DEPOSIT payments
    const paidDepositPayments = (booking.payments ?? []).filter(
      (p) => p.type === PaymentType.DEPOSIT && p.status === PaymentStatus.PAID
    );

    // 5) In transactie: Booking -> CANCELLED (idempotent), Slot vrijmaken indien BOOKED
    const updates = await prisma.$transaction(async (tx) => {
      let slotUpdate = null;
      if (booking.slot.status === SlotStatus.BOOKED) {
        slotUpdate = await tx.slot.update({
          where: { id: booking.slotId },
          data: { status: SlotStatus.DRAFT, bookedAt: null },
        });
      }

      let bookingUpdate = null;
      if (!alreadyCancelled) {
        bookingUpdate = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });
      }

      return { slotUpdate, bookingUpdate };
    });

    // 6) Refunds (buiten transactie) — verdeel over payments, cap op remainingToRefund
    let refundedTotalCents = 0;
    const refundsOut: Array<{ paymentId: string; amountCents: number; providerRefundId?: string }> = [];

    if (refundEligible && remainingToRefund > 0 && paidDepositPayments.length > 0) {
      for (const p of paidDepositPayments) {
        if (!p.providerPaymentId || remainingToRefund <= 0) continue;

        // Hoeveel van dit payment is al gerefund?
        const existingRefundsForPayment =
          (await prisma.refund.findMany({ where: { paymentId: p.id } })) ?? [];
        const alreadyRefundedForPayment = existingRefundsForPayment.reduce(
          (sum, r) => sum + Math.max(0, r.amountCents || 0),
          0
        );

        const paymentAmountCents = Math.max(0, p.amountCents ?? 0);
        const paymentAvailableCents = Math.max(0, paymentAmountCents - alreadyRefundedForPayment);
        if (paymentAvailableCents <= 0) continue;

        const thisRefundCents = Math.min(paymentAvailableCents, remainingToRefund);
        if (thisRefundCents <= 0) continue;

        // Probeer refund bij Mollie
        const res = await createMollieRefund({
          providerPaymentId: p.providerPaymentId!,
          currency,
          value: centsToValue(thisRefundCents),
          description: `D-EscapeRoom — annulering booking ${booking.id}`,
        });

        if (!res.ok) {
          // Log en ga door; route blijft slagen zodat je slot vrij is, maar zonder refund.
          console.error("Mollie refund failed", { bookingId: booking.id, paymentId: p.id });
          continue;
        }

        // Log expliciet in onze DB
        await prisma.refund.create({
          data: {
            bookingId: booking.id,
            paymentId: p.id,
            amountCents: thisRefundCents,
            currency,
            provider: "MOLLIE",
            providerRefundId: res.id,
            reason: "Cancellation ≥ 24h",
          },
        });

        // Als het payment nu volledig is terugbetaald, markeer als REFUNDED (anders laten we 'm op PAID)
        const nowRefundedForPayment = alreadyRefundedForPayment + thisRefundCents;
        if (nowRefundedForPayment >= paymentAmountCents) {
          await prisma.payment.update({
            where: { id: p.id },
            data: { status: PaymentStatus.REFUNDED },
          });
        }

        refundedTotalCents += thisRefundCents;
        remainingToRefund -= thisRefundCents;
        refundsOut.push({
          paymentId: p.providerPaymentId!,
          amountCents: thisRefundCents,
          providerRefundId: res.id,
        });

        if (remainingToRefund <= 0) break;
      }
    }

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      status: BookingStatus.CANCELLED,
      slotFreed: updates.slotUpdate ? true : booking.slot.status !== SlotStatus.BOOKED,
      refund: {
        policyEligible: refundEligible,
        refunded: refundedTotalCents > 0,
        refundAmountCents: refundedTotalCents,
        currency,
        refunds: refundsOut,
        // Handig voor UI: hoeveel van de aanbetaling staat nog open om eventueel te refunden
        remainingEligibleCents: Math.max(0, depositCents - (alreadyRefundedForBooking + refundedTotalCents)),
        depositCents,
      },
    });
  } catch (err: any) {
    console.error("Cancel booking error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Annuleren mislukt" },
      { status: 400 }
    );
  }
}
