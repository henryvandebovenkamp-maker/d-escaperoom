// PATH: src/app/api/payments/mollie/webhook/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import createMollieClient from "@mollie/api-client";
import { PaymentStatus, PaymentProvider, PaymentType, SlotStatus, BookingStatus } from "@prisma/client";
// Update this import to match the actual export from booking-confirmed.ts
// For example, if the module exports a default function:
import sendBookingEmails from "@/lib/events/booking-confirmed"; // ✅ NIEUW

// Or, if the export is named differently, use:
// import { bookingConfirmedEmails as sendBookingEmails } from "@/lib/events/booking-confirmed";

export const runtime = "nodejs";

function mollie() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY ontbreekt");
  return createMollieClient({ apiKey });
}

function mapStatus(s?: string): PaymentStatus {
  switch (s) {
    case "open":
    case "pending": return PaymentStatus.PENDING;
    case "paid": return PaymentStatus.PAID;
    case "failed": return PaymentStatus.FAILED;
    case "canceled": return PaymentStatus.CANCELED;
    case "refunded":
    case "charged_back": return PaymentStatus.REFUNDED;
    case "expired":
    default: return PaymentStatus.FAILED;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Mollie post x-www-form-urlencoded met id=<paymentId>
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    let paymentId = "";

    if (ct.includes("application/x-www-form-urlencoded")) {
      const txt = await req.text();
      paymentId = (new URLSearchParams(txt).get("id") || "").trim();
    } else if (ct.includes("application/json")) {
      const j = await req.json();
      paymentId = (j?.id || j?.paymentId || j?.payment_id || "").toString();
    } else {
      const fd = await req.formData();
      paymentId = (fd.get("id") || "").toString();
    }

    if (!paymentId) return NextResponse.json({ ok: true }, { status: 200 });

    const mp = await mollie().payments.get(paymentId);
    const bookingId = (mp.metadata as any)?.bookingId as string | undefined;
    const mapped = mapStatus(mp.status);
    const paidAt = (mp as any)?.paidAt ? new Date((mp as any).paidAt) : undefined;
    const amountCents = mp.amount?.value ? Math.round(Number(mp.amount.value) * 100) : 0;
    const currency = mp.amount?.currency ?? "EUR";

    // Upsert payment
    const raw = JSON.parse(JSON.stringify(mp)); // serialize
    await prisma.payment.upsert({
      where: { providerPaymentId: mp.id },
      create: {
        bookingId: bookingId ?? "",
        provider: PaymentProvider.MOLLIE,
        type: PaymentType.DEPOSIT,
        status: mapped,
        providerPaymentId: mp.id,
        method: (mp as any)?.method ?? undefined,
        rawPayload: raw,
        currency,
        amountCents,
        paidAt,
      },
      update: {
        status: mapped,
        method: (mp as any)?.method ?? undefined,
        rawPayload: raw,
        currency,
        amountCents,
        paidAt,
      },
    });

    if (!bookingId) return NextResponse.json({ ok: true }, { status: 200 });

    // Bevestig booking en slot als betaald
    if (mp.status === "paid") {
      const b = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { slot: true },
      });

      if (b) {
        let justConfirmed = false; // ✅ alleen dan e-mails versturen

        await prisma.$transaction(async (tx) => {
          // Booking → CONFIRMED
          if (b.status !== "CONFIRMED") {
            await tx.booking.update({
              where: { id: b.id },
              data: {
                status: BookingStatus.CONFIRMED,
                confirmedAt: new Date(),
                depositPaidAt: paidAt ?? new Date(),
              },
            });
            justConfirmed = true; // ✅ markeer dat we nu pas bevestigd hebben
          }

          // Slot → BOOKED
          if (b.slot && b.slot.status !== "BOOKED") {
            await tx.slot.update({
              where: { id: b.slot.id },
              data: { status: SlotStatus.BOOKED, bookedAt: new Date() },
            });
          }
        });

        // ✅ Alleen bij net bevestigde boeking mails sturen (idempotent bij Mollie retries)
        if (justConfirmed) {
          await sendBookingEmails(b.id);
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[mollie/webhook] error", err);
    // Altijd 200 teruggeven, anders blijft Mollie retrypen
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
