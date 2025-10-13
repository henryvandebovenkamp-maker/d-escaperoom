// PATH: src/app/api/booking/[bookingId]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { toBookingVM } from "../_dto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Params = z.object({ bookingId: z.string().min(1) });

export async function GET(_req: Request, ctx: { params: { bookingId: string } }) {
  try {
    const { bookingId } = Params.parse(ctx.params);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { partner: true, slot: true, customer: true, discountCode: true },
    });
    if (!booking) return NextResponse.json({ error: "Booking niet gevonden" }, { status: 404 });
    return NextResponse.json(toBookingVM(booking));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Onbekende fout" }, { status: 400 });
  }
}
