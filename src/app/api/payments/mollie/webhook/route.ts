// PATH: src/app/api/payments/mollie/webhook/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import createMollieClient from "@mollie/api-client";
import { PaymentStatus, PaymentProvider, PaymentType, SlotStatus } from "@prisma/client";
import { releaseSlotIfUnpaid } from "@/lib/slots";

// ⬇️ Nieuw: gebruik de nieuwe mail-API (NL-only templates)
import { sendTemplateMail, APP_ORIGIN } from "@/lib/mail";

export const runtime = "nodejs";

/* ================================
   Config & helpers
================================== */

function verifySecret(req: NextRequest): boolean {
  const expected = (process.env.MOLLIE_WEBHOOK_SECRET || "").trim();
  if (!expected) return true; // geen secret ingesteld → skip
  const got = (req.nextUrl.searchParams.get("s") || "").trim();
  return got === expected;
}

function mollieClient() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY ontbreekt");
  return createMollieClient({ apiKey });
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

/** Terminal & niet-betaald → slot vrijgeven */
function isTerminalUnpaidStatus(mollieStatus?: string) {
  return (
    mollieStatus === "failed" ||
    mollieStatus === "canceled" ||
    mollieStatus === "expired" ||
    mollieStatus === "charged_back"
  );
}

/* ================================
   Webhook handler
================================== */
export async function POST(req: NextRequest) {
  try {
    if (!verifySecret(req)) {
      console.warn("[mollie-webhook] secret mismatch");
      // Altijd 200 naar Mollie teruggeven, anders blijft Mollie retrypen
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const body = await parseBody(req);
    const paymentId = (body?.id ?? body?.paymentId ?? body?.payment_id)?.toString();
    if (!paymentId) {
      console.warn("[mollie-webhook] missing payment id in payload:", body);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const mollie = mollieClient();
    const mp = await mollie.payments.get(paymentId);
    const bookingId = (mp.metadata as any)?.bookingId as string | undefined;

    const mappedStatus = mapPaymentStatus(mp.status);
    const paidAt =
      (mp as any)?.paidAt ? new Date((mp as any).paidAt as string) : undefined;
    const currency = mp.amount?.currency ?? "EUR";
    const amountCents = mp.amount?.value ? Math.round(Number(mp.amount.value) * 100) : 0;

    // ✅ serialize Mollie object zodat Prisma Json het accepteert
    let raw: any;
    try {
      raw = JSON.parse(JSON.stringify(mp));
    } catch {
      raw = {
        id: mp.id,
        status: mp.status,
        amount: mp.amount,
        description: (mp as any)?.description,
        method: (mp as any)?.method,
        metadata: (mp as any)?.metadata,
        paidAt: (mp as any)?.paidAt,
        createdAt: (mp as any)?.createdAt,
        _links: (mp as any)?._links,
      };
    }

    // 1) Upsert Payment record (idempotent op providerPaymentId)
    await prisma.payment.upsert({
      where: { providerPaymentId: mp.id },
      create: {
        bookingId: bookingId ?? "", // als schema bookingId verplicht maakt: lege string zoals je al deed
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

    if (!bookingId) {
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
    if (mp.status === "paid") {
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

        // E-mails (best effort) — ⬇️ AANGEPAST NAAR sendTemplateMail
        try {
          const slot = booking.slot!;
          const customer = booking.customer!;
          const partner = booking.partner!;

          // Vereiste velden voor de NL-templates (conversies + fallbacks)
          const slotISO = slot.startTime.toISOString();
          const totalCents = Number(booking.totalAmountCents || 0);
          const depositCents = Number(booking.depositAmountCents || 0);
          const restCents = Number(booking.restAmountCents || Math.max(totalCents - depositCents, 0));
          const players = Number((booking as any).players ?? 1);

          const address =
            [
              partner.addressLine1,
              partner.postalCode,
              partner.city,
            ]
              .filter(Boolean)
              .join(", ") || undefined;

          // ---- Mail naar klant -------------------------------------------------------
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

          // ---- Mail naar hondenschool -----------------------------------------------
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

    // 4) Niet-betaald & terminaal → slot vrijgeven (automatisch terug naar PUBLISHED)
    if (isTerminalUnpaidStatus(mp.status)) {
      try {
        await releaseSlotIfUnpaid(booking.id);
      } catch (e) {
        console.error("[mollie-webhook] releaseSlotIfUnpaid failed:", e);
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 5) Overige statussen (open/pending/refunded):
    // - open/pending: niets doen (kan nog betaald worden)
    // - refunded: laat de booking staan (beleid afhankelijk); geen auto-release hier
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[mollie-webhook] error:", err);
    // Altijd 200; Mollie retried anders eindeloos
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
