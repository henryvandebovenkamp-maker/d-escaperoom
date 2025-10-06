// PATH: src/app/api/dev/mail-resend/route.ts
export const runtime = "nodejs"; // <— NODIG voor nodemailer

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  sendMail,
  bookingCustomerTemplate,
  bookingPartnerTemplate,
} from "@/lib/mail";

function assertAllowed(req: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const token = req.headers.get("x-dev-mail-token");
  if (!isDev && token !== process.env.DEV_MAIL_TOKEN) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export async function GET(req: NextRequest) {
  try {
    assertAllowed(req);

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId");
    const overrideTo = searchParams.get("to") || undefined; // optioneel

    if (!bookingId) {
      return Response.json({ error: "bookingId is required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, partner: true, slot: true },
    });
    if (!booking || !booking.customer || !booking.partner || !booking.slot) {
      return Response.json({ error: "Booking/relations not found" }, { status: 404 });
    }

    // klant
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
      to: overrideTo ?? booking.customer.email,
      subject: custTmpl.subject,
      html: custTmpl.html,
      text: custTmpl.text,
    });

    // partner (indien adres bekend)
    let partnerSent = false;
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
        to: overrideTo ?? booking.partner.email!,
        subject: partnerTmpl.subject,
        html: partnerTmpl.html,
        text: partnerTmpl.text,
      });
      partnerSent = true;
    }

    return Response.json({
      ok: true,
      bookingId,
      sent: {
        customer: overrideTo ?? booking.customer.email,
        partner: partnerSent ? (overrideTo ?? booking.partner.email) : null,
      },
    });
  } catch (err: any) {
    console.error("[mail-resend] error:", err);
    if (err instanceof Response) return err;
    return Response.json(
      { error: "Unexpected error", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
