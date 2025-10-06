import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const Body = z.object({ bookingId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { bookingId } = Body.parse(await req.json());
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        totalAmountCents: true,
        partner: { select: { feePercent: true } },
      },
    });
    if (!booking) return NextResponse.json({ ok: false, error: "BOOKING_NOT_FOUND" }, { status: 404 });
    if (booking.status !== "PENDING") return NextResponse.json({ ok: false, error: "BOOKING_NOT_EDITABLE" }, { status: 409 });

    const baseTotal = booking.totalAmountCents;
    const deposit = Math.round((baseTotal * Number(booking.partner.feePercent ?? 0)) / 100);
    const rest = Math.max(0, baseTotal - deposit);

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        discountCodeId: null,
        discountAmountCents: 0,
        depositAmountCents: deposit,
        restAmountCents: rest,
      },
      select: {
        id: true,
        totalAmountCents: true,
        discountAmountCents: true,
        depositAmountCents: true,
        restAmountCents: true,
      },
    });

    return NextResponse.json({
      ok: true,
      pricing: { ...updated, effectiveTotalCents: baseTotal },
    });
  } catch (e: any) {
    console.error("/api/booking/remove-discount error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "UNKNOWN_ERROR" }, { status: 400 });
  }
}
