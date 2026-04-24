// PATH: src/app/api/booking/price/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FIXED_BOOKING_PRICE_CENTS = 7990;

const BodySchema = z.object({
  partnerId: z.string().min(1),
  startTimeISO: z.string().min(1),
  playersCount: z.number().int().min(1).max(3),
});

function splitWithFee(totalCents: number, feePercent: number) {
  const deposit = Math.round((totalCents * Number(feePercent ?? 0)) / 100);
  const rest = Math.max(0, totalCents - deposit);

  return {
    totalCents,
    depositCents: deposit,
    restCents: rest,
  };
}

export async function POST(req: Request) {
  try {
    const input = BodySchema.parse(await req.json());

    const partner = await prisma.partner.findUnique({
      where: { id: input.partnerId },
    });

    if (!partner || partner.isActive === false) {
      return NextResponse.json(
        { ok: false, error: "PARTNER_NOT_FOUND_OR_INACTIVE" },
        { status: 404 }
      );
    }

    // Vaste prijs per boeking: €79,90
    // Aantal spelers blijft alleen registratie-info, geen prijsfactor.
    const pricing = splitWithFee(FIXED_BOOKING_PRICE_CENTS, partner.feePercent);

    const res = NextResponse.json({
      ok: true,
      partner: {
        id: partner.id,
        feePercent: partner.feePercent,
      },
      pricing,
    });

    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err: any) {
    console.error("[POST /api/booking/price] Error:", err);

    return NextResponse.json(
      { ok: false, error: err?.message || "UNKNOWN_ERROR" },
      { status: 400 }
    );
  }
}