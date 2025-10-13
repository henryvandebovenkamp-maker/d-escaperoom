import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Params = z.object({ bookingId: z.string().min(1) });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = Params.parse(await params); // ⬅️ belangrijk: await
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { partner: true, slot: true, customer: true, discountCode: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json(booking);
  } catch (err) {
    console.error("[GET /api/booking/[bookingId]]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
