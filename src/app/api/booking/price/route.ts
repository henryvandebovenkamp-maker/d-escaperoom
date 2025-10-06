import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BodySchema = z.object({
  partnerId: z.string().min(1),
  startTimeISO: z.string().min(1),          // voor later (avond/weekend); nu niet gebruikt
  playersCount: z.number().int().min(1).max(3),
});

function computeTotalFromPartner(partner: any, players: number) {
  const p1 = Number(partner?.price1PaxCents ?? 0);
  const p2 = Number(partner?.price2PlusCents ?? 0);

  if (players <= 1) return p1;
  return p2 * players; // vanaf 2 personen: prijs per persoon
}

function splitWithFee(totalCents: number, feePercent: number) {
  const deposit = Math.round((totalCents * Number(feePercent ?? 0)) / 100);
  const rest = Math.max(0, totalCents - deposit);
  return { totalCents, depositCents: deposit, restCents: rest };
}

export async function POST(req: Request) {
  try {
    const input = BodySchema.parse(await req.json());

    const partner = await prisma.partner.findUnique({
      where: { id: input.partnerId },
    });
    if (!partner || partner.isActive === false) {
      return NextResponse.json({ ok: false, error: "PARTNER_NOT_FOUND_OR_INACTIVE" }, { status: 404 });
    }

    const total = computeTotalFromPartner(partner, input.playersCount);
    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ ok: false, error: "INVALID_PARTNER_PRICING" }, { status: 400 });
    }

    const pricing = splitWithFee(total, partner.feePercent);
    const res = NextResponse.json({
      ok: true,
      partner: { id: partner.id, feePercent: partner.feePercent },
      pricing, // { totalCents, depositCents, restCents }
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err: any) {
    console.error("[POST /api/booking/price] Error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "UNKNOWN_ERROR" }, { status: 400 });
  }
}
