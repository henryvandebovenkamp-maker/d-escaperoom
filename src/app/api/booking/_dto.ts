// PATH: src/app/api/booking/_dto.ts
import type { Booking, Partner, Slot, Customer, DiscountCode } from "@prisma/client";

export type BookingVM = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  partner?: { name: string; feePercent: number } | null;
  slot?: { startTime: string } | null;
  customer?: { name: string | null; email: string } | null;
  playersCount: number;
  totalAmountCents: number;
  depositAmountCents: number;
  restAmountCents: number;
  dogName?: string | null;
  dogAllergies?: string | null;
  dogFears?: string | null;
  dogTrackingLevel?: string | null;
  discountCode?: { code: string } | null;
  discountAmountCents?: number | null;
};

export function toBookingVM(b: Booking & {
  partner?: Partner | null;
  slot?: Slot | null;
  customer?: Customer | null;
  discountCode?: DiscountCode | null;
}): BookingVM {
  const total = Number((b as any).totalAmountCents ?? 0);
  const deposit = Number((b as any).depositAmountCents ?? 0);
  const rest = Number((b as any).restAmountCents ?? Math.max(total - deposit, 0));
  return {
    id: b.id,
    status: b.status as any,
    partner: b.partner ? { name: b.partner.name, feePercent: Number((b as any).partner.feePercent ?? 0) } : null,
    slot: b.slot ? { startTime: b.slot.startTime.toISOString?.() ?? String((b.slot as any).startTime) } : null,
    customer: b.customer ? { name: b.customer.name ?? null, email: b.customer.email } : null,
    playersCount: Number((b as any).playersCount ?? (b as any).players ?? 1),
    totalAmountCents: total,
    depositAmountCents: deposit,
    restAmountCents: rest,
    dogName: (b as any).dogName ?? null,
    dogAllergies: (b as any).dogAllergies ?? null,
    dogFears: (b as any).dogFears ?? null,
    dogTrackingLevel: (b as any).dogTrackingLevel ?? null,
    discountCode: b.discountCode ? { code: b.discountCode.code } : null,
    discountAmountCents: (b as any).discountAmountCents ?? 0,
  };
}
