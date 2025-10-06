import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mollie } from "@/lib/mollie";
import { PaymentProvider, PaymentStatus, PaymentType } from "@prisma/client";

function stripSlash(x?: string | null) {
  return (x ?? "").replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId ontbreekt" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { partner: true, slot: true },
    });
    if (!booking || !booking.partner) {
      return NextResponse.json({ error: "Boeking niet gevonden" }, { status: 404 });
    }

    const amountValue = (booking.depositAmountCents / 100).toFixed(2);

    // Base URL voor redirect (voor de klant) en webhook (voor Mollie)
    const APP_BASE = stripSlash(process.env.NEXT_PUBLIC_APP_URL) || "http://localhost:3000";
    // Belangrijk: webhook moet publiek bereikbaar zijn (ngrok/production)
    const WEBHOOK_BASE = stripSlash(process.env.WEBHOOK_BASE_URL) || APP_BASE;

    const payment = await mollie.payments.create({
      amount: { currency: booking.currency || "EUR", value: amountValue },
      description: `Aanbetaling EscapeRoom ${booking.partner.name}`,
      // ← klant komt hier terug; deze pagina pollt en stuurt door naar /bedankt
      redirectUrl: `${APP_BASE}/checkout/${booking.id}/return`,
      // ← Mollie belt deze URL aan; gebruik publieke ngrok of prod domein
      webhookUrl: `${WEBHOOK_BASE}/api/payments/mollie/webhook`,
      metadata: { bookingId: booking.id },
      // geen locale meegeven (SDK/TS verschillen), Mollie bepaalt zelf
    });

    // NB: Mollie v3/v4: checkout URL via _links.checkout.href
    const checkoutUrl =
      (payment as any)?._links?.checkout?.href ?? (payment as any)?.getCheckoutUrl?.();

    if (!checkoutUrl) {
      return NextResponse.json({ error: "Geen checkout URL van Mollie" }, { status: 502 });
    }

    // Sla het payment lokaal op met providerPaymentId (nodig voor webhook-koppeling)
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: PaymentProvider.MOLLIE,
        type: PaymentType.DEPOSIT,
        status: PaymentStatus.CREATED, // webhook zet 'm daarna naar PENDING/PAID/etc.
        currency: booking.currency || "EUR",
        amountCents: booking.depositAmountCents,
        providerPaymentId: payment.id,
        // method/paidAt/rawPayload worden door de webhook gezet
      },
    });

    return NextResponse.json({ ok: true, url: checkoutUrl });
  } catch (err) {
    console.error("Mollie create error:", err);
    return NextResponse.json({ error: "Kon betaling niet starten" }, { status: 500 });
  }
}
