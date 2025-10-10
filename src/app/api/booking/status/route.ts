// PATH: src/app/api/booking/status/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { BookingStatus, PaymentStatus, PaymentType } from "@prisma/client";

/** Query: /api/booking/status?id=<bookingId> */
const QuerySchema = z.object({
  id: z.string().min(8).max(64), // cuid/cuid2/uuid — ruim houden
});

export async function GET(req: Request) {
  try {
    // ---- Parse & validate query
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({ id: searchParams.get("id") });
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Ongeldig of ontbrekend 'id'." },
        { status: 400 }
      );
    }
    const bookingId = parsed.data.id;

    // ---- Haal boeking + laatste DEPOSIT-payment op
    // Probeer via relations; fallback via losse query als je modelnaam anders is.
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        // @ts-ignore - relatie-naam kan verschillen; pas evt. aan naar jouw model
        payments: {
          where: { type: PaymentType.DEPOSIT },
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true, type: true, createdAt: true },
          take: 1,
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Boeking niet gevonden." },
        { status: 404 }
      );
    }

    // Als de relationnaam anders is (bijv. BookingPayment), fallback:
    let paymentStatus: PaymentStatus | null =
      // @ts-ignore
      booking.payments?.[0]?.status ?? null;

    if (!paymentStatus) {
      const lastDeposit = await prisma.payment.findFirst({
        where: { bookingId, type: PaymentType.DEPOSIT },
        orderBy: { createdAt: "desc" },
        select: { status: true },
      });
      paymentStatus = lastDeposit?.status ?? null;
    }

    // ---- Antwoord
    // No-cache, zodat de return-pagina altijd verse status ziet.
    return NextResponse.json(
      {
        ok: true,
        bookingId,
        bookingStatus: booking.status as BookingStatus,
        paymentStatus: paymentStatus ?? "CREATED",
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    console.error("[/api/booking/status] ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Interne fout bij ophalen status." },
      { status: 500 }
    );
  }
}
