// PATH: src/app/api/discounts/quote/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  computeBaseTotalCents,
  computeQuoteFromTotal,
  type DiscountLike,
} from "@/lib/pricing";

const BodySchema = z.object({
  bookingId: z.string().min(1),
  code: z.string().trim().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { bookingId, code } = BodySchema.parse(await req.json());

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            feePercent: true,
            price1PaxCents: true,
            price2PlusCents: true,
          },
        },
        slot: { select: { startTime: true } },
      },
    });

    if (!booking || !booking.partner || !booking.slot) {
      return NextResponse.json({ ok: false, error: "Boeking niet gevonden" }, { status: 404 });
    }

    const players =
      (booking as any).players ??
      (booking as any).playersCount ??
      booking.playersCount ??
      1;

    const { totalBeforeDiscountCents } = computeBaseTotalCents(
      booking.partner,
      booking.slot.startTime.toISOString?.() ?? String(booking.slot.startTime),
      players
    );

    // ===== KORTING (optioneel) =====
    let discountInput: DiscountLike | null = null;
    let codeInfo: any = null;

    if (code) {
      const discount = await prisma.discountCode.findFirst({
        where: {
          code: code.toUpperCase(),
          active: true,
          OR: [{ partnerId: undefined }, { partnerId: booking.partner.id }],
        },
      });

      if (discount) {
        const now = new Date();
        const withinWindow =
          (!discount.validFrom || discount.validFrom <= now) &&
          (!discount.validUntil || discount.validUntil >= now);
        const notExceeded =
          discount.maxRedemptions == null || discount.redeemedCount < discount.maxRedemptions;

        if (withinWindow && notExceeded) {
          if (discount.type === "PERCENT" && discount.percent != null) {
            discountInput = { type: "PERCENT", percent: discount.percent };
          } else if (discount.type === "FIXED" && discount.amountCents != null) {
            discountInput = { type: "FIXED", amountCents: discount.amountCents };
          }
          codeInfo = {
            id: discount.id,
            code: discount.code,
            type: discount.type,
            percent: discount.percent,
            amountCents: discount.amountCents,
          };
        }
      }
    }

    const quote = computeQuoteFromTotal(
      totalBeforeDiscountCents,
      booking.partner.feePercent,
      discountInput
    );

    return NextResponse.json({
      ok: true,
      ...quote,
      code: codeInfo,
      valid: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Onbekende fout" },
      { status: 400 }
    );
  }
}
