// PATH: src/app/api/payments/mollie/webhook/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import createMollieClient from "@mollie/api-client";
import {
  PaymentStatus,
  PaymentProvider,
  PaymentType,
  SlotStatus,
  BookingStatus,
} from "@prisma/client";

export const runtime = "nodejs";

/* ================================
   Mollie client
================================== */
function mollie() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY ontbreekt");
  return createMollieClient({ apiKey });
}

/* ================================
   Helpers
================================== */

// Parse Mollie payment id uit x-www-form-urlencoded / json / formData
async function readPaymentId(req: NextRequest): Promise<string> {
  const ct = (req.headers.get("content-type") || "").toLowerCase();

  try {
    if (ct.includes("application/x-www-form-urlencoded")) {
      const txt = await req.text();
      return (new URLSearchParams(txt).get("id") || "").trim();
    }
    if (ct.includes("application/json")) {
      const j = await req.json();
      return (j?.id || j?.paymentId || j?.payment_id || "").toString().trim();
    }
    const fd = await req.formData();
    return (fd.get("id") || "").toString().trim();
  } catch {
    return "";
  }
}

function mapStatus(s?: string): PaymentStatus {
  switch (s) {
    case "created":
    case "open":
    case "pending":
      return PaymentStatus.PENDING;
    case "authorized": // komt zelden voor bij gewone payments
    case "paid":
      return PaymentStatus.PAID;
    case "failed":
      return PaymentStatus.FAILED;
    case "canceled":
    case "expired":
      return PaymentStatus.CANCELED;
    case "refunded":
    case "charged_back":
      return PaymentStatus.REFUNDED;
    default:
      return PaymentStatus.FAILED;
  }
}

/* ================================
   Webhook handler
   - Update Payment record (upsert)
   - Update Booking/Slot statussen (idempotent)
   - NO EMAILS HERE (alleen via return-pagina)
================================== */
export async function POST(req: NextRequest) {
  try {
    const paymentId = await readPaymentId(req);
    if (!paymentId) {
      // Altijd 200 teruggeven; Mollie verwacht geen fout bij “geen id”
      return NextResponse.json({ ok: true, reason: "no-id" }, { status: 200 });
    }

    const mp = await mollie().payments.get(paymentId);

    // Extract basics
    const bookingId = (mp.metadata as any)?.bookingId as string | undefined;
    const mapped = mapStatus(mp.status);
    const paidAt = (mp as any)?.paidAt ? new Date((mp as any).paidAt) : undefined;
    const amountCents = mp.amount?.value ? Math.round(Number(mp.amount.value) * 100) : 0;
    const currency = mp.amount?.currency ?? "EUR";
    const method = (mp as any)?.method ?? undefined;

    // Als je Payment zonder bookingId niet wilt opslaan, kun je hier vroegtijdig returnen.
    if (!bookingId) {
      console.warn("[mollie/webhook] payment zonder bookingId in metadata:", mp.id);
      return NextResponse.json({ ok: true, reason: "no-bookingId" }, { status: 200 });
    }

    // Veilig serializen van Mollie payload (zodat Prisma 'm kan opslaan)
    const raw = JSON.parse(JSON.stringify(mp));

    // 1) Upsert Payment (idempotent)
    await prisma.payment.upsert({
      where: { providerPaymentId: mp.id },
      create: {
        bookingId,
        provider: PaymentProvider.MOLLIE,
        type: PaymentType.DEPOSIT,
        status: mapped,
        providerPaymentId: mp.id,
        method,
        rawPayload: raw,
        currency,
        amountCents,
        paidAt,
      },
      update: {
        status: mapped,
        method,
        rawPayload: raw,
        currency,
        amountCents,
        paidAt,
      },
    });

    // 2) Booking/Slot bijwerken (idempotent)
    const b = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });

    if (!b) {
      // Booking bestaat niet (meer). Stop zonder error.
      return NextResponse.json({ ok: true, reason: "booking-not-found" }, { status: 200 });
    }

    // Alleen logica voor "betaald" afhandelen; andere statussen laten we verder met rust.
    if (mapped === PaymentStatus.PAID) {
      await prisma.$transaction(async (tx) => {
        // Booking -> CONFIRMED (éénmalig)
        if (b.status !== BookingStatus.CONFIRMED) {
          await tx.booking.update({
            where: { id: b.id },
            data: {
              status: BookingStatus.CONFIRMED,
              confirmedAt: new Date(),
              depositPaidAt: paidAt ?? new Date(),
            },
          });
        }

        // Slot -> BOOKED (éénmalig)
        if (b.slot && b.slot.status !== SlotStatus.BOOKED) {
          await tx.slot.update({
            where: { id: b.slot.id },
            data: { status: SlotStatus.BOOKED, bookedAt: new Date() },
          });
        }
      });
    }

    // 3) NO EMAILS HERE — wordt uitsluitend gedaan via /checkout/[bookingId]/return
    //    (die roept /api/booking/[bookingId]/send-emails aan met lock + secret)

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[mollie/webhook] error", err);
    // Altijd 200 teruggeven; anders blijft Mollie retrypen
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
