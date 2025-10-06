// PATH: src/app/api/payments/mollie/webhook/route.ts
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { sendMail, bookingCustomerTemplate, bookingPartnerTemplate } from "@/lib/mail";
import mollieClient from "@mollie/api-client";

// Mollie client initialiseren
const mollie = mollieClient({ apiKey: process.env.MOLLIE_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();
    const paymentId = body.get("id")?.toString();

    if (!paymentId) {
      return new Response("missing payment id", { status: 400 });
    }

    // Ophalen actuele payment status bij Mollie
    const payment = await mollie.payments.get(paymentId);

    if (payment.status !== "paid") {
      return new Response("not paid", { status: 200 });
    }

    // Booking koppelen via metadata.bookingId
    const bookingId = (payment.metadata as any)?.bookingId;
    if (!bookingId) {
      return new Response("no booking metadata", { status: 400 });
    }

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { customer: true, partner: true, slot: true },
    });

    // Booking status bijwerken
    if (booking.status !== "CONFIRMED") {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          depositPaidAt: new Date(),
        },
      });
    }

    // Mail klant
    const custTmpl = bookingCustomerTemplate({
      booking,
      customer: booking.customer,
      partner: booking.partner,
      slot: {
        startTime: booking.slot.startTime.toISOString(),
        endTime: booking.slot.endTime.toISOString(),
      },
    });

    await sendMail({
      to: booking.customer.email,
      subject: custTmpl.subject,
      html: custTmpl.html,
      text: custTmpl.text,
    });

    // Mail partner (indien mail bekend)
    if (booking.partner.email) {
      const partnerTmpl = bookingPartnerTemplate({
        booking,
        partner: booking.partner,
        customer: booking.customer,
        slot: {
          startTime: booking.slot.startTime.toISOString(),
          endTime: booking.slot.endTime.toISOString(),
        },
      });

      await sendMail({
        to: booking.partner.email,
        subject: partnerTmpl.subject,
        html: partnerTmpl.html,
        text: partnerTmpl.text,
      });
    }

    return new Response("ok");
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("error", { status: 500 });
  }
}
