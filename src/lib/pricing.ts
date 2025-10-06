// PATH: src/lib/pricing.ts
export type PartnerLike = {
  feePercent: number;          // bv. 20
  price1PaxCents: number;      // bv. 4500
  price2PlusCents: number;     // bv. 6500
};

export type DiscountLike =
  | { type: "PERCENT"; percent: number }          // 0..100
  | { type: "FIXED"; amountCents: number };       // >= 0

// Pas aan indien gewenst
export const WEEKEND_SURCHARGE_PCT = 15; // %
export const EVENING_SURCHARGE_PCT = 10; // %
export const EVENING_START_HOUR = 18;    // 18:00 en later is avond

export function isWeekend(d: Date) {
  const day = d.getDay(); // 0 = zo, 6 = za
  return day === 0 || day === 6;
}
export function isEvening(d: Date) {
  return d.getHours() >= EVENING_START_HOUR;
}

function roundCents(n: number) {
  return Math.round(n);
}

/** Basisprijs + toeslagen (zonder korting, zonder aanbetaling) */
export function computeBaseTotalCents(
  partner: PartnerLike,
  slotStartISO: string,
  playersCount: number
) {
  const start = new Date(slotStartISO);
  const base = playersCount <= 1 ? partner.price1PaxCents : partner.price2PlusCents;

  let multiplier = 1;
  if (isWeekend(start)) multiplier += WEEKEND_SURCHARGE_PCT / 100;
  if (isEvening(start)) multiplier += EVENING_SURCHARGE_PCT / 100;

  const totalBeforeDiscountCents = roundCents(base * multiplier);

  return {
    totalBeforeDiscountCents,
    flags: {
      weekend: isWeekend(start),
      evening: isEvening(start),
    },
  };
}

/**
 * Volledige quote:
 * - korting over HET HELE BEDRAG (cap 20% van het totaal vóór korting)
 * - daarna aanbetaling en rest vanaf het GESCHAAFDE (discounted) totaal
 */
export function computeQuoteFromTotal(
  totalBeforeDiscountCents: number,
  partnerFeePercent: number,
  discount?: DiscountLike | null
) {
  const maxDiscountCents = roundCents(totalBeforeDiscountCents * 0.20); // max 20%

  let rawDiscountCents = 0;
  if (discount) {
    if ("percent" in discount) {
      rawDiscountCents = roundCents(totalBeforeDiscountCents * (discount.percent / 100));
    } else if ("amountCents" in discount) {
      rawDiscountCents = discount.amountCents ?? 0;
    }
  }
  const discountCents = Math.min(Math.max(rawDiscountCents, 0), maxDiscountCents);

  const totalAfterDiscountCents = Math.max(totalBeforeDiscountCents - discountCents, 0);

  const depositCents = roundCents(totalAfterDiscountCents * (partnerFeePercent / 100));
  const restCents = Math.max(totalAfterDiscountCents - depositCents, 0);

  return {
    totalBeforeCents: totalBeforeDiscountCents,
    discountCents,
    totalAfterCents: totalAfterDiscountCents,
    feePercent: partnerFeePercent,
    depositCents,
    restCents,
    maxDiscountCents,
  };
}
