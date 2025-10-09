// PATH: src/app/api/booking/cancel/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { BookingStatus, PaymentStatus, PaymentType, PaymentProvider } from "@prisma/client";
import jwt from "jsonwebtoken";
import { z } from "zod";

export const runtime = "nodejs";

/* ================================
   Config
================================== */
// Automatisch refunden bij annuleren (idempotent via Mollie)
const REFUND_ON_CANCEL = true;

const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY = "de_session";
const SECRET = process.env.SESSION_SECRET || "";

/* ================================
   Auth helpers
================================== */
type Role = "ADMIN" | "PARTNER";
type JWTPayload = { sub: string; role: Role; [k: string]: unknown };

function readCookieFromHeader(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}
function readSession(req: Request): JWTPayload | null {
  const token =
    readCookieFromHeader(req, COOKIE_PRIMARY) ||
    readCookieFromHeader(req, COOKIE_LEGACY);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET) as JWTPayload;
    if (!payload?.sub || !payload?.role) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ================================
   Helpers
================================== */
const BodySchema = z.object({
  bookingId: z.string().min(1),
  refundEligible: z.boolean().optional(), // client hint; server beslist
  reason: z.string().max(500).optional(),
});

function isRefundWindow(slotStartISO: string): boolean {
  // Beleid: tot aan starttijd mag aanbetaling terug.
  const now = new Date();
  const start = new Date(slotStartISO);
  return now <= start;
}

const toCents = (n: number) => Math.round(n * 100);
const centsToEUR = (c: number) => +(c / 100).toFixed(2);

// Lazy Mollie client (officiële client of je wrapper)
async function getMollie(): Promise<any> {
  try {
    const { createMollieClient } = await import("@mollie/api-client");
    if (!process.env.MOLLIE_API_KEY) throw new Error("Missing MOLLIE_API_KEY");
    return createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
  } catch {
    const maybeLocal = await import("@/lib/mollie").catch(() => null);
    if (!maybeLocal) throw new Error("Geen Mollie client beschikbaar.");
    return (maybeLocal as any).default || maybeLocal;
  }
}

/* ================================
   POST /api/booking/cancel
================================== */
export async function POST(req: NextRequest) {
  try {
    // AUTH
    const session = readSession(req);
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const role: Role = session.role;
    const subject = String(session.sub); // partner id of slug

    // INPUT
    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid body", issues: parsed.error.flatten() }, { status: 400 });
    }
    const { bookingId, refundEligible: clientHint } = parsed.data;

    // BOOKING + context
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        slot: { include: { partner: { select: { id: true, slug: true, name: true } } } },
        partner: { select: { id: true, slug: true, name: true } }, // legacy fallback
        payments: {
          where: { type: PaymentType.DEPOSIT, status: PaymentStatus.PAID },
        },
        refunds: true, // audit (lokale som)
      },
    });
    if (!booking?.slot?.startTime) {
      return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
    }

    // PARTNER scope
    if (role === "PARTNER") {
      const bPartnerId = booking.slot.partner?.id ?? booking.partner?.id ?? null;
      const bPartnerSlug = booking.slot.partner?.slug ?? booking.partner?.slug ?? null;
      if (![bPartnerId, bPartnerSlug].includes(subject)) {
        return NextResponse.json({ ok: false, error: "Forbidden: partner scope mismatch" }, { status: 403 });
      }
    }

    // Policy
    const startISO = booking.slot.startTime.toISOString();
    const policyEligible = isRefundWindow(startISO);
    const refundEligible = clientHint ?? policyEligible;

    // Annuleer ALTIJD
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
    });
    // (Optioneel): slot vrijgeven; 1:1 relatie, dus terug naar PUBLISHED
    // await prisma.slot.update({ where: { id: booking.slotId }, data: { status: "PUBLISHED" as any } });

    // ===== AUTO-REFUND (idempotent via Mollie) =====
    const depositCents = booking.depositAmountCents; // boeking bepaalt aanbetaling
    const alreadyRefundedLocal =
      (booking.refunds || []).reduce((s, r) => s + Math.max(0, r.amountCents || 0), 0);

    let remainingToRefund = Math.max(0, depositCents - alreadyRefundedLocal);
    let refundedTotalCents = 0;
    const refundsOut: Array<{ paymentId: string; amountCents: number; providerRefundId?: string }> = [];

    if (REFUND_ON_CANCEL && refundEligible && remainingToRefund > 0 && booking.payments.length > 0) {
      const mollie = await getMollie();

      for (const p of booking.payments) {
        // Robust veldnaam-detectie
        const providerPaymentId =
          (p as any).providerPaymentId ||
          (p as any).molliePaymentId ||
          (p as any).providerId ||
          (p as any).mollieId ||
          null;
        if (!providerPaymentId) {
          console.warn("Geen providerPaymentId op Payment", { paymentId: p.id });
          continue;
        }

        // 1) Lees Mollie: hoeveel is daar al terugbetaald?
        let molliePayment: any = null;
        try {
          molliePayment = await (mollie as any).payments.get(providerPaymentId);
        } catch (e) {
          console.error("Mollie get payment failed", { paymentId: p.id, providerPaymentId });
          continue; // sla dit payment over; booking is al geannuleerd
        }

        const mpRefundedCents = toCents(Number(molliePayment?.amountRefunded?.value || "0"));
        const alreadyLocalForPayment =
          (booking.refunds || []).filter(r => r.paymentId === p.id).reduce((s, r) => s + Math.max(0, r.amountCents || 0), 0);

        // Beschikbaar op dit payment = betaald bedrag - max(lokaal, mollie)
        const accounted = Math.max(mpRefundedCents, alreadyLocalForPayment);
        const availableOnPayment = Math.max(0, (p.amountCents ?? 0) - accounted);
        const toRefundCents = Math.min(availableOnPayment, remainingToRefund);
        if (toRefundCents <= 0) continue;

        // 2) Start refund met Idempotency-Key
        const idempotencyKey = `cancel:${booking.id}:${p.id}:${toRefundCents}`;
        let mr: any = null;
        try {
          if ((mollie as any)?.payments_refunds?.create) {
            mr = await (mollie as any).payments_refunds.create(
              {
                paymentId: providerPaymentId,
                amount: { currency: "EUR", value: (toRefundCents / 100).toFixed(2) },
                description: `Refund booking ${booking.id} (cancel)`,
              },
              { headers: { "Idempotency-Key": idempotencyKey } } as any
            );
          } else if ((mollie as any)?.payments?.refunds?.create) {
            mr = await (mollie as any).payments.refunds.create(
              providerPaymentId,
              {
                amount: { currency: "EUR", value: (toRefundCents / 100).toFixed(2) },
                description: `Refund booking ${booking.id} (cancel)`,
              },
              { headers: { "Idempotency-Key": idempotencyKey } } as any
            );
          } else {
            throw new Error("No compatible Mollie refund client exposed");
          }
        } catch (e) {
          console.error("Mollie refund failed", { bookingId: booking.id, paymentId: p.id, toRefundCents });
          continue;
        }

        // 3) Log lokaal één Refund record (audit)
        try {
          await prisma.refund.create({
            data: {
              bookingId: booking.id,
              paymentId: p.id,
              amountCents: toRefundCents,
              currency: "EUR",
              provider: PaymentProvider.MOLLIE,
              providerRefundId: mr?.id ?? null,
            },
          });
        } catch (e) {
          // Geen unique constraint op providerRefundId → niets te doen, audit is best-effort
        }

        refundedTotalCents += toRefundCents;
        remainingToRefund = Math.max(0, remainingToRefund - toRefundCents);
        refundsOut.push({ paymentId: p.id, amountCents: toRefundCents, providerRefundId: mr?.id ?? undefined });

        if (remainingToRefund <= 0) break;
      }
    }

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      status: "CANCELLED",
      refund: {
        policyEligible: refundEligible,
        refunded: refundedTotalCents > 0,
        refundAmountCents: refundedTotalCents,
        refunds: refundsOut,
        remainingEligibleCents: Math.max(0, depositCents - (alreadyRefundedLocal + refundedTotalCents)),
      },
    });
  } catch (e: any) {
    console.error("POST /api/booking/cancel error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
