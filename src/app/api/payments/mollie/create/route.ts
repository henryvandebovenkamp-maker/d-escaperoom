// PATH: src/app/api/payments/mollie/create/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import createMollieClient from "@mollie/api-client";
import { PaymentProvider, PaymentStatus, PaymentType } from "@prisma/client";
import { APP_ORIGIN } from "@/lib/env";

export const runtime = "nodejs";

function mollie() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY ontbreekt");
  return createMollieClient({ apiKey });
}

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) return NextResponse.json({ error: "bookingId ontbreekt" }, { status: 400 });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { partner: true, slot: true },
    });
    if (!booking || !booking.partner || !booking.slot) {
      return NextResponse.json({ error: "Boeking niet gevonden" }, { status: 404 });
    }

    const amountValue = (Number(booking.depositAmountCents) / 100).toFixed(2);
    const currency = booking.currency || "EUR";

    const payment = await mollie().payments.create({
      amount: { currency, value: amountValue },
      description: `Aanbetaling EscapeRoom ${booking.partner.name}`,
      redirectUrl: `${APP_ORIGIN}/checkout/${booking.id}/return`,
      webhookUrl: `${APP_ORIGIN}/api/payments/mollie/webhook`,
      metadata: { bookingId: booking.id },
    });

    const checkoutUrl = payment._links?.checkout?.href;
    if (!checkoutUrl) return NextResponse.json({ error: "Geen checkout URL" }, { status: 502 });

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: PaymentProvider.MOLLIE,
        type: PaymentType.DEPOSIT,
        status: PaymentStatus.CREATED,
        currency,
        amountCents: Number(booking.depositAmountCents),
        providerPaymentId: payment.id,
      },
    });

    return NextResponse.json({ ok: true, url: checkoutUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[mollie/create] error", err);
    return NextResponse.json({ error: "Kon betaling niet starten" }, { status: 500 });
  }
}
