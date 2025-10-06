// PATH: src/app/api/booking/[bookingId]/status/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { BookingStatus, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Helper: werkt op Next 14 (object) én Next 15 (Promise) */
async function getParams<T extends Record<string, any>>(p: T | Promise<T>): Promise<T> {
  return (p instanceof Promise ? await p : p) as T;
}

type RouteParams = { bookingId: string };
type Ctx = { params: RouteParams } | { params: Promise<RouteParams> };

export async function GET(_req: Request, ctx: Ctx) {
  const { bookingId } = await getParams(ctx.params);
  const id = bookingId?.trim();

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Ongeldige bookingId" },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      slot: true,
      partner: { select: { id: true, name: true } },
      // Typing van relations kan per schema verschillen; 'as any' houdt het compile-vriendelijk
      payments: { orderBy: { createdAt: "desc" }, take: 1 } as any,
    },
  });

  if (!booking) {
    return NextResponse.json(
      { ok: false, error: "Boeking niet gevonden" },
      { status: 404 }
    );
  }

  const payment = Array.isArray((booking as any).payments)
    ? (booking as any).payments[0]
    : null;

  const bookingStatus = booking.status as BookingStatus;
  const paymentStatus = (payment?.status as PaymentStatus) ?? "PENDING";

  return NextResponse.json({
    ok: true,
    bookingId: id,
    bookingStatus,
    paymentStatus,
    confirmed: bookingStatus === "CONFIRMED",
    summary: {
      partnerName: booking.partner?.name ?? null,
      startTime: booking.slot?.startTime ?? null,
      depositPaidAt: (booking as any).depositPaidAt ?? null,
    },
  });
}
