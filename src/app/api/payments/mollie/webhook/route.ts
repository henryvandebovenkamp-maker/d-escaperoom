// PATH: src/app/api/payments/mollie/webhook/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import createMollieClient from "@mollie/api-client";
import { sendMail, bookingCustomerTemplate, bookingPartnerTemplate } from "@/lib/mail";
import { PaymentStatus, PaymentProvider, PaymentType, SlotStatus } from "@prisma/client";

export const runtime = "nodejs";

/* ================================
   Config & helpers
================================== */

function verifySecret(req: NextRequest): boolean {
  const expected = (process.env.MOLLIE_WEBHOOK_SECRET || "").trim();
  if (!expected) return true;
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

/* ================================
   Webhook handler
================================== */
export async function POST(req: NextRequest) {
  try {
    if (!verifySecret(req)) {
      console.warn("[mollie-webhook] secret mismatch");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const body = await parseBody(req);
    const paymentId = (body?.id ?? body?.paymentId ?? body?.payment_id)?.toString();
    if (!paymentId) {
      console.warn("[mollie-webhook] missing payment id in payload:", body);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const mollie = mollieClient();
    const payment = await mollie.payments.get(paymentId);
    const bookingId = (payment.metadata as any)?.bookingId as string | undefined;

    const mappedStatus = mapPaymentStatus(payment.status);
    const paidAt =
      (payment as any)?.paidAt ? new Date((payment as any).paidAt as string) : undefined;
    const currency = payment.amount?.currency ?? "EUR";
    const amountCents = payment.amount?.value
      ? Math.round(Number(payment.amount.value) * 100)
      : 0;

    // ✅ serialize Mollie object zodat Prisma Json het accepteert
    let raw: any;
    try {
      raw = JSON.parse(JSON.stringify(payment));
    } catch {
      raw = {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        description: (payment as any)?.description,
        method: (payment as any)?.method,
        metadata: (payment as any)?.metadata,
        paidAt: (payment as any)?.paidAt,
        createdAt: (payment as any)?.createdAt,
        _links: (payment as any)?._links,
      };
    }

    // 4) Upsert Payment record (idempotent op providerPaymentId)
    await prisma.payment.upsert({
      where: { providerPaymentId: payment.id },
      create: {
        bookingId: bookingId ?? "",
        provider: PaymentProvider.MOLLIE,
        type: PaymentType.DEPOSIT,
        status: mappedStatus,
        providerPaymentId: payment.id,
        method: (payment as any)?.method ?? undefined,
        rawPayload: raw,
        currency,
        amountCents,
        paidAt,
      },
      update: {
        status: mappedStatus,
        method: (payment as any)?.method ?? undefined,
        rawPayload: raw,
        currency,
        amountCents,
        paidAt,
      },
    });

    if (!bookingId) {
      console.warn("[mollie-webhook] payment without bookingId metadata:", payment.id);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { partner: true, customer: true, slot: true },
    });
    if (!booking) {
      console.warn("[mollie-webhook] booking not found for id:", bookingId);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const isPaid = payment.status === "paid";
    const alreadyConfirmed = !!booking.confirmedAt || !!booking.depositPaidAt;

    if (isPaid && !alreadyConfirmed) {
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

      try {
        const slot = booking.slot!;
        const customer = booking.customer!;
        const partner = booking.partner!;

        const vars = {
          bookingId: booking.id,
          customerName: customer.name ?? null,
          customerEmail: customer.email,
          partnerName: partner.name,
          partnerEmail: partner.email ?? null,
          slotStartISO: slot.startTime.toISOString(),
          slotEndISO: slot.endTime.toISOString(),
          totalAmountCents: booking.totalAmountCents,
          depositAmountCents: booking.depositAmountCents,
          restAmountCents: booking.restAmountCents,
          locale: (customer.locale as string | null) ?? "nl",
          partnerAddressLine1: partner.addressLine1 ?? null,
          partnerCity: partner.city ?? null,
          partnerPostalCode: partner.postalCode ?? null,
          partnerPhone: partner.phone ?? null,
        };

        const custTmpl = bookingCustomerTemplate(vars as any);
        await sendMail({
          to: customer.email,
          subject: custTmpl.subject,
          html: custTmpl.html,
          text: custTmpl.text,
        });

        if (partner.email) {
          const partnerTmpl = bookingPartnerTemplate(vars as any);
          await sendMail({
            to: partner.email,
            subject: partnerTmpl.subject,
            html: partnerTmpl.html,
            text: partnerTmpl.text,
          });
        }
      } catch (e) {
        console.error("[mollie-webhook] mail failed:", e);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[mollie-webhook] error:", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
