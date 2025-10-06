// PATH: src/app/api/revenue/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { BookingStatus, PaymentStatus } from "@prisma/client";

/**
 * Query params:
 * - partnerSlug?: string   (ADMIN kan filteren; PARTNER genegeerd en geforceerd op eigen partner)
 * - dateFrom?: YYYY-MM-DD
 * - dateTo?:   YYYY-MM-DD   (exclusieve upper bound)
 * - status?:   "CONFIRMED" | "PENDING" | "CANCELLED" | "REFUNDED" | "ALL" (default: "CONFIRMED")
 * - timeField?: "slot" | "created"  (default: "slot")
 */
export async function GET(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const rawStatus = (searchParams.get("status") || "CONFIRMED").toUpperCase();
  const statusParam: "ALL" | BookingStatus =
    rawStatus === "ALL" ||
    rawStatus === "CONFIRMED" ||
    rawStatus === "PENDING" ||
    rawStatus === "CANCELLED" ||
    rawStatus === "REFUNDED"
      ? (rawStatus as any)
      : "CONFIRMED";

  const partnerSlug = searchParams.get("partnerSlug") || null;
  const dateFrom = searchParams.get("dateFrom") || null;
  const dateTo = searchParams.get("dateTo") || null;

  const timeFieldRaw = (searchParams.get("timeField") || "slot").toLowerCase();
  const timeField: "slot" | "created" = timeFieldRaw === "created" ? "created" : "slot";

  // ---- Scope afdwingen (ADMIN mag partner kiezen; PARTNER geforceerd op eigen partner) ----
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

  // ---- Datumfilter (speeldatum of boekingsdatum) ----
  const makeBound = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
  const timeWhere =
    dateFrom || dateTo
      ? timeField === "created"
        ? {
            createdAt: {
              ...(dateFrom ? { gte: makeBound(dateFrom) } : {}),
              ...(dateTo ? { lt: makeBound(dateTo) } : {}),
            },
          }
        : {
            slot: {
              startTime: {
                ...(dateFrom ? { gte: makeBound(dateFrom) } : {}),
                ...(dateTo ? { lt: makeBound(dateTo) } : {}),
              },
            },
          }
      : {};

  // ---- Select shape (hergebruiken) ----
  const bookingSelect = {
    id: true,
    status: true,
    currency: true,
    totalAmountCents: true,
    depositAmountCents: true,
    restAmountCents: true,
    discountAmountCents: true,
    giftCardAppliedCents: true,
    confirmedAt: true,
    depositPaidAt: true,
    createdAt: true,
    slot: { select: { startTime: true } },
    partner: { select: { id: true, name: true, slug: true, feePercent: true } },
    payments: {
      where: { type: "DEPOSIT", status: PaymentStatus.PAID },
      select: { amountCents: true },
    },
  } as const;

  // ---- 1) Haal ALLE boekingen binnen de partner/periode/datumkeuze op (géén statusfilter) ----
  const bookingsAll = await prisma.booking.findMany({
    where: {
      ...partnerWhere,
      ...timeWhere,
    },
    orderBy: { createdAt: "desc" },
    select: bookingSelect,
  });

  // ---- Helper: normaliseer 1 booking naar een "row" + geef ook computed bedragen terug ----
  type Row = {
    id: string;
    date: Date | null;
    partnerName: string | null;
    partnerSlug: string | null;
    feePercent: number | null;
    status: BookingStatus | "REFUNDED";
    currency: string;
    totalAmountCents: number;
    platformFeeCents: number;
    partnerFeeCents: number;
    discountCents: number;
    giftCardAppliedCents: number;
    confirmedAt: Date | null;
  };

  function toRow(b: (typeof bookingsAll)[number]): Row {
    const total = b.totalAmountCents ?? 0;
    const depositListed = b.depositAmountCents ?? 0;
    const depositPaid = (b.payments || []).reduce((s, p) => s + (p.amountCents || 0), 0);
    const deposit = Math.max(depositPaid, depositListed);

    const rest = b.restAmountCents ?? 0;
    const discount = b.discountAmountCents ?? 0;
    const giftApplied = b.giftCardAppliedCents ?? 0;

    const partnerNet = Math.max(0, rest - discount - giftApplied);

    return {
      id: b.id,
      date: b.slot?.startTime ?? null,
      partnerName: b.partner?.name ?? null,
      partnerSlug: b.partner?.slug ?? null,
      feePercent: b.partner?.feePercent ?? null,
      status: b.status as Row["status"],
      currency: b.currency,
      totalAmountCents: total,
      platformFeeCents: deposit,
      partnerFeeCents: partnerNet,
      discountCents: discount,
      giftCardAppliedCents: giftApplied,
      confirmedAt: b.confirmedAt,
    };
  }

  const rowsAll: Row[] = bookingsAll.map(toRow);

  // ---- 2) Filter de items voor de tabel op de gevraagde status ----
  const rowsFiltered =
    statusParam === "ALL" ? rowsAll : rowsAll.filter((r) => r.status === statusParam);

  // ---- 3) Aggregaties (filtered) voor backwards compatibility met bestaande UI ----
  const summaryFiltered = rowsFiltered.reduce(
    (acc, r) => {
      acc.totalTurnoverCents += r.totalAmountCents;
      acc.totalPlatformFeeCents += r.platformFeeCents;
      acc.totalPartnerFeeCents += r.partnerFeeCents;
      acc.totalDiscountsCents += r.discountCents;
      acc.count += 1;
      return acc;
    },
    {
      totalTurnoverCents: 0,
      totalPlatformFeeCents: 0,
      totalPartnerFeeCents: 0,
      totalDiscountsCents: 0,
      currency: "EUR",
      count: 0,
    }
  );

  // ---- 4) Extra: status-onafhankelijke samenvattingen (robuste KPI's) ----
  const statuses: BookingStatus[] = ["PENDING", "CONFIRMED", "CANCELLED"];
  // Op veel plekken wil je REFUNDED apart kunnen tellen:
  const refundedRows = rowsAll.filter((r) => r.status === "REFUNDED");

  const makeEmpty = () => ({
    count: 0,
    totalTurnoverCents: 0,
    totalPlatformFeeCents: 0,
    totalPartnerFeeCents: 0,
    totalDiscountsCents: 0,
  });

  const summaryByStatus: Record<
    BookingStatus | "REFUNDED",
    ReturnType<typeof makeEmpty>
  > = {
    PENDING: makeEmpty(),
    CONFIRMED: makeEmpty(),
    CANCELLED: makeEmpty(),
    REFUNDED: makeEmpty(),
  };

  for (const r of rowsAll) {
    const bucket = summaryByStatus[r.status] ?? summaryByStatus.CONFIRMED;
    bucket.count += 1;
    bucket.totalTurnoverCents += r.totalAmountCents;
    bucket.totalPlatformFeeCents += r.platformFeeCents;
    bucket.totalPartnerFeeCents += r.partnerFeeCents;
    bucket.totalDiscountsCents += r.discountCents;
  }

  // Totale samenvatting over alle statussen
  const summaryAll = rowsAll.reduce(
    (acc, r) => {
      acc.totalTurnoverCents += r.totalAmountCents;
      acc.totalPlatformFeeCents += r.platformFeeCents;
      acc.totalPartnerFeeCents += r.partnerFeeCents;
      acc.totalDiscountsCents += r.discountCents;
      acc.count += 1;
      return acc;
    },
    {
      totalTurnoverCents: 0,
      totalPlatformFeeCents: 0,
      totalPartnerFeeCents: 0,
      totalDiscountsCents: 0,
      currency: "EUR",
      count: 0,
    }
  );

  // Handige shortcuts voor UI
  const cancellationsCount = summaryByStatus.CANCELLED.count;
  const refundsTotalCents = refundedRows.reduce(
    (acc, r) => acc + r.platformFeeCents,
    0
  );

  return NextResponse.json({
    ok: true,
    filters: { partnerSlug, dateFrom, dateTo, status: statusParam, timeField },
    // Bestaande keys (blijven werken voor je huidige UI/tabel)
    summary: summaryFiltered,
    items: rowsFiltered,
    // Nieuwe, robuuste blokken voor KPI's
    summaryAll,
    summaryByStatus,
    cancellationsCount,
    refundsTotalCents,
    currency: "EUR",
  });
}
