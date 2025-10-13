// PATH: src/app/api/booking/[bookingId]/confirm/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Params = z.object({ bookingId: z.string().min(1) });

export async function POST(_req: Request, ctx: { params: { bookingId: string } }) {
  try {
    const { bookingId } = Params.parse(ctx.params);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return NextResponse.json({ error: "Booking niet gevonden" }, { status: 404 });

    // Alleen bevestigen als er betaald is (webhook is de bron van waarheid)
    if (!booking.depositPaidAt) {
      return NextResponse.json({ error: "Nog geen betaling geregistreerd" }, { status: 409 });
    }

    if (booking.status === "CONFIRMED") {
      return NextResponse.json({ ok: true, already: true });
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED, confirmedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bevestigen mislukt" }, { status: 400 });
  }
}
