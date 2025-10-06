import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/** Utility: now in UTC */
const now = () => new Date();

/** Rekenregels:
 * - baseTotalCents = huidig totaal + huidige korting (zo behouden we het "bruto" uitgangspunt)
 * - Bij APPLY:
 *    - PERCENT: discount = round(base * (percent/100))
 *    - FIXED:   discount = min(amountCents, base)
 *   newTotal   = base - discount
 *   deposit    = round(newTotal * fee%)
 *   rest       = newTotal - deposit
 * - Bij CLEAR:
 *   newTotal   = base (dus zonder korting)
 *   discount   = 0, code loskoppelen
 */
function computeWithDiscount(opts: {
  baseTotalCents: number;
  feePercent: number; // 0..100
  type?: "PERCENT" | "FIXED" | null;
  percent?: number | null;
  amountCents?: number | null;
}) {
  const { baseTotalCents, feePercent, type, percent, amountCents } = opts;

  let appliedCents = 0;
  if (type === "PERCENT" && typeof percent === "number" && percent > 0) {
    // jouw schema: percent 0..20 typischerwijs
    appliedCents = Math.round(baseTotalCents * (percent / 100));
  } else if (type === "FIXED" && typeof amountCents === "number" && amountCents > 0) {
    appliedCents = Math.min(amountCents, baseTotalCents);
  }

  const newTotal = Math.max(0, baseTotalCents - appliedCents);
  const deposit = Math.round(newTotal * (feePercent / 100));
  const rest = newTotal - deposit;

  return {
    discountAppliedCents: appliedCents,
    totalCents: newTotal,
    depositCents: deposit,
    restCents: rest,
  };
}

export async function POST(req: Request) {
  try {
    const { bookingId, code } = await req.json();

    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json({ ok: false, error: "bookingId ontbreekt" }, { status: 400 });
    }

    // Haal booking + partner (voor fee) + huidige discount-join op
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        partner: { select: { id: true, name: true, feePercent: true } },
        slot: { select: { startTime: true } },
        customer: { select: { name: true, email: true } },
        discountCode: { select: { id: true, code: true, type: true, percent: true, amountCents: true, partnerId: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ ok: false, error: "Boeking niet gevonden" }, { status: 404 });
    }
    if (booking.status === "CANCELLED") {
      return NextResponse.json({ ok: false, error: "Boeking is geannuleerd" }, { status: 409 });
    }

    const feePercent = booking.partner.feePercent ?? 0;

    // "Bruto" uitgangspunt = huidig totaal + eerder toegepaste korting
    const currentDiscount = booking.discountAmountCents ?? 0;
    const baseTotalCents = (booking.totalAmountCents ?? 0) + currentDiscount;

    let discountCodeId: string | null = null;
    let discountAmountCents = 0;
    let newTotals = computeWithDiscount({
      baseTotalCents,
      feePercent,
      type: null,
      percent: null,
      amountCents: null,
    });

    // === APPLY === (code is opgegeven en niet leeg)
    if (typeof code === "string" && code.trim().length > 0) {
      const codeStr = code.trim();

      // Zoek een actieve code voor deze partner & geldige periode/limiet
      const dc = await prisma.discountCode.findUnique({
        where: { code: codeStr },
      });

      if (!dc || !dc.active) {
        return NextResponse.json({ ok: false, error: "Kortingscode ongeldig of inactief" }, { status: 400 });
      }
      if (dc.partnerId !== booking.partnerId) {
        return NextResponse.json({ ok: false, error: "Kortingscode hoort niet bij deze hondenschool" }, { status: 400 });
      }

      // geldigheid
      const nowDt = now();
      if (dc.validFrom && nowDt < dc.validFrom) {
        return NextResponse.json({ ok: false, error: "Kortingscode is nog niet geldig" }, { status: 400 });
      }
      if (dc.validUntil && nowDt > dc.validUntil) {
        return NextResponse.json({ ok: false, error: "Kortingscode is verlopen" }, { status: 400 });
      }
      if (dc.maxRedemptions && dc.redeemedCount >= dc.maxRedemptions) {
        return NextResponse.json({ ok: false, error: "Kortingscode is niet meer beschikbaar" }, { status: 400 });
      }

      // Reken korting over het hele bedrag (incl. fee → fee werkt op het gecorrigeerde totaal)
      newTotals = computeWithDiscount({
        baseTotalCents,
        feePercent,
        type: dc.type as any,
        percent: dc.percent ?? null,
        amountCents: dc.amountCents ?? null,
      });

      discountAmountCents = newTotals
        ? Math.max(0, baseTotalCents - newTotals.totalCents)
        : 0;
      discountCodeId = dc.id;
    }

    // === CLEAR === (geen code opgegeven) → newTotals zitten al op baseTotal
    if (!code || (typeof code === "string" && code.trim() === "")) {
      discountCodeId = null;
      discountAmountCents = 0;
      // newTotals is al berekend met type null ⇒ total = base, deposit/rest herberekend
    }

    // Persisteren
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        totalAmountCents: newTotals.totalCents,
        depositAmountCents: newTotals.depositCents,
        restAmountCents: newTotals.restCents,
        discountAmountCents: discountAmountCents,
        discountCodeId: discountCodeId,
      },
      include: {
        partner: { select: { id: true, name: true, feePercent: true } },
        slot: { select: { startTime: true } },
        customer: { select: { name: true, email: true } },
        discountCode: { select: { id: true, code: true } },
      },
    });

    // NB: redeemedCount NIET verhogen hier; pas doen bij definitieve bevestiging/afrekenen.
    // Terug naar client in shape die je UI verwacht
    return NextResponse.json(
      {
        ok: true,
        booking: {
          id: updated.id,
          status: updated.status,
          totalAmountCents: updated.totalAmountCents,
          depositAmountCents: updated.depositAmountCents,
          restAmountCents: updated.restAmountCents,
          discountAmountCents: updated.discountAmountCents,
          discountCode: updated.discountCode ? { code: updated.discountCode.code } : null,
          partner: {
            name: updated.partner.name,
            feePercent: updated.partner.feePercent,
          },
          slot: { startTime: updated.slot?.startTime ?? null },
          customer: {
            name: updated.customer?.name ?? null,
            email: updated.customer?.email ?? "",
          },
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("[apply-discount] Error:", e);
    return NextResponse.json({ ok: false, error: "Onverwachte fout" }, { status: 500 });
  }
}
