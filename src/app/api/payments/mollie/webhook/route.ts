// PATH: src/app/api/payments/mollie/webhook/route.ts
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { mollie } from "@/lib/mollie"; // ← gedeelde lazy singleton
import { PaymentStatus, PaymentProvider, PaymentType, SlotStatus } from "@prisma/client";
import { releaseSlotIfUnpaid } from "@/lib/slots";
// Mail
import { sendTemplateMail } from "@/lib/mail";

// ===== BASE URL helper (stabiel, geen afhankelijkheid van lib/mail) =====
function stripSlash(x?: string | null) {
  return (x ?? "").replace(/\/+$/, "");
}
function getPublicBaseUrl() {
  const explicit = stripSlash(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit;
  const vercel = stripSlash(process.env.VERCEL_URL);
  if (vercel) return `https://${vercel}`;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  throw new Error("Geen publieke base URL (NEXT_PUBLIC_SITE_URL) ingesteld.");
}
const APP_ORIGIN = getPublicBaseUrl();

/* ================================
   Config & helpers
================================== */
function verifySecret(req: NextRequest): boolean {
  const expected = (process.env.MOLLIE_WEBHOOK_SECRET || "").trim();
  if (!expected) return true; // geen secret ingesteld → skip
  const got = (req.nextUrl.searchParams.get("s") || "").trim();
  return got === expected;
}
async function parseBody(req: NextRequest): Promise<Record<string, any>> {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  try {
    if (ct.includes("application/x-www-form-urlencoded")) {
      const txt = await req.text();
      return Object.fromEntries(new URLSearchParams(txt));
    }
    if (ct.includes("application/json")) return await req.json();
    const fd = await req.formData();
    return Object.fromEntries(fd.entries());
  } catch {
    return {};
  }
}
function mapPaymentStatus(s?: string): PaymentStatus {
  switch (s) {
    case "open":
    case "pending":
      return PaymentStatus.PENDING;
    case "authorized":
    case "paid":
      return PaymentStatus.PAID;
    case "failed":
      return PaymentStatus.FAILED;
    case "canceled":
    case "expired":
      return PaymentStatus.CANCELED;
    case "refunded":
      return PaymentStatus.REFUNDED;
    case "charged_back":
      return PaymentStatus.FAILED; // helderder voor “onbetaald”
    default:
      return PaymentStatus.PENDING;
  }
}
/** Terminal & onbetaald → slot vrijgeven */
function isTerminalUnpaidStatus(mollieStatus?: string) {
  return mollieStatus === "failed" || mollieStatus === "canceled" || mollieStatus === "expired" || mollieStatus === "charged_back";
}

/* ================================
   Webhook handler
================================== */
export async function POST(req: NextRequest) {
  try {
    if (!verifySecret(req)) {
      console.warn("[mollie-webhook] secret mismatch");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const body = await parseBody(req);
    const paymentId = (body?.id ?? body?.paymentId ?? body?.payment_id)?.toString();
    if (!paymentId) {
      console.warn("[mollie-webhook] missing payment id in payload:", body);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const mp = await mollie.payments.get(paymentId);
    const bookingId = (mp.metadata as any)?.bookingId as string | undefined;

    const mappedStatus = mapPaymentStatus(mp.status);
    const paidAt = (mp as any)?.paidAt ? new Date((mp as any).paidAt as string) : undefined;
    const currency = mp.amount?.currency ?? "EUR";
    const amountCents = mp.amount?.value ? Math.round(Number(mp.amount.value) * 100) : 0;

    // Prisma Json veilige payload
    const raw = JSON.parse(JSON.stringify(mp));

    // 1) Upsert Payment record (idempotent per providerPaymentId)
    if (bookingId) {
      await prisma.payment.upsert({
        where: { providerPaymentId: mp.id },
        create: {
          bookingId,
          provider: PaymentProvider.MOLLIE,
          type: PaymentType.DEPOSIT,
          status: mappedStatus,
          providerPaymentId: mp.id,
          method: (mp as any)?.method ?? undefined,
          rawPayload: raw,
          currency,
          amountCents,
          paidAt,
        },
        update: {
          status: mappedStatus,
          method: (mp as any)?.method ?? undefined,
          rawPayload: raw,
          currency,
          amountCents,
          paidAt,
        },
      });
    } else {
      // Geen bookingId → we kunnen niet koppelen; loggen en klaar.
      console.warn("[mollie-webhook] payment without bookingId metadata:", mp.id);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 2) Haal booking (incl. relaties)
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { partner: true, customer: true, slot: true },
    });
    if (!booking) {
      console.warn("[mollie-webhook] booking not found for id:", bookingId);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 3) Betaald → bevestigen + slot BOOKED (idempotent)
    if (mappedStatus === PaymentStatus.PAID) {
      const alreadyConfirmed = !!booking.confirmedAt || !!booking.depositPaidAt;

      if (!alreadyConfirmed) {
        await prisma.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: "CONFIRMED",
              confirmedAt: new Date(),
              depositPaidAt: paidAt ?? new Date(),
            },
          });

          if (booking.slot && booking.slot.status !== SlotStatus.BOOKED) {
            await tx.slot.update({
              where: { id: booking.slot.id },
              data: { status: SlotStatus.BOOKED, bookedAt: new Date() },
            });
          }
        });

        // E-mails (best effort)
        try {
          const slot = booking.slot!;
          const customer = booking.customer!;
          const partner = booking.partner!;
          const slotISO = slot.startTime.toISOString();

          const totalCents = Number(booking.totalAmountCents || 0);
          const depositCents = Number(booking.depositAmountCents || 0);
          const restCents = Number(booking.restAmountCents || Math.max(totalCents - depositCents, 0));
          const players = Number((booking as any).players ?? 1);
          const address =
            [partner.addressLine1, partner.postalCode, partner.city].filter(Boolean).join(", ") || undefined;

          // naar klant
          await sendTemplateMail({
            to: customer.email,
            template: "booking_customer",
            vars: {
              bookingId: booking.id,
              firstName: (customer as any)?.firstName ?? customer.name ?? null,
              partnerName: partner.name,
              partnerEmail: partner.email ?? undefined,
              slotISO,
              players,
              totalCents,
              depositCents,
              restCents,
              address,
              manageUrl: `${APP_ORIGIN}/booking/${booking.id}`,
            },
          });

          // naar partner
          if (partner.email) {
            await sendTemplateMail({
              to: partner.email,
              template: "booking_partner",
              vars: {
                bookingId: booking.id,
                customerName: [ (customer as any)?.firstName, (customer as any)?.lastName ]
                  .filter(Boolean)
                  .join(" ") || customer.name || null,
                customerEmail: customer.email,
                slotISO,
                players,
                totalCents,
                depositCents,
                restCents,
                partnerDashboardUrl: `${APP_ORIGIN}/partner/dashboard`,
              },
            });
          }
        } catch (e) {
          console.error("[mollie-webhook] mail failed:", e);
        }
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 4) Niet-betaald & terminaal → slot vrijgeven
    if (isTerminalUnpaidStatus(mp.status)) {
      try {
        await releaseSlotIfUnpaid(booking.id);
      } catch (e) {
        console.error("[mollie-webhook] releaseSlotIfUnpaid failed:", e);
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 5) Overige statussen: niets doen
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[mollie-webhook] error:", err);
    // Bewust 200: Mollie mag door; je kunt ook 500 geven om retries te triggeren.
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
