import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, dogName, dogAllergies, dogFears, dogTrackingLevel } = body ?? {};

    if (!bookingId) {
      return NextResponse.json({ ok: false, error: "MISSING_ID" }, { status: 400 });
    }

    // NB: deze velden moeten in je Prisma schema staan (zoals je eerder deelde).
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        dogName: dogName ?? null,
        dogFears: dogFears ?? null,
        dogTrackingLevel: dogTrackingLevel ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: booking.id }, { status: 200 });
  } catch (err: any) {
    console.error("[POST /api/booking/update-dog] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
