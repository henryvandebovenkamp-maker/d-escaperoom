// PATH: src/app/api/payments/mollie/create/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import createMollieClient from "@mollie/api-client";
import { PaymentProvider, PaymentStatus, PaymentType } from "@prisma/client";

export const runtime = "nodejs";

/* ===== Helpers ===== */
function stripSlash(x?: string | null) {
  return (x ?? "").replace(/\/+$/, "");
}

function getPublicBaseUrl() {
  // 1) Expliciete site-URL heeft voorrang
  const explicit = stripSlash(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit;

  // 2) Vercel deployment URL (zonder protocol) -> https toevoegen
  const vercel = stripSlash(process.env.VERCEL_URL);
  if (vercel) return `https://${vercel}`;

  // 3) Alleen in local dev een fallback toestaan
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";

  // In productie geen gok doen -> duidelijke fout (anders 422 bij Mollie)
  throw new Error(
    "Geen publieke base URL gevonden. Zet NEXT_PUBLIC_SITE_URL in Vercel (Production/Preview)."
  );
}

/* ===== Mollie client ===== */
function getMollie() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY ontbreekt");
  return createMollieClient({ apiKey });
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
    const currency = booking.currency || "EUR";

    // Publieke, absolute base URL (https) voor redirect & webhook
    const BASE = getPublicBaseUrl();

    const mollie = getMollie();

    const payment = await mollie.payments.create({
      amount: { currency, value: amountValue },
      description: `Aanbetaling EscapeRoom ${booking.partner.name}`,
      redirectUrl: `${BASE}/checkout/${booking.id}/return`,
      webhookUrl: `${BASE}/api/payments/mollie/webhook`,
      metadata: { bookingId: booking.id },
      // locale door Mollie laten bepalen
    });

    const checkoutUrl = payment._links?.checkout?.href;
    if (!checkoutUrl) {
      return NextResponse.json({ error: "Geen checkout URL van Mollie" }, { status: 502 });
    }

    // Lokale Payment vastleggen (webhook werkt status bij)
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: PaymentProvider.MOLLIE,
        type: PaymentType.DEPOSIT,
        status: PaymentStatus.CREATED,
        currency,
        amountCents: booking.depositAmountCents,
        providerPaymentId: payment.id,
      },
    });

    return NextResponse.json({ ok: true, url: checkoutUrl });
  } catch (err) {
    console.error("Mollie create error:", err);
    return NextResponse.json({ error: "Kon betaling niet starten" }, { status: 500 });
  }
}
