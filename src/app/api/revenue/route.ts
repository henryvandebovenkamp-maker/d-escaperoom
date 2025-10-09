// PATH: src/app/api/revenue/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { Prisma, BookingStatus, PaymentStatus, PaymentType } from "@prisma/client";

/* =========================
   Helpers
========================= */
function makeStartOfDayUTC(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function tryParseJSON(s: unknown): any | null {
  if (!isNonEmptyString(s)) return null;
  const t = s.trim();
  if (!(t.startsWith("{") || t.startsWith("["))) return null;
  try { return JSON.parse(t); } catch { return null; }
}

const EXCLUDE_SCAN_KEYS = new Set(["partner", "slot", "payments", "refunds"]);
function deepFindName(obj: any, depth = 0): string | null {
  if (!obj || typeof obj !== "object" || depth > 4) return null;

  // 1) directe keys
  const direct = ["customerName","contactName","fullName","name"];
  for (const k of direct) {
    const v = obj[k];
    if (isNonEmptyString(v)) return v.trim();
  }

  // 2) combinaties
  const combos: Array<[string,string]> = [
    ["firstName","lastName"],
    ["customerFirstName","customerLastName"],
    ["contactFirstName","contactLastName"],
    ["voornaam","achternaam"],
  ];
  for (const [a,b] of combos) {
    const A = isNonEmptyString(obj[a]) ? obj[a].trim() : "";
    const B = isNonEmptyString(obj[b]) ? obj[b].trim() : "";
    const joined = [A,B].filter(Boolean).join(" ");
    if (joined.length > 1) return joined;
  }

  // 3) generieke *name velden + JSON strings
  for (const k of Object.keys(obj)) {
    if (EXCLUDE_SCAN_KEYS.has(k)) continue;
    const v = obj[k];
    if (/name/i.test(k) && isNonEmptyString(v)) return v.trim();

    const parsed = tryParseJSON(v);
    if (parsed) {
      const hit = deepFindName(parsed, depth + 1);
      if (hit) return hit;
    }
  }

  // 4) semantische subobjecten
  const candidates = ["customer","contact","billing","payer","user","owner","metadata","data","details","form","answers"];
  for (const k of candidates) {
    if (obj[k]) {
      const hit = deepFindName(obj[k], depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}
function resolveCustomerName(b: unknown): string | null {
  const fromBooking = deepFindName(b);
  if (isNonEmptyString(fromBooking)) return fromBooking;

  // fallback: scan payments (deze zitten included)
  const hasPayments = b as { payments?: Array<Record<string, unknown>> } | undefined;
  if (Array.isArray(hasPayments?.payments)) {
    for (const p of hasPayments.payments) {
      const fromPayment = deepFindName(p);
      if (isNonEmptyString(fromPayment)) return fromPayment;
    }
  }
  return null;
}

/* =========================
   Prisma result types (inferred)
========================= */
type BookingWithRels = Prisma.BookingGetPayload<{
  include: {
    partner: { select: { id: true; name: true; slug: true; feePercent: true } };
    slot: { select: { startTime: true } };
    payments: {
      where: { type: PaymentType; status: PaymentStatus };
      select: { id: true; amountCents: true; currency: true; provider: true };
    };
  };
}>;

/* =========================
   Response types naar de UI
========================= */
type RevenueItem = {
  id: string;
  date: string | null;              // ISO
  partnerName: string | null;
  partnerSlug: string | null;
  customerName?: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";
  currency: string;
  totalAmountCents: number;
  platformFeeCents: number;
  partnerFeeCents: number;
  discountCents: number;
  refundedAmountCents?: number | null;
};

type SummaryBlock = {
  totalTurnoverCents: number;
  totalPlatformFeeCents: number;
  totalPartnerFeeCents: number;
  totalDiscountsCents: number;
  currency: string;
  count: number;
};

type RevenueResp = {
  ok: boolean;
  filters: {
    partnerSlug: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    status: "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";
    timeField: "slot" | "created";
  };
  summary: SummaryBlock;
  items: RevenueItem[];
  summaryAll: SummaryBlock;
  summaryByStatus: Record<"PENDING"|"CONFIRMED"|"CANCELLED"|"REFUNDED", Omit<SummaryBlock, "currency">>;
  cancellationsCount: number;
  refundsTotalCents: number;
  currency: string;
};

/* =========================
   GET
========================= */
export async function GET(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const rawStatus = (searchParams.get("status") || "CONFIRMED").toUpperCase();
  const statusParam: "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED" =
    rawStatus === "ALL" || rawStatus === "PENDING" || rawStatus === "CONFIRMED" || rawStatus === "CANCELLED" || rawStatus === "REFUNDED"
      ? (rawStatus as any)
      : "CONFIRMED";

  const partnerSlug = searchParams.get("partnerSlug") || null;
  const dateFrom = searchParams.get("dateFrom") || null; // YYYY-MM-DD
  const dateTo   = searchParams.get("dateTo")   || null; // YYYY-MM-DD (exclusief)

  const timeFieldRaw = (searchParams.get("timeField") || "slot").toLowerCase();
  const timeField: "slot" | "created" = timeFieldRaw === "created" ? "created" : "slot";

  /* -------------------------
     Scope: partner
  ------------------------- */
  let partnerWhere: { partnerId?: string } = {};
  if (u.role === "PARTNER" && u.partnerId) {
    partnerWhere.partnerId = u.partnerId;
  } else if (u.role === "ADMIN" && partnerSlug) {
    const partner = await prisma.partner.findUnique({
      where: { slug: partnerSlug },
      select: { id: true },
    });
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    partnerWhere.partnerId = partner.id;
  }

  /* -------------------------
     Datumfilter
  ------------------------- */
  const whereByTime =
    dateFrom || dateTo
      ? (timeField === "created"
          ? {
              createdAt: {
                ...(dateFrom ? { gte: makeStartOfDayUTC(dateFrom) } : {}),
                ...(dateTo   ? { lt:  makeStartOfDayUTC(dateTo)   } : {}),
              },
            }
          : {
              // relationele filter via { is: { ... } }
              slot: {
                is: {
                  startTime: {
                    ...(dateFrom ? { gte: makeStartOfDayUTC(dateFrom) } : {}),
                    ...(dateTo   ? { lt:  makeStartOfDayUTC(dateTo)   } : {}),
                  },
                },
              },
            })
      : {};

  /* -------------------------
     Boekingen + betaalde DEPOSIT
     (include => alle scalar velden + geselecteerde relaties)
  ------------------------- */
  const bookings = await prisma.booking.findMany({
    where: { ...partnerWhere, ...whereByTime },
    orderBy: { createdAt: "desc" },
    include: {
      partner: { select: { id: true, name: true, slug: true, feePercent: true } },
      slot: { select: { startTime: true } },
      payments: {
        where: { type: PaymentType.DEPOSIT, status: PaymentStatus.PAID },
        select: { id: true, amountCents: true, currency: true, provider: true },
      },
    },
  }) as BookingWithRels[];

  /* -------------------------
     Refunds groeperen per booking
  ------------------------- */
  const bookingIds = bookings.map(b => b.id);
  const refundWhere: Prisma.RefundWhereInput | undefined =
    bookingIds.length
      ? {
          bookingId: { in: bookingIds },
          ...(timeField === "created" && (dateFrom || dateTo)
            ? {
                createdAt: {
                  ...(dateFrom ? { gte: makeStartOfDayUTC(dateFrom) } : {}),
                  ...(dateTo   ? { lt:  makeStartOfDayUTC(dateTo)   } : {}),
                },
              }
            : {}),
        }
      : undefined;

  const refundGroups = bookingIds.length
    ? await prisma.refund.groupBy({
        by: ["bookingId"],
        where: refundWhere,
        _sum: { amountCents: true },
      })
    : [];

  const refundMap = new Map<string, number>();
  for (const g of refundGroups) {
    const cents = typeof g._sum.amountCents === "number" ? g._sum.amountCents : 0;
    refundMap.set(g.bookingId, cents);
  }

  /* -------------------------
     Normalisatie naar rows
  ------------------------- */
  type Row = {
    id: string;
    date: Date | null;
    partnerName: string | null;
    partnerSlug: string | null;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";
    currency: string;
    totalAmountCents: number;
    platformFeeCents: number;
    partnerFeeCents: number;
    discountCents: number;
    refundedAmountCents: number;
    customerName: string | null;
  };

  const rowsAll: Row[] = bookings.map((b): Row => {
    const total = b.totalAmountCents ?? 0;

    const depositListed = b.depositAmountCents ?? 0;
    const depositPaid = b.payments.reduce((sum, p) => sum + (p.amountCents ?? 0), 0);
    const platformFee = depositPaid > depositListed ? depositPaid : depositListed;

    const rest = b.restAmountCents ?? 0;
    const discount = b.discountAmountCents ?? 0;
    const giftApplied = b.giftCardAppliedCents ?? 0;
    const partnerNet = Math.max(0, rest - discount - giftApplied);

    const refunded = refundMap.get(b.id) ?? 0;

    let effectiveStatus: Row["status"];
    if (refunded > 0) {
      effectiveStatus = "REFUNDED";
    } else if (b.status === BookingStatus.PENDING) {
      effectiveStatus = "PENDING";
    } else if (b.status === BookingStatus.CANCELLED) {
      effectiveStatus = "CANCELLED";
    } else {
      effectiveStatus = "CONFIRMED";
    }

    const currency = b.currency ?? (b.payments[0]?.currency ?? "EUR");

    return {
      id: b.id,
      date: b.slot?.startTime ?? null,
      partnerName: b.partner?.name ?? null,
      partnerSlug: b.partner?.slug ?? null,
      status: effectiveStatus,
      currency,
      totalAmountCents: total,
      platformFeeCents: platformFee,
      partnerFeeCents: partnerNet,
      discountCents: discount,
      refundedAmountCents: refunded,
      customerName: resolveCustomerName(b),
    };
  });

  /* -------------------------
     Status-filter voor tabel
  ------------------------- */
  const rowsFiltered: Row[] =
    statusParam === "ALL" ? rowsAll : rowsAll.filter(r => r.status === statusParam);

  /* -------------------------
     Aggregaties
  ------------------------- */
  function emptyAgg() {
    return {
      count: 0,
      totalTurnoverCents: 0,
      totalPlatformFeeCents: 0,
      totalPartnerFeeCents: 0,
      totalDiscountsCents: 0,
    };
  }

  const summaryByStatus: Record<"PENDING"|"CONFIRMED"|"CANCELLED"|"REFUNDED", ReturnType<typeof emptyAgg>> = {
    PENDING:  emptyAgg(),
    CONFIRMED: emptyAgg(),
    CANCELLED: emptyAgg(),
    REFUNDED: emptyAgg(),
  };

  for (const r of rowsAll) {
    const b = summaryByStatus[r.status];
    b.count += 1;
    b.totalTurnoverCents += r.totalAmountCents;
    b.totalPlatformFeeCents += r.platformFeeCents;
    b.totalPartnerFeeCents += r.partnerFeeCents;
    b.totalDiscountsCents += r.discountCents;
  }

  const summaryFiltered: SummaryBlock = rowsFiltered.reduce<SummaryBlock>(
    (acc, r) => ({
      ...acc,
      totalTurnoverCents:   acc.totalTurnoverCents   + r.totalAmountCents,
      totalPlatformFeeCents:acc.totalPlatformFeeCents+ r.platformFeeCents,
      totalPartnerFeeCents: acc.totalPartnerFeeCents + r.partnerFeeCents,
      totalDiscountsCents:  acc.totalDiscountsCents  + r.discountCents,
      count: acc.count + 1,
    }),
    { totalTurnoverCents: 0, totalPlatformFeeCents: 0, totalPartnerFeeCents: 0, totalDiscountsCents: 0, currency: "EUR", count: 0 }
  );

  const summaryAll: SummaryBlock = rowsAll.reduce<SummaryBlock>(
    (acc, r) => ({
      ...acc,
      totalTurnoverCents:   acc.totalTurnoverCents   + r.totalAmountCents,
      totalPlatformFeeCents:acc.totalPlatformFeeCents+ r.platformFeeCents,
      totalPartnerFeeCents: acc.totalPartnerFeeCents + r.partnerFeeCents,
      totalDiscountsCents:  acc.totalDiscountsCents  + r.discountCents,
      count: acc.count + 1,
    }),
    { totalTurnoverCents: 0, totalPlatformFeeCents: 0, totalPartnerFeeCents: 0, totalDiscountsCents: 0, currency: "EUR", count: 0 }
  );

  const cancellationsCount = summaryByStatus.CANCELLED.count;

  // refundsTotalCents
  const refundsTotalCents =
    timeField === "created" && (dateFrom || dateTo)
      ? refundGroups.reduce((s, g) => s + (g._sum.amountCents ?? 0), 0)
      : rowsAll.reduce((s, r) => s + r.refundedAmountCents, 0);

  /* -------------------------
     Response
  ------------------------- */
  const resp: RevenueResp = {
    ok: true,
    filters: { partnerSlug, dateFrom, dateTo, status: statusParam, timeField },
    summary: summaryFiltered,
    items: rowsFiltered.map<RevenueItem>((r) => ({
      id: r.id,
      date: r.date ? new Date(r.date).toISOString() : null,
      partnerName: r.partnerName,
      partnerSlug: r.partnerSlug,
      customerName: r.customerName ?? null,
      status: r.status,
      currency: r.currency,
      totalAmountCents: r.totalAmountCents,
      platformFeeCents: r.platformFeeCents,
      partnerFeeCents: r.partnerFeeCents,
      discountCents: r.discountCents,
      refundedAmountCents: r.refundedAmountCents > 0 ? r.refundedAmountCents : null,
    })),
    summaryAll,
    summaryByStatus,
    cancellationsCount,
    refundsTotalCents,
    currency: "EUR",
  };

  return NextResponse.json(resp);
}
