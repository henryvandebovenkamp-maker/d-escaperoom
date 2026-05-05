// PATH: src/app/api/booking/cancel/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  BookingStatus,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  SlotStatus,
  type Prisma,
} from "@prisma/client";
import createMollieClient from "@mollie/api-client";
import jwt from "jsonwebtoken";
import { z } from "zod";

export const runtime = "nodejs";

/* ================================
   CONFIG
================================== */
const REFUND_ON_CANCEL = true;

const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY = "de_session";
const SECRET = process.env.SESSION_SECRET || "";

/* ================================
   TYPES
================================== */
type Role = "ADMIN" | "PARTNER";

type JWTPayload = {
  sub: string;
  role: Role;
  [key: string]: unknown;
};

/* ================================
   AUTH
================================== */
function readCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function readSession(req: Request): JWTPayload | null {
  const token =
    readCookie(req, COOKIE_PRIMARY) || readCookie(req, COOKIE_LEGACY);

  if (!token || !SECRET) return null;

  try {
    const payload = jwt.verify(token, SECRET) as JWTPayload;
    if (!payload?.sub || !payload?.role) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ================================
   HELPERS
================================== */
const BodySchema = z.object({
  bookingId: z.string().min(1),
});

function isRefundAllowed(start: Date) {
  return Date.now() <= start.getTime();
}

function toMollieValue(cents: number) {
  return (cents / 100).toFixed(2);
}

function toCents(value: string | null | undefined) {
  if (!value) return 0;
  return Math.round(Number(value) * 100);
}

function mollie() {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) throw new Error("Missing MOLLIE_API_KEY");
  return createMollieClient({ apiKey: key });
}

/* ================================
   MAIN
================================== */
export async function POST(req: NextRequest) {
  try {
    const session = readSession(req);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid body" },
        { status: 400 }
      );
    }

    const { bookingId } = parsed.data;
    const subject = String(session.sub);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        slot: {
          include: {
            partner: {
              select: { id: true, slug: true },
            },
          },
        },
        partner: {
          select: { id: true, slug: true },
        },
        payments: {
          where: {
            type: PaymentType.DEPOSIT,
            status: PaymentStatus.PAID,
          },
          select: {
            id: true,
            amountCents: true,
            providerPaymentId: true,
          },
        },
        refunds: {
          select: {
            paymentId: true,
            amountCents: true,
          },
        },
      },
    });

    if (!booking || !booking.slot) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    /* ================================
       PARTNER CHECK
    ================================== */
    if (session.role === "PARTNER") {
      const partnerId =
        booking.slot.partner?.id ?? booking.partner?.id ?? null;
      const partnerSlug =
        booking.slot.partner?.slug ?? booking.partner?.slug ?? null;

      if (subject !== partnerId && subject !== partnerSlug) {
        return NextResponse.json(
          { ok: false, error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    /* ================================
       POLICY
    ================================== */
    const refundAllowed = isRefundAllowed(booking.slot.startTime);

    /* ================================
       CANCEL BOOKING + SLOT FREE
    ================================== */
    await prisma.$transaction(async (tx) => {
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
    });

    /* ================================
       REFUND LOGIC
    ================================== */
    const deposit = booking.depositAmountCents;

    const alreadyRefunded = booking.refunds.reduce(
      (sum, r) => sum + r.amountCents,
      0
    );

    let remaining = Math.max(0, deposit - alreadyRefunded);
    let refundedTotal = 0;

    const results: Array<{
      paymentId: string;
      amountCents: number;
      refundId?: string;
    }> = [];

    if (REFUND_ON_CANCEL && refundAllowed && remaining > 0) {
      const client = mollie();

      for (const p of booking.payments) {
        if (!p.providerPaymentId) continue;

        let molliePayment;
        try {
          molliePayment = await client.payments.get(
            p.providerPaymentId
          );
        } catch {
          continue;
        }

        const mollieRefunded = toCents(
          molliePayment.amountRefunded?.value
        );

        const localRefunded = booking.refunds
          .filter((r) => r.paymentId === p.id)
          .reduce((s, r) => s + r.amountCents, 0);

        const already = Math.max(mollieRefunded, localRefunded);

        const available = Math.max(0, p.amountCents - already);

        const toRefund = Math.min(available, remaining);

        if (toRefund <= 0) continue;

        let refund;

        try {
          refund = await client.paymentRefunds.create({
            paymentId: p.providerPaymentId,
            amount: {
              currency: "EUR",
              value: toMollieValue(toRefund),
            },
            description: `Refund booking ${booking.id}`,
          });
        } catch (err) {
          console.error("Refund failed", err);
          continue;
        }

        await prisma.refund.create({
          data: {
            bookingId: booking.id,
            paymentId: p.id,
            amountCents: toRefund,
            currency: "EUR",
            provider: PaymentProvider.MOLLIE,
            providerRefundId: refund.id ?? null,
          } satisfies Prisma.RefundUncheckedCreateInput,
        });

        refundedTotal += toRefund;
        remaining -= toRefund;

        results.push({
          paymentId: p.id,
          amountCents: toRefund,
          refundId: refund.id,
        });

        if (remaining <= 0) break;
      }
    }

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      status: BookingStatus.CANCELLED,
      refund: {
        allowed: refundAllowed,
        amountCents: refundedTotal,
        refunds: results,
      },
    });
  } catch (err: unknown) {
    console.error("Cancel error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Server error",
      },
      { status: 500 }
    );
  }
}