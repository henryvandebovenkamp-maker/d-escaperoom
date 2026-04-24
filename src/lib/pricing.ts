// PATH: src/lib/pricing.ts
export type PartnerLike = {
  feePercent: number;
  price1PaxCents: number;
  price2PlusCents: number;
};

export type DiscountLike =
  | { type: "PERCENT"; percent: number }
  | { type: "FIXED"; amountCents: number };

export const FIXED_BOOKING_PRICE_CENTS = 7990;

function roundCents(n: number) {
  return Math.round(n);
}

/**
 * Vaste prijs:
 * The Missing Snack kost altijd €79,90 per boeking.
 * Aantal spelers heeft géén invloed op de prijs.
 */
export function computeBaseTotalCents(
  partner: PartnerLike,
  slotStartISO: string,
  playersCount: number
) {
  void partner;
  void slotStartISO;
  void playersCount;

  return {
    totalBeforeDiscountCents: FIXED_BOOKING_PRICE_CENTS,
    flags: {
      weekend: false,
      evening: false,
    },
  };
}

/**
 * Volledige quote:
 * - korting blijft ondersteund
 * - korting max 20%
 * - aanbetaling wordt berekend over het totaal na korting
 * - restbedrag blijft op locatie
 */
export function computeQuoteFromTotal(
  totalBeforeDiscountCents: number,
  partnerFeePercent: number,
  discount?: DiscountLike | null
) {
  const maxDiscountCents = roundCents(totalBeforeDiscountCents * 0.2);

  let rawDiscountCents = 0;

  if (discount) {
    if ("percent" in discount) {
      rawDiscountCents = roundCents(
        totalBeforeDiscountCents * (discount.percent / 100)
      );
    } else if ("amountCents" in discount) {
      rawDiscountCents = discount.amountCents ?? 0;
    }
  }

  const discountCents = Math.min(
    Math.max(rawDiscountCents, 0),
    maxDiscountCents
  );

  const totalAfterDiscountCents = Math.max(
    totalBeforeDiscountCents - discountCents,
    0
  );

  const depositCents = roundCents(
    totalAfterDiscountCents * (partnerFeePercent / 100)
  );

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