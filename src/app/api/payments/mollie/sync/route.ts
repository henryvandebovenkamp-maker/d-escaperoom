// PATH: src/app/api/payments/mollie/sync/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import createMollieClient from "@mollie/api-client";
import { PaymentStatus, SlotStatus } from "@prisma/client";
import { sendTemplateMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function toCents(val?: string | number | null) {
  if (val == null) return undefined;
  const n = typeof val === "string" ? Number(val) : val;
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

function buildGoogleMapsUrl(partner: {
  googleMapsUrl?: string | null;
  addressLine1?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  if (partner.googleMapsUrl) return partner.googleMapsUrl;
  const parts = [partner.addressLine1, partner.postalCode, partner.city, partner.country ?? "NL"]
    .filter(Boolean)
    .join(" ");
  if (!parts) return null;
  const q = encodeURIComponent(parts);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export async function POST(req: Request) {
  try {
    const { bookingId, providerPaymentId } = await req.json();

    // 1) Vind lokaal Payment
    const paymentLocal = providerPaymentId
      ? await prisma.payment.findUnique({ where: { providerPaymentId } })
      : await prisma.payment.findFirst({
          where: { bookingId },
          orderBy: { createdAt: "desc" },
        });

    if (!paymentLocal) {
      return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
    }

    if (!paymentLocal.providerPaymentId) {
      return NextResponse.json({ error: "providerPaymentId_missing" }, { status: 400 });
    }

    // 2) Haal actuele status op bij Mollie
    const p = await mollie.payments.get(paymentLocal.providerPaymentId);
    const mapped = mapPaymentStatus(p.status);
    const paidAt = (p as any)?.paidAt ? new Date((p as any).paidAt) : undefined;
    const amountCents = p.amount?.value ? toCents(p.amount.value) : undefined;
    const metaBookingId = (p.metadata as any)?.bookingId as string | undefined;
    const targetBookingId = paymentLocal.bookingId ?? metaBookingId;

    // 3) Update Payment lokaal
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
      return NextResponse.json({ ok: true, synced: true, note: "no_booking_linked" });
    }

    // 4) Haal Booking + relaties op
    const booking = await prisma.booking.findUnique({
      where: { id: targetBookingId },
      include: {
        slot: true,
        partner: true,
        customer: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ ok: true, synced: true, note: "booking_not_found" });
    }

    // 5) Bij PAID → booking CONFIRMED (idempotent) en slot BOOKED
    let justConfirmed = false;

    if (p.status === "paid" && !booking.confirmedAt) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          depositPaidAt: paidAt ?? new Date(),
        },
      });
      justConfirmed = true;
    }

    if (booking.slot && booking.slot.status !== SlotStatus.BOOKED) {
      await prisma.slot.update({
        where: { id: booking.slot.id },
        data: { status: SlotStatus.BOOKED, bookedAt: new Date() },
      });
    }

    // 6) Mails: alleen als we zójuist confirmed hebben gezet
    if (p.status === "paid" && justConfirmed) {
      const partner = booking.partner;
      const slot = booking.slot;
      const customer = booking.customer;

      // — gegevens uit jouw schema —
      const players = booking.playersCount;
      const totalCents = booking.totalAmountCents;
      const depositCents = booking.depositAmountCents;
      const restCents = booking.restAmountCents;

      // Adres + Google Maps
      const mapsUrl = buildGoogleMapsUrl(partner);
      const addressPlain = [partner.addressLine1, partner.postalCode, partner.city]
        .filter(Boolean)
        .join(" ");
      const addressHtml = addressPlain
        ? `${addressPlain}${mapsUrl ? `<br/><a href="${mapsUrl}">Open in Google Maps</a>` : ""}`
        : (mapsUrl ? `<a href="${mapsUrl}">Open in Google Maps</a>` : "");

      const slotISO = slot?.startTime?.toISOString() ?? ""; // jouw template formatteert zelf naar NL

      const manageUrl = `${process.env.APP_ORIGIN ?? ""}/booking/${booking.id}`;

      // CUSTOMER
      if (customer?.email) {
        await sendTemplateMail(
          "booking-customer",
          {
            bookingId: booking.id,
            firstName: customer.name ?? null,
            partnerName: partner.name,
            partnerEmail: partner.email ?? null,
            slotISO,
            players,
            totalCents,
            depositCents,
            restCents,
            address: addressHtml, // bevat evt. Google Maps link
            manageUrl,
          },
          { to: customer.email }
        );
      }

      // PARTNER (optioneel)
      if (partner.email) {
        await sendTemplateMail(
          "booking-partner",
          {
            bookingId: booking.id,
            customerName: customer?.name ?? null,
            customerEmail: customer?.email ?? "",
            slotISO,
            players,
            totalCents,
            depositCents,
            restCents,
            partnerDashboardUrl: `${process.env.APP_ORIGIN ?? ""}/partner/dashboard`,
          },
          { to: partner.email }
        );
      }
    }

    return NextResponse.json({ ok: true, synced: true, status: p.status });
  } catch (e) {
    console.error("[mollie-sync] error", e);
    return NextResponse.json({ ok: false, error: "sync_failed" }, { status: 500 });
  }
}
