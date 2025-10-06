// PATH: src/app/api/agenda/route.ts
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { BookingStatus, PaymentStatus, PaymentType } from "@prisma/client";
import jwt from "jsonwebtoken";

/** Query:
 *  ?scope=day|week|month
 *  ?date=YYYY-MM-DD
 *  ?partner=<slug>        (ADMIN-only; PARTNER wordt genegeerd/afgewezen)
 *  ?includeCancelled=true|false
 */

export const runtime = "nodejs";

/* ================================
   Auth helpers
================================== */
type Role = "ADMIN" | "PARTNER";
type JWTPayload = { sub: string; role: Role; [k: string]: unknown };

const COOKIE_PRIMARY = process.env.SESSION_COOKIE_NAME || "session";
const COOKIE_LEGACY  = "de_session";
const SECRET = process.env.SESSION_SECRET || "";

function readCookieFromHeader(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.split(/;\s*/).find(c => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function readSession(req: Request): JWTPayload | null {
  const token =
    readCookieFromHeader(req, COOKIE_PRIMARY) ||
    readCookieFromHeader(req, COOKIE_LEGACY);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET) as JWTPayload;
    if (!payload?.sub || !payload?.role) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ================================
   Date helpers
================================== */
function parseDateRange(scopeRaw: string | null, ymd: string | null) {
  const scope = (scopeRaw ?? "day").toLowerCase();
  const [Y, M, D] = (ymd ?? "").split("-").map(Number);
  const pivot = Number.isFinite(Y) ? new Date(Y!, (M ?? 1) - 1, D ?? 1) : new Date();

  let start = new Date(pivot), end = new Date(pivot);
  switch (scope) {
    case "week": {
      const dow = pivot.getDay();                // 0=zo..6=za
      const diff = dow === 0 ? -6 : 1 - dow;     // maandag-start
      start = new Date(pivot); start.setDate(pivot.getDate() + diff);
      end = new Date(start);   end.setDate(start.getDate() + 7);
      break;
    }
    case "month": {
      start = new Date(pivot.getFullYear(), pivot.getMonth(), 1);
      end   = new Date(pivot.getFullYear(), pivot.getMonth() + 1, 1);
      break;
    }
    default: { // day
      start = new Date(pivot.getFullYear(), pivot.getMonth(), pivot.getDate());
      end   = new Date(start); end.setDate(start.getDate() + 1);
    }
  }
  return { start, end };
}

const toEUR = (cents?: number | null) =>
  typeof cents === "number" && isFinite(cents) ? +(cents / 100).toFixed(2) : null;

/* ================================
   GET
================================== */
export async function GET(req: NextRequest) {
  try {
    // ---- AUTH ----
    const session = readSession(req);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const role: Role = session.role;
    const subject = String(session.sub); // kan partner.id of partner.slug zijn

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");
    const date = searchParams.get("date");
    const includeCancelled = (searchParams.get("includeCancelled") ?? "false").toLowerCase() === "true";

    // ADMIN mag filteren op partner via query/header; PARTNER niet.
    const partnerSlugQuery = (searchParams.get("partner") || "").trim() || null;
    const partnerSlugHeader =
      (req.headers.get("x-partner") || req.headers.get("x-partner-slug") || "").trim() || null;

    // Definitieve partnerFilterContext:
    // - PARTNER: forceer op eigen subject (slug of id)
    // - ADMIN: gebruik ?partner= of header; anders geen partnerfilter (alle partners)
    let partnerFilterContext:
      | { mode: "BY_ID_OR_SLUG"; value: string }  // PARTNER → subject (id of slug)
      | { mode: "BY_SLUG"; value: string }        // ADMIN → expliciete slug
      | { mode: "ALL" }                           // ADMIN → alles
      = { mode: "ALL" };

    if (role === "PARTNER") {
      // Als PARTNER tóch een ?partner= meestuurt en die wijkt af van eigen subject → 403
      if (partnerSlugQuery && partnerSlugQuery !== subject) {
        return NextResponse.json({ ok: false, error: "Forbidden: partner scope mismatch" }, { status: 403 });
      }
      partnerFilterContext = { mode: "BY_ID_OR_SLUG", value: subject };
    } else {
      // ADMIN
      const chosen = partnerSlugQuery || partnerSlugHeader;
      partnerFilterContext = chosen ? { mode: "BY_SLUG", value: chosen } : { mode: "ALL" };
    }

    const { start, end } = parseDateRange(scope, date);

    // ---- WHERE-CLAUSE op basis van rol/context ----
    const baseBookingWhere: any = {
      ...(includeCancelled ? {} : { status: { not: BookingStatus.CANCELLED } }),
      slot: { startTime: { gte: start, lt: end } },
    };

    let where: any = baseBookingWhere;

    if (partnerFilterContext.mode === "BY_ID_OR_SLUG") {
      // PARTNER: subject kan ID of SLUG zijn → filter met OR
      where = {
        ...baseBookingWhere,
        OR: [
          { slot: { partner: { id: partnerFilterContext.value } } },
          { slot: { partner: { slug: partnerFilterContext.value } } },
          { partner: { id: partnerFilterContext.value } },   // legacy fallback
          { partner: { slug: partnerFilterContext.value } }, // legacy fallback
        ],
      };
    } else if (partnerFilterContext.mode === "BY_SLUG") {
      // ADMIN met expliciete slug
      where = {
        ...baseBookingWhere,
        OR: [
          { slot: { partner: { slug: partnerFilterContext.value } } },
          { partner: { slug: partnerFilterContext.value } }, // legacy fallback
        ],
      };
    }
    // ADMIN ALL → where blijft baseBookingWhere

    const rows = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        status: true,
        currency: true,
        totalAmountCents: true,
        depositAmountCents: true,
        depositPaidAt: true,
        playersCount: true,
        dogName: true,
        dogAllergies: true,
        dogFears: true,

        slot: {
          select: {
            startTime: true,
            endTime: true,
            partner: { select: { name: true, slug: true, id: true } },
          },
        },
        partner: { select: { name: true, slug: true, id: true } }, // legacy fallback
        customer: { select: { name: true } },
        payments: { select: { amountCents: true, status: true, type: true } },
      },
      orderBy: [{ slot: { startTime: "asc" } }],
    });

    const items = rows
      .filter(b => !!b.slot?.startTime)
      .map(b => {
        const startISO = b.slot!.startTime.toISOString();
        const endISO   = b.slot?.endTime ? b.slot.endTime.toISOString() : null;

        const paidDepositCents = b.payments.reduce((sum, p) => {
          const isPaidDeposit = p.type === PaymentType.DEPOSIT && p.status === PaymentStatus.PAID;
          return sum + (isPaidDeposit ? (p.amountCents ?? 0) : 0);
        }, 0);

        const depositPaidEffective =
          paidDepositCents > 0 ? paidDepositCents : (b.depositPaidAt ? (b.depositAmountCents ?? 0) : 0);

        const customerName = b.customer?.name ?? null;
        const allergyBits = [b.dogAllergies, b.dogFears].filter(Boolean) as string[];
        const allergies = allergyBits.length ? allergyBits.join(" · ") : null;

        return {
          id: b.id,
          partnerId: b.slot?.partner?.id ?? b.partner?.id ?? null,
          partnerSlug: b.slot?.partner?.slug ?? b.partner?.slug ?? null,
          partnerName: b.slot?.partner?.name ?? b.partner?.name ?? null,

          startTime: startISO,
          endTime: endISO,

          playerCount: b.playersCount ?? null,
          dogName: b.dogName ?? null,

          customerName,
          allergies,

          totalAmount: toEUR(b.totalAmountCents),
          depositPaidAmount: toEUR(depositPaidEffective),
          currency: b.currency ?? "EUR",
        };
      });

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("GET /api/agenda error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
