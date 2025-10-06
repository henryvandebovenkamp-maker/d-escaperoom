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

// (Optioneel) eenvoudige shared-secret check om willekeurige hits te voorkomen.
// Zet MOLLIE_WEBHOOK_SECRET in Vercel en geef 'm mee in je create()-route als query (?s=...).
function verifySecret(req: NextRequest): boolean {
  const expected = (process.env.MOLLIE_WEBHOOK_SECRET || "").trim();
  if (!expected) return true; // geen secret geconfigureerd → sla check over
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
    // 0) Secret guard (optioneel)
    if (!verifySecret(req)) {
      // Antwoord 200 (Mollie verwacht 200), maar log het.
      console.warn("[mollie-webhook] secret mismatch");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 1) Body parsen en payment id ophalen
    const body = await parseBody(req);
    const paymentId = (body?.id ?? body?.paymentId ?? body?.payment_id)?.toString();
    if (!paymentId) {
      // Geen id? Altijd 200 geven zodat Mollie niet blijft retried, maar wel loggen.
      console.warn("[mollie-webhook] missing payment id in payload:", body);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 2) Payment ophalen bij Mollie
    const mollie = mollieClient();
    const payment = await mollie.payments.get(paymentId);
    const bookingId = (payment.metadata as any)?.bookingId as string | undefined;

    // 3) Payment-status en bedragen
    const mappedStatus = mapPaymentStatus(payment.status);
    const paidAt =
      (payment as any)?.paidAt ? new Date((payment as any).paidAt as string) : undefined;
    const currency = payment.amount?.currency ?? "EUR";
    const amountCents = payment.amount?.value
      ? Math.round(Number(payment.amount.value) * 100)
      : undefined;

    // 4) Upsert Payment record (idempotent op providerPaymentId)
    await prisma.payment.upsert({
      where: { providerPaymentId: payment.id },
      create: {
        bookingId: bookingId ?? "", // jouw schema vereist een bookingId; als metadata ontbreekt, zet lege string en we borgen met check hieronder
        provider: PaymentProvider.MOLLIE,
        type: PaymentType.DEPOSIT,
        status: mappedStatus,
        providerPaymentId: payment.id,
        method: (payment as any)?.method ?? undefined,
        rawPayload: payment as any,
        currency,
        amountCents: amountCents ?? 0,
        paidAt,
      },
      update: {
        status: mappedStatus,
        method: (payment as any)?.method ?? undefined,
        rawPayload: payment as any,
        currency,
        amountCents: amountCents ?? undefined,
        paidAt,
      },
    });

    // 5) Zonder bookingId kunnen we niet verder; wel 200 teruggeven
    if (!bookingId) {
      console.warn("[mollie-webhook] payment without bookingId metadata:", payment.id);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 6) Booking + slot ophalen
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { partner: true, customer: true, slot: true },
    });
    if (!booking) {
      console.warn("[mollie-webhook] booking not found for id:", bookingId);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 7) Op PAID: bevestigen + slot boeken (idempotent; via transaction)
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

      // 8) E-mails versturen (fouten mogen webhook niet laten falen)
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

    // Altijd 200 OK teruggeven aan Mollie
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    // Webhooks mogen nooit 4xx/5xx blijven geven — Mollie zal anders blijven retried.
    console.error("[mollie-webhook] error:", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
