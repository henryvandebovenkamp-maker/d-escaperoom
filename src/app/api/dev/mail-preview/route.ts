// PATH: src/app/api/dev/mail-preview/route.ts
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  bookingCustomerTemplate,
  bookingPartnerTemplate,
  loginCodeTemplate,
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
    const type = searchParams.get("type"); // bookingCustomer | bookingPartner | loginCode
    if (!type) return new Response("type is required", { status: 400 });

    // ===== Booking templates =====
    if (type === "bookingCustomer" || type === "bookingPartner") {
      const bookingId = searchParams.get("bookingId");
      if (!bookingId) return new Response("bookingId is required", { status: 400 });

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { customer: true, partner: true, slot: true },
      });

      if (!booking || !booking.customer || !booking.partner || !booking.slot) {
        return new Response("Booking/relations not found", { status: 404 });
      }

      const slot = {
        startTime: booking.slot.startTime.toISOString(),
        endTime: booking.slot.endTime.toISOString(),
      };

      const tmpl =
        type === "bookingCustomer"
          ? bookingCustomerTemplate({
              booking,
              customer: booking.customer,
              partner: booking.partner,
              slot,
            })
          : bookingPartnerTemplate({
              booking,
              partner: booking.partner,
              customer: booking.customer,
              slot,
            });

      return new Response(tmpl.html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // ===== Login code preview =====
    if (type === "loginCode") {
      const email = searchParams.get("email") ?? "partner@example.com";
      const code = searchParams.get("code") ?? "123456";
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const tmpl = loginCodeTemplate(email, code, expires);

      return new Response(tmpl.html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Unknown type", { status: 400 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return new Response("Unexpected error", { status: 500 });
  }
}
