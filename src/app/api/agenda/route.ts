import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { BookingStatus, PaymentStatus, PaymentType } from "@prisma/client";

/** Query:
 *  ?scope=day|week|month
 *  ?date=YYYY-MM-DD
 *  ?partner=<slug>        (optioneel; als aanwezig: filteren op partner)
 *  ?includeCancelled=true|false
 */

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");
    const date = searchParams.get("date");
    const includeCancelled = (searchParams.get("includeCancelled") ?? "false").toLowerCase() === "true";

    // Partner-slug kan via query of (optioneel) header worden meegegeven
    const partnerSlugQuery = (searchParams.get("partner") || "").trim() || null;
    const partnerSlugHeader =
      (req.headers.get("x-partner") || req.headers.get("x-partner-slug") || "").trim() || null;
    const partnerSlug = partnerSlugQuery || partnerSlugHeader || null;

    const { start, end } = parseDateRange(scope, date);

    const where: any = {
      ...(includeCancelled ? {} : { status: { not: BookingStatus.CANCELLED } }),
      slot: {
        startTime: { gte: start, lt: end },
        ...(partnerSlug ? { partner: { slug: partnerSlug } } : {}),
      },
      // fallback voor legacy records met direct `partnerId`/relation op booking
      ...(partnerSlug ? { OR: [
        { slot: { partner: { slug: partnerSlug } } },
        { partner:      { slug: partnerSlug } },
      ]} : {}),
    };

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
            partner: { select: { name: true, slug: true } },
          },
        },
        partner: { select: { name: true, slug: true } }, // fallback
        customer: { select: { name: true } },            // NB: alleen 'name' bestaat
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
