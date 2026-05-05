// PATH: src/app/api/agenda/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  BookingStatus,
  PaymentStatus,
  PaymentType,
  type Prisma,
} from "@prisma/client";
import jwt from "jsonwebtoken";
import { fromZonedTime } from "date-fns-tz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Role = "ADMIN" | "PARTNER";
type JWTPayload = { sub: string; role: Role; [k: string]: unknown };
type AgendaScope = "day" | "week" | "month";

const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY = "de_session";
const SECRET = process.env.SESSION_SECRET || "";
const TIMEZONE = "Europe/Amsterdam";

function readCookieFromHeader(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function readSession(req: Request): JWTPayload | null {
  const token =
    readCookieFromHeader(req, COOKIE_PRIMARY) ||
    readCookieFromHeader(req, COOKIE_LEGACY);

  if (!token || !SECRET) return null;

  try {
    const payload = jwt.verify(token, SECRET) as JWTPayload;
    if (!payload?.sub || !payload?.role) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseYMD(ymd: string | null) {
  const fallback = new Date();
  const fallbackYMD = `${fallback.getFullYear()}-${String(
    fallback.getMonth() + 1
  ).padStart(2, "0")}-${String(fallback.getDate()).padStart(2, "0")}`;

  const value = ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : fallbackYMD;
  const [year, month, day] = value.split("-").map(Number);

  return { year, month, day, ymd: value };
}

function toYMD(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDaysYMD(ymd: string, amount: number) {
  const { year, month, day } = parseYMD(ymd);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return toYMD(date);
}

function addMonthsYMD(ymd: string, amount: number) {
  const { year, month } = parseYMD(ymd);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-01`;
}

function startOfAmsterdamDayUtc(ymd: string) {
  return fromZonedTime(`${ymd} 00:00:00`, TIMEZONE);
}

function parseDateRange(scopeRaw: string | null, ymdRaw: string | null) {
  const scope = (
    ["day", "week", "month"].includes((scopeRaw ?? "").toLowerCase())
      ? (scopeRaw ?? "day").toLowerCase()
      : "day"
  ) as AgendaScope;

  const { year, month, day, ymd } = parseYMD(ymdRaw);

  if (scope === "week") {
    const pivot = new Date(year, month - 1, day);
    const dow = pivot.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;

    const startYMD = addDaysYMD(ymd, diff);
    const endYMD = addDaysYMD(startYMD, 7);

    return {
      scope,
      start: startOfAmsterdamDayUtc(startYMD),
      end: startOfAmsterdamDayUtc(endYMD),
    };
  }

  if (scope === "month") {
    const startYMD = `${year}-${String(month).padStart(2, "0")}-01`;
    const endYMD = addMonthsYMD(startYMD, 1);

    return {
      scope,
      start: startOfAmsterdamDayUtc(startYMD),
      end: startOfAmsterdamDayUtc(endYMD),
    };
  }

  const endYMD = addDaysYMD(ymd, 1);

  return {
    scope,
    start: startOfAmsterdamDayUtc(ymd),
    end: startOfAmsterdamDayUtc(endYMD),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = readSession(req);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = session.role;
    const subject = String(session.sub);

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");
    const date = searchParams.get("date");
    const includeCancelled =
      (searchParams.get("includeCancelled") ?? "false").toLowerCase() ===
      "true";

    const partnerSlugQuery = (searchParams.get("partner") || "").trim() || null;
    const partnerSlugHeader =
      (
        req.headers.get("x-partner") ||
        req.headers.get("x-partner-slug") ||
        ""
      ).trim() || null;

    const { start, end } = parseDateRange(scope, date);

    const statusFilter: Prisma.BookingWhereInput["status"] = includeCancelled
      ? { in: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED] }
      : BookingStatus.CONFIRMED;

    const baseWhere: Prisma.BookingWhereInput = {
      status: statusFilter,
      slot: {
        startTime: {
          gte: start,
          lt: end,
        },
      },
    };

    let where: Prisma.BookingWhereInput = baseWhere;

    if (role === "PARTNER") {
      where = {
        ...baseWhere,
        OR: [
          { partner: { id: subject } },
          { partner: { slug: subject } },
          { slot: { partner: { id: subject } } },
          { slot: { partner: { slug: subject } } },
        ],
      };
    }

    if (role === "ADMIN") {
      const chosenPartnerSlug = partnerSlugQuery || partnerSlugHeader;

      if (chosenPartnerSlug) {
        where = {
          ...baseWhere,
          OR: [
            { partner: { slug: chosenPartnerSlug } },
            { slot: { partner: { slug: chosenPartnerSlug } } },
          ],
        };
      }
    }

    const rows = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        status: true,
        currency: true,

        totalAmountCents: true,
        depositAmountCents: true,
        restAmountCents: true,
        discountAmountCents: true,
        giftCardAppliedCents: true,

        playersCount: true,
        dogName: true,
        dogAllergies: true,
        dogFears: true,
        dogTrackingLevel: true,
        dogSocialWithPeople: true,

        confirmedAt: true,
        cancelledAt: true,
        depositPaidAt: true,
        createdAt: true,

        slot: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            partner: {
              select: {
                id: true,
                name: true,
                slug: true,
                city: true,
              },
            },
          },
        },

        partner: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
          },
        },

        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            locale: true,
          },
        },

        payments: {
          where: {
            type: PaymentType.DEPOSIT,
          },
          select: {
            id: true,
            status: true,
            type: true,
            amountCents: true,
            currency: true,
            provider: true,
            providerPaymentId: true,
            method: true,
            paidAt: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: [
        {
          slot: {
            startTime: "asc",
          },
        },
      ],
    });

    const items = rows.map((b) => {
      const partner = b.slot.partner ?? b.partner;

      const paidDepositCents = b.payments.reduce((sum, payment) => {
        if (payment.status !== PaymentStatus.PAID) return sum;
        return sum + payment.amountCents;
      }, 0);

      const latestDepositPayment = b.payments[0] ?? null;
      const latestPaidDepositPayment =
        b.payments.find((payment) => payment.status === PaymentStatus.PAID) ??
        null;

      return {
        id: b.id,
        bookingId: b.id,

        slotId: b.slot.id,
        slotStatus: b.slot.status,
        startTime: b.slot.startTime.toISOString(),
        endTime: b.slot.endTime.toISOString(),

        partnerId: partner.id,
        partnerSlug: partner.slug,
        partnerName: partner.name,
        partnerCity: partner.city,

        bookingStatus: b.status,
        confirmedAt: b.confirmedAt?.toISOString() ?? null,
        cancelledAt: b.cancelledAt?.toISOString() ?? null,
        depositPaidAt: b.depositPaidAt?.toISOString() ?? null,
        createdAt: b.createdAt.toISOString(),

        customerId: b.customer.id,
        customerName: b.customer.name,
        customerEmail: b.customer.email,
        customerPhone: b.customer.phone,
        customerLocale: b.customer.locale,

        playersCount: b.playersCount,
        dogName: b.dogName,
        dogAllergies: b.dogAllergies,
        dogFears: b.dogFears,
        dogTrackingLevel: b.dogTrackingLevel,
        dogSocialWithPeople: b.dogSocialWithPeople,

        currency: b.currency,
        totalAmountCents: b.totalAmountCents,
        depositAmountCents: b.depositAmountCents,
        restAmountCents: b.restAmountCents,
        discountAmountCents: b.discountAmountCents,
        giftCardAppliedCents: b.giftCardAppliedCents,

        depositPaidAmountCents: paidDepositCents,
        latestDepositPaymentStatus: latestDepositPayment?.status ?? null,
        latestDepositPaymentMethod: latestDepositPayment?.method ?? null,
        latestDepositPaymentPaidAt:
          latestPaidDepositPayment?.paidAt?.toISOString() ?? null,

        playerCount: b.playersCount,
        allergies:
          [b.dogAllergies, b.dogFears].filter(Boolean).join(" · ") || null,
        totalAmount: b.totalAmountCents / 100,
        depositPaidAmount: paidDepositCents / 100,
      };
    });

    const res = NextResponse.json({ ok: true, items });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: unknown) {
    console.error("GET /api/agenda error:", e);

    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Server error",
      },
      { status: 500 }
    );
  }
}