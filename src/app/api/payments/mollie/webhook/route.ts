// PATH: src/app/api/payments/mollie/webhook/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import createMollieClient from "@mollie/api-client";
import { sendTemplateMail } from "@/lib/mail";
import {
  PaymentStatus,
  PaymentProvider,
  PaymentType,
  SlotStatus,
  BookingStatus,
} from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mollie() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY ontbreekt");
  return createMollieClient({ apiKey });
}

function mapStatus(s?: string): PaymentStatus {
  switch (s) {
    case "created":
    case "open":
    case "pending":
      return PaymentStatus.PENDING;
    case "authorized": // zeldzaam, maar veilig als PAID
    case "paid":
      return PaymentStatus.PAID;
    case "refunded":
    case "charged_back":
      return PaymentStatus.REFUNDED;
    case "canceled":
    case "expired":
      return PaymentStatus.CANCELED;
    case "failed":
    default:
      return PaymentStatus.FAILED;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Mollie post x-www-form-urlencoded met `id=<paymentId>`
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

    if (!paymentId) {
      // altijd 200 → Mollie stopt retrys
      return NextResponse.json({ ok: true });
    }

    const mp = await mollie().payments.get(paymentId);
    const bookingId = (mp.metadata as any)?.bookingId as string | undefined;

    const mapped = mapStatus(mp.status);
    const paidAt =
      (mp as any)?.paidAt ? new Date((mp as any).paidAt) : undefined;
    const amountCents = mp.amount?.value
      ? Math.round(Number(mp.amount.value) * 100)
      : 0;
    const currency = mp.amount?.currency ?? "EUR";

    // Upsert payment log (raw opslaan is handig voor debug)
    const raw = JSON.parse(JSON.stringify(mp));
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

    if (!bookingId) {
      return NextResponse.json({ ok: true });
    }

    // Alleen bij 'paid' → bevestigen & mails versturen (idempotent)
    if (mp.status === "paid" || mp.status === "authorized") {
      // Prefetch voor mail + slotid
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { slot: true, partner: true, customer: true },
      });
      if (!booking) return NextResponse.json({ ok: true });

      const now = new Date();
      const [updBooking, updSlot] = await prisma.$transaction([
        prisma.booking.updateMany({
          where: { id: booking.id, status: { not: BookingStatus.CONFIRMED } },
          data: {
            status: BookingStatus.CONFIRMED,
            confirmedAt: now,
            depositPaidAt: paidAt ?? now,
          },
        }),
        booking.slot
          ? prisma.slot.updateMany({
              where: { id: booking.slot.id, status: { not: SlotStatus.BOOKED } },
              data: { status: SlotStatus.BOOKED, bookedAt: now },
            })
          : prisma.$executeRaw`SELECT 1`, // fallback: dummy PrismaPromise
      ]);

      const didConfirm = updBooking.count > 0;
      if (didConfirm) {
        // 🔔 Alleen bij eerste keer naar CONFIRMED mails sturen
        const totalCents = (booking as any).totalCents ?? 0;
        const depositCents = (booking as any).depositCents ?? amountCents;
        const restCents =
          (booking as any).restCents ?? Math.max(0, totalCents - depositCents);
        const slotISO = booking.slot?.startTime ? booking.slot.startTime.toISOString() : new Date().toISOString();

        // Mail: klant
        if (booking.customer?.email) {
          await sendTemplateMail({
            to: booking.customer.email,
            template: "booking_customer",
            vars: {
              customerEmail: booking.customer.email,
              customerName: booking.customer?.name || "",
              partnerName: booking.partner?.name || "Hondenschool",
              partnerAddress: (booking.partner as any)?.address || "",
              slotISO,
              players: (booking as any).players ?? 1,
              bookingId: booking.id,
              totalCents,
              depositCents,
              restCents,
              manageUrl: `${process.env.APP_ORIGIN || "https://d-escaperoom.vercel.app"}/booking/${booking.id}`,
            },
          });
        }

        // Mail: partner
        if (booking.partner?.email) {
          await sendTemplateMail({
            to: booking.partner.email,
            template: "booking_partner",
            vars: {
              partnerEmail: booking.partner.email,
              partnerName: booking.partner?.name || "Partner",
              bookingId: booking.id,
              slotISO,
              players: (booking as any).players ?? 1,
              customerEmail: booking.customer?.email || "",
              depositCents,
              restCents,
            },
          });
        }
      }
    }

    // Altijd 200 teruggeven zodat Mollie niet blijft retrypen
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mollie/webhook] error", err);
    // Altijd 200 teruggeven, anders blijft Mollie retrypen
    return NextResponse.json({ ok: true });
  }
}
