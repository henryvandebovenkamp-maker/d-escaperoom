// PATH: src/app/api/booking/[bookingId]/send-emails/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { BookingStatus, PaymentStatus, PaymentType } from "@prisma/client";
import { sendCustomerBookingEmail, sendPartnerBookingEmail } from "@/lib/events/booking-confirmed";

export const runtime = "nodejs";

const Params = z.object({ bookingId: z.string().min(10) });
type Ctx = { params: Promise<{ bookingId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { bookingId } = Params.parse(await ctx.params);

    // Alleen door de return-pagina met secret header
    const required = process.env.INTERNAL_EMAIL_TRIGGER_TOKEN || "";
    if (required) {
      const got = req.headers.get("x-internal-email-trigger") || "";
      if (got !== required) {
        return NextResponse.json({ error: "Unauthorized trigger" }, { status: 401 });
      }
    }

    // Basis checks: booking bestaat + (CONFIRMED of deposit=PAID)
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, emailsSentAt: true },
    });
    if (!booking) return NextResponse.json({ error: "Booking niet gevonden" }, { status: 404 });

    // Idempotent no-op
    if (booking.emailsSentAt) return new NextResponse(null, { status: 204 });

    let paidOrConfirmed = booking.status === BookingStatus.CONFIRMED;
    if (!paidOrConfirmed) {
      const paidDeposit = await prisma.payment.findFirst({
        where: {
          bookingId,
          type: PaymentType.DEPOSIT,
          status: PaymentStatus.PAID,
        },
        select: { id: true },
      });
      paidOrConfirmed = !!paidDeposit;
    }
    if (!paidOrConfirmed) {
      return NextResponse.json({ error: "Nog niet betaald/bevestigd" }, { status: 409 });
    }

    // Atomic lock: claim verzending precies één keer
    const now = new Date();
    const lock = await prisma.booking.updateMany({
      where: { id: bookingId, emailsSentAt: null },
      data: { emailsSentAt: now },
    });
    if (lock.count === 0) return new NextResponse(null, { status: 204 });

    try {
      // Force = negeer guards in helpers (omdat lock al gezet is)
      await sendCustomerBookingEmail(bookingId, { force: true });
      await sendPartnerBookingEmail(bookingId, { force: true });

      // Safety set (mag dubbel)
      await prisma.booking.update({
        where: { id: bookingId },
        data: { emailsSentAt: new Date() },
      });

      return NextResponse.json({ ok: true }, { status: 201 });
    } catch (err) {
      // Rollback lock bij fout
      await prisma.booking.update({
        where: { id: bookingId },
        data: { emailsSentAt: null },
      });
      console.error("[send-emails] mail sending failed", err);
      return NextResponse.json({ error: "Mail sending failed" }, { status: 500 });
    }
  } catch (e) {
    console.error("[send-emails] route error", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
