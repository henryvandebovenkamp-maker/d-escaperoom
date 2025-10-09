// PATH: src/app/api/payments/mollie/refund/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import createMollieClient from "@mollie/api-client";
import { PaymentProvider, PaymentStatus, PaymentType } from "@prisma/client";

export const runtime = "nodejs";

const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY! });

type ReqBody = { bookingId?: string };

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ReqBody;
    if (!body?.bookingId) {
      return new NextResponse("bookingId ontbreekt", { status: 400 });
    }

    // 1) Boeking + laatste DEPOSIT-payment (Mollie) ophalen
    const booking = await prisma.booking.findUnique({
      where: { id: body.bookingId },
      include: {
        payments: {
          where: { provider: PaymentProvider.MOLLIE, type: PaymentType.DEPOSIT },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    if (!booking) return new NextResponse("Boeking niet gevonden", { status: 404 });

    const payment = booking.payments[0];
    if (!payment || !payment.providerPaymentId) {
      return new NextResponse("Mollie payment niet gevonden voor deze boeking", { status: 404 });
    }

    // 2) Al lokaal REFUNDED? -> klaar (idempotent)
    if (payment.status === PaymentStatus.REFUNDED) {
      const dashboardUrl = await getMollieDashboardUrlSafe(payment.providerPaymentId);
      return NextResponse.json({ ok: true, alreadyRefunded: true, dashboardUrl });
    }

    // 3) Gewenste refund-bedrag (deposit uit DB)
    const desiredCents = payment.amountCents ?? 0;
    if (desiredCents <= 0) return new NextResponse("Refund bedrag is 0", { status: 400 });

    // 4) Check bij Mollie wat er NOG te refunden is (voorkomt “specified amount cannot be refunded”)
    //    We embedden refunds om het 'remaining' bedrag zelf te kunnen bepalen (SDK-typen variëren per versie).
    const mp = await (mollie as any).payments.get(payment.providerPaymentId, { embed: "refunds" });
    const currencyFromMollie: string = mp?.amount?.currency || payment.currency || "EUR";
    const paidValue = toAmount(mp?.amount?.value);
    const refundedSum = sumRefunded(mp?._embedded?.refunds);
    const remainingValue = Math.max(paidValue - refundedSum, 0); // in valuta-eenheden (bv. 12.34)

    const remainingCents = Math.round(remainingValue * 100);

    if (remainingCents <= 0) {
      // Er is niets meer te refunden bij Mollie -> markeer idempotent als refunded
      try {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.REFUNDED },
        });
      } catch { /* noop */ }
      const dashboardUrl = await getMollieDashboardUrlSafe(payment.providerPaymentId);
      return NextResponse.json({ ok: true, alreadyRefunded: true, dashboardUrl });
    }

    // 5) Refund-bedrag = MIN(gewenst, remaining) om Mollie-fout te voorkomen
    const refundCents = Math.min(desiredCents, remainingCents);
    const valueStr = (refundCents / 100).toFixed(2);

    // 6) Refund starten bij Mollie
    await (mollie as any).paymentRefunds.create({
      paymentId: payment.providerPaymentId,
      amount: { currency: currencyFromMollie, value: valueStr },
      description: `Refund deposit booking ${booking.id}`,
      metadata: { bookingId: booking.id },
    });

    // 7) Lokaal bijwerken — we markeren de DEPOSIT-payment als REFUNDED
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED },
    });

    const dashboardUrl = await getMollieDashboardUrlSafe(payment.providerPaymentId);
    return NextResponse.json({ ok: true, amountCents: refundCents, dashboardUrl });
  } catch (e: any) {
    const msg = String(e?.message || e);

    // Bekende idempotency/duplicate-gevallen -> netjes als alreadyRefunded teruggeven
    if (
      /already\s*refunded/i.test(msg) ||
      /refund\s*already\s*exists/i.test(msg) ||
      /duplicate refund has been detected/i.test(msg)
    ) {
      return NextResponse.json({ ok: true, alreadyRefunded: true }, { status: 200 });
    }

    return new NextResponse(`Refund error: ${msg}`, { status: 500 });
  }
}

/* ================================
   Helpers
================================ */
function toAmount(v?: any): number {
  const n = parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function sumRefunded(refunds: any): number {
  const arr: any[] = Array.isArray(refunds) ? refunds : refunds?._embedded?.refunds || [];
  return arr.reduce((sum, r) => sum + toAmount(r?.amount?.value), 0);
}

async function getMollieDashboardUrlSafe(paymentId: string): Promise<string | null> {
  try {
    const mp = await (mollie as any).payments.get(paymentId);
    return mp?._links?.dashboard?.href ?? null;
  } catch {
    return null;
  }
}
