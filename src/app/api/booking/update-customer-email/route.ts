// PATH: src/app/api/booking/update-customer-email/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const Body = z.object({
  bookingId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional().default(""),
});

// (optioneel) handig als je ooit cross-origin callt
function corsHeaders(allow: string) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": allow,
    "Cache-Control": "no-store",
  };
}
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders("POST, OPTIONS") });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, email, name } = Body.parse(body);

    // Haal boeking + huidige customer op
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404, headers: corsHeaders("POST, OPTIONS") });
    }

    // Als er al een customer is: update die; anders maak en koppel 'm
    if (booking.customer?.id) {
      await prisma.customer.update({
        where: { id: booking.customer.id },
        data: { email, name: name || booking.customer.name || "" },
      });
    } else {
      const created = await prisma.customer.create({ data: { email, name } });
      await prisma.booking.update({
        where: { id: bookingId },
        data: { customerId: created.id },
      });
    }

    const updated = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, partner: true, slot: true, discountCode: true },
    });

    return NextResponse.json({ ok: true, booking: updated }, { headers: corsHeaders("POST, OPTIONS") });
  } catch (err: any) {
    console.error("[POST /api/booking/update-customer-email]", err);
    const message = err?.message || "Invalid request";
    return NextResponse.json({ error: message }, { status: 400, headers: corsHeaders("POST, OPTIONS") });
  }
}
