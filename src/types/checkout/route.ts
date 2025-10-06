// PATH: src/types/checkout.ts
export type PricingCents = {
  totalCents: number;
  depositCents: number;
  restCents: number;
};

export type InitialStatus = {
  bookingStatus: "PENDING" | "CONFIRMED" | "CANCELLED";
  lastPaymentStatus: "CREATED" | "PENDING" | "PAID" | "FAILED" | "CANCELED" | "REFUNDED" | null;
};
