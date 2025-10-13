// PATH: src/app/api/booking/[bookingId]/apply-discount/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

/** Utility: now in UTC */
const now = () => new Date();

/** Rekenregels (zoals in je voorbeeld) */
function computeWithDiscount(opts: {
  baseTotalCents: number;
  feePercent: number; // 0..100
  type?: "PERCENT" | "FIXED" | null;
  percent?: number | null;
  amountCents?: number | null;
}) {
  const { baseTotalCents, feePercent } = opts;
  const type = (opts.type || null) as "PERCENT" | "FIXED" | null;
  const percent = typeof opts.percent === "number" ? Math.max(0, Math.min(100, opts.percent)) : null;
  const amountCents = typeof opts.amountCents === "number" ? Math.max(0, opts.amountCents) : null;

  let appliedCents = 0;
  if (type === "PERCENT" && percent && percent > 0) {
    appliedCents = Math.round(baseTotalCents * (percent / 100));
  } else if (type === "FIXED" && amountCents && amountCents > 0) {
    appliedCents = Math.min(amountCents, baseTotalCents);
  }

  const newTotal = Math.max(0, baseTotalCents - appliedCents);
  const deposit = Math.max(0, Math.round(newTotal * (Math.max(0, Math.min(100, feePercent)) / 100)));
  const rest = Math.max(0, newTotal - deposit);

  return {
    discountAppliedCents: appliedCents,
    totalCents: newTotal,
    depositCents: deposit,
    restCents: rest,
  };
}

const Params = z.object({ bookingId: z.string().min(1) });
const Body = z.object({ code: z.string().optional().nullable() });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: { bookingId: string } }) {
  try {
    const { bookingId } = Params.parse(ctx.params);
    const { code } = Body.parse(await req.json());

    // Haal booking + essentials op
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        partner: { select: { id: true, name: true, feePercent: true } },
        slot: { select: { startTime: true } },
        customer: { select: { name: true, email: true } },
        discountCode: { select: { id: true, code: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ ok: false, error: "Boeking niet gevonden" }, { status: 404 });
    }
    if (booking.status === "CANCELLED") {
      return NextResponse.json({ ok: false, error: "Boeking is geannuleerd" }, { status: 409 });
    }

    const feePercent = Number(booking.partner?.feePercent ?? 0);

    // "Bruto" uitgangspunt = huidig totaal + eerder toegepaste korting
    const currentDiscount = Number((booking as any).discountAmountCents ?? 0);
    const baseTotalCents = Number((booking as any).totalAmountCents ?? 0) + currentDiscount;

    let discountCodeId: string | null = null;
    let discountAmountCents = 0;

    // Standaard: totals zonder korting (CLEAR)
    let newTotals = computeWithDiscount({
      baseTotalCents,
      feePercent,
      type: null,
      percent: null,
      amountCents: null,
    });

    // === APPLY ===
    if (typeof code === "string" && code.trim().length > 0) {
      const codeStr = code.trim();

      // Zoek code case-insensitive én op partner
      const dc = await prisma.discountCode.findFirst({
        where: {
          code: { equals: codeStr, mode: "insensitive" },
          // Alleen beperken op partner als je model die kolom heeft:
          ...(booking.partner?.id ? { partnerId: booking.partner.id } : {}),
        } as any,
      });

      if (!dc) {
        return NextResponse.json({ ok: false, error: "Kortingscode ongeldig of niet gevonden" }, { status: 400 });
      }

      // Optionele geldigheidschecks (alleen als die velden bestaan in jouw schema)
      const isActive = (dc as any).active;
      if (typeof isActive === "boolean" && !isActive) {
        return NextResponse.json({ ok: false, error: "Kortingscode is inactief" }, { status: 400 });
      }

      const vf = (dc as any).validFrom as Date | null | undefined;
      const vu = (dc as any).validUntil as Date | null | undefined;
      const nowDt = now();
      if (vf instanceof Date && nowDt < vf) {
        return NextResponse.json({ ok: false, error: "Kortingscode is nog niet geldig" }, { status: 400 });
      }
      if (vu instanceof Date && nowDt > vu) {
        return NextResponse.json({ ok: false, error: "Kortingscode is verlopen" }, { status: 400 });
      }

      const maxRed = Number((dc as any).maxRedemptions ?? 0);
      const used = Number((dc as any).redeemedCount ?? 0);
      if (maxRed > 0 && used >= maxRed) {
        return NextResponse.json({ ok: false, error: "Kortingscode is niet meer beschikbaar" }, { status: 400 });
      }

      const typeRaw = String(((dc as any).type || "") as string).toUpperCase();
      const type = typeRaw === "PERCENT" || typeRaw === "FIXED" ? (typeRaw as "PERCENT" | "FIXED") : null;

      newTotals = computeWithDiscount({
        baseTotalCents,
        feePercent,
        type,
        percent: Number((dc as any).percent ?? 0),
        amountCents: Number((dc as any).amountCents ?? (dc as any).amountOffCents ?? 0),
      });

      discountAmountCents = Math.max(0, baseTotalCents - newTotals.totalCents);
      discountCodeId = (dc as any).id ?? null;
    }

    // === CLEAR === (geen code) → newTotals blijft op "base", korting 0
    if (!code || (typeof code === "string" && code.trim() === "")) {
      discountCodeId = null;
      discountAmountCents = 0;
    }

    // Persisteren
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        totalAmountCents: newTotals.totalCents,
        depositAmountCents: newTotals.depositCents,
        restAmountCents: newTotals.restCents,
        discountAmountCents,
        discountCodeId: discountCodeId,
      } as any,
      include: {
        partner: { select: { id: true, name: true, feePercent: true } },
        slot: { select: { startTime: true } },
        customer: { select: { name: true, email: true} },
        discountCode: { select: { id: true, code: true } },
      },
    });

    // NB: redeemedCount NIET verhogen hier; pas bij definitieve bevestiging/afrekenen.
    return NextResponse.json(
      {
        ok: true,
        booking: {
          id: updated.id,
          status: updated.status,
          totalAmountCents: (updated as any).totalAmountCents,
          depositAmountCents: (updated as any).depositAmountCents,
          restAmountCents: (updated as any).restAmountCents,
          discountAmountCents: (updated as any).discountAmountCents,
          discountCode: updated.discountCode ? { code: updated.discountCode.code } : null,
          partner: {
            name: updated.partner?.name ?? "",
            feePercent: Number(updated.partner?.feePercent ?? 0),
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
    console.error("[booking/apply-discount] Error:", e);
    return NextResponse.json({ ok: false, error: "Onverwachte fout" }, { status: 500 });
  }
}
