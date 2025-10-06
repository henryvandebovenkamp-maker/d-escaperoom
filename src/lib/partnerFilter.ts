// Gebruik deze helper in je server pages en API's om netjes te filteren op partner slug.
export function whereByPartnerSlug<T extends object>(
  slug?: string | null,
  extra?: T
) {
  if (!slug) return { ...(extra as any) };
  // Voor modellen die via relatie `partner` lopen:
  return { ...(extra as any), partner: { slug } };
}

/** Variant voor modellen die direct een foreign key hebben (optioneel) */
export function whereByPartnerId<T extends object>(partnerId?: string | null, extra?: T) {
  if (!partnerId) return { ...(extra as any) };
  return { ...(extra as any), partnerId };
}
