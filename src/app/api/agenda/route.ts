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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Role = "ADMIN" | "PARTNER";
type JWTPayload = { sub: string; role: Role; [k: string]: unknown };

const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY = "de_session";
const SECRET = process.env.SESSION_SECRET || "";

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

function parseDateRange(scopeRaw: string | null, ymd: string | null) {
  const scope = (scopeRaw ?? "day").toLowerCase();
  const [Y, M, D] = (ymd ?? "").split("-").map(Number);
  const pivot = Number.isFinite(Y)
    ? new Date(Y, (M ?? 1) - 1, D ?? 1)
    : new Date();

  let start = new Date(pivot);
  let end = new Date(pivot);

  if (scope === "week") {
    const dow = pivot.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    start = new Date(pivot);
    start.setDate(pivot.getDate() + diff);
    end = new Date(start);
    end.setDate(start.getDate() + 7);
  } else if (scope === "month") {
    start = new Date(pivot.getFullYear(), pivot.getMonth(), 1);
    end = new Date(pivot.getFullYear(), pivot.getMonth() + 1, 1);
  } else {
    start = new Date(pivot.getFullYear(), pivot.getMonth(), pivot.getDate());
    end = new Date(start);
    end.setDate(start.getDate() + 1);
  }

  return { start, end };
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
      (req.headers.get("x-partner") ||
        req.headers.get("x-partner-slug") ||
        "")
        .trim() || null;

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
      const partner = b.slot?.partner ?? b.partner;

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

        // tijdelijke backwards compatibility voor je huidige agenda-page
        playerCount: b.playersCount,
        allergies: [b.dogAllergies, b.dogFears].filter(Boolean).join(" · ") || null,
        totalAmount: b.totalAmountCents / 100,
        depositPaidAmount: paidDepositCents / 100,
      };
    });

    return NextResponse.json({ ok: true, items });
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