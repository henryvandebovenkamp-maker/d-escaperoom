import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mollie } from "@/lib/mollie";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const providerPaymentId = searchParams.get("id") || "";

    if (!providerPaymentId) {
      return NextResponse.json({ ok: false, error: "Provide ?id=<providerPaymentId>" }, { status: 400 });
    }

    const dbPayment = await prisma.payment.findFirst({
      where: { providerPaymentId },
      include: { booking: true },
    });
    if (!dbPayment) return NextResponse.json({ ok: false, error: "Local payment not found" }, { status: 404 });

    const mp = await mollie.payments.get(providerPaymentId);

    const refundsAgg = await prisma.refund.aggregate({
      where: { paymentId: dbPayment.id },
      _sum: { amountCents: true },
    });

    return NextResponse.json({
      ok: true,
      bookingId: dbPayment.bookingId,
      local: {
        status: dbPayment.status,
        amountCents: dbPayment.amountCents,
        currency: dbPayment.currency,
        refundsSumCents: refundsAgg._sum.amountCents ?? 0,
      },
      mollie: {
        status: mp.status,
        method: mp.method,
        amount: mp.amount,
        amountRefunded: mp.amountRefunded ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "debug failed" }, { status: 500 });
  }
}
