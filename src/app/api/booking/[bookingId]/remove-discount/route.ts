// PATH: src/app/api/booking/[bookingId]/remove-discount/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { toBookingVM } from "../../_dto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Params = z.object({ bookingId: z.string().min(1) });

export async function POST(_req: Request, ctx: { params: { bookingId: string } }) {
  try {
    const { bookingId } = Params.parse(ctx.params);
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { discountAmountCents: 0, discountCodeId: null } as any,
      include: { partner: true, slot: true, customer: true, discountCode: true },
    });
    return NextResponse.json({ ok: true, booking: toBookingVM(updated) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Kon kortingscode niet verwijderen" }, { status: 400 });
  }
}
