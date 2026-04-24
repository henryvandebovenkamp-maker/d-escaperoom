// PATH: src/app/api/booking/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const FIXED_TOTAL_CENTS = 7990;
const PENDING_BOOKING_TTL_MINUTES = 15;

function json(data: any, status = 200, extraHeaders?: Record<string, string>) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      ...(extraHeaders ?? {}),
    },
  });
}

function computePriceCents(params: { feePercent: number }) {
  const total = FIXED_TOTAL_CENTS;
  const deposit = Math.round((total * params.feePercent) / 100);
  const rest = total - deposit;

  return {
    totalCents: total,
    depositCents: deposit,
    restCents: rest,
    currency: "EUR" as const,
  };
}

function isExpiredPendingBooking(booking: {
  status: string;
  createdAt: Date;
}) {
  if (booking.status !== "PENDING") return false;

  const expiresAt =
    booking.createdAt.getTime() + PENDING_BOOKING_TTL_MINUTES * 60 * 1000;

  return Date.now() > expiresAt;
}

const CreateBookingSchema = z
  .object({
    partnerSlug: z.string().min(1, "partnerSlug is verplicht"),
    slotId: z.string().min(1).optional(),
    startTimeISO: z.string().datetime().optional(),

    players: z.coerce.number().int().min(1).max(3),

    customer: z.object({
      name: z.string().min(2, "naam te kort"),
      email: z.string().email("ongeldig e-mailadres"),
      phone: z.string().optional(),
      locale: z.enum(["nl", "en", "de", "es"]).optional(),
    }),

    dog: z
      .object({
        name: z.string().min(1).optional(),
        allergies: z.string().optional(),
        fears: z.string().optional(),
        trackingLevel: z.enum(["NONE", "BEGINNER", "AMATEUR", "PRO"]).optional(),
      })
      .optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.slotId && !val.startTimeISO) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Geef slotId of startTimeISO mee.",
        path: ["slot"],
      });
    }
  });

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const ctype = req.headers.get("content-type") || "";

    if (!ctype.includes("application/json")) {
      return json(
        {
          ok: false,
          error: "Validatie fout",
          details: [
            {
              path: ["headers.Content-Type"],
              message:
                "Gebruik Content-Type: application/json en stuur een JSON body.",
            },
          ],
        },
        400
      );
    }

    const raw = await req.json();

    const normalized = {
      partnerSlug: raw.partnerSlug,
      slotId: raw.slotId,
      startTimeISO: raw.startTimeISO,
      players: raw.players ?? raw.playersCount ?? undefined,
      customer: raw.customer,

      dog:
        raw.dog ??
        (raw.dogName ||
        raw.dogAllergies ||
        raw.dogFears ||
        raw.dogTrackingLevel
          ? {
              name: raw.dogName,
              allergies: raw.dogAllergies,
              fears: raw.dogFears,
              trackingLevel: raw.dogTrackingLevel,
            }
          : undefined),
    };

    const data = CreateBookingSchema.parse(normalized);

    const partner = await prisma.partner.findUnique({
      where: { slug: data.partnerSlug },
      select: {
        id: true,
        feePercent: true,
      },
    });

    if (!partner) {
      return json({ ok: false, error: "Partner niet gevonden" }, 404);
    }

    const slot = data.slotId
      ? await prisma.slot.findFirst({
          where: {
            id: data.slotId,
            partnerId: partner.id,
          },
          select: {
            id: true,
            status: true,
            startTime: true,
          },
        })
      : data.startTimeISO
      ? await prisma.slot.findFirst({
          where: {
            partnerId: partner.id,
            startTime: new Date(data.startTimeISO),
          },
          select: {
            id: true,
            status: true,
            startTime: true,
          },
        })
      : null;

    if (!slot) {
      return json({ ok: false, error: "Tijdslot niet gevonden" }, 404);
    }

    if (slot.status !== "PUBLISHED") {
      return json(
        {
          ok: false,
          error:
            slot.status === "BOOKED"
              ? "Tijdslot is al geboekt"
              : "Tijdslot is niet beschikbaar",
        },
        409
      );
    }

    const normalizedEmail = data.customer.email.trim().toLowerCase();

    let customer = await prisma.customer.findFirst({
      where: {
        email: normalizedEmail,
        ...(data.customer.name ? { name: data.customer.name } : {}),
      },
      select: { id: true },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: normalizedEmail,
          name: data.customer.name ?? null,
          phone: data.customer.phone ?? null,
          locale: data.customer.locale ?? "nl",
        },
        select: { id: true },
      });
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: data.customer.name ?? undefined,
          phone: data.customer.phone ?? undefined,
          locale: data.customer.locale ?? undefined,
        },
      });
    }

    const price = computePriceCents({
      feePercent: partner.feePercent,
    });

    const existing = await prisma.booking.findUnique({
      where: { slotId: slot.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    if (existing) {
      if (isExpiredPendingBooking(existing)) {
        await prisma.booking.update({
          where: { id: existing.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });
      } else {
        return json(
          {
            ok: false,
            error: "Tijdslot is tijdelijk gereserveerd of al geboekt",
            details: [
              {
                path: ["slotId"],
                message:
                  existing.status === "PENDING"
                    ? "Dit tijdslot is tijdelijk gereserveerd. Probeer het over enkele minuten opnieuw."
                    : "Er bestaat al een booking voor dit tijdslot.",
              },
            ],
            booking: {
              id: existing.id,
              status: existing.status,
            },
          },
          409
        );
      }
    }

    try {
      const booking = await prisma.booking.create({
        data: {
          partnerId: partner.id,
          slotId: slot.id,
          customerId: customer.id,

          status: "PENDING",

          currency: price.currency,
          totalAmountCents: price.totalCents,
          depositAmountCents: price.depositCents,
          restAmountCents: price.restCents,

          playersCount: data.players,

          dogName: data.dog?.name ?? null,
          dogAllergies: data.dog?.allergies ?? null,
          dogFears: data.dog?.fears ?? null,
          dogTrackingLevel:
            (data.dog?.trackingLevel as string | undefined) ?? null,
        },
        select: {
          id: true,
          status: true,
          slotId: true,
        },
      });

      return json(
        {
          ok: true,
          bookingId: booking.id,
          status: booking.status,
          booking: {
            id: booking.id,
            status: booking.status,
            slotId: booking.slotId,
          },
          slot: {
            id: slot.id,
            status: slot.status,
          },
          expiresInMinutes: PENDING_BOOKING_TTL_MINUTES,
        },
        201,
        { Location: `/api/booking/${booking.id}` }
      );
    } catch (e: any) {
      if (e?.code === "P2002") {
        return json(
          {
            ok: false,
            error: "Tijdslot net geboekt of dubbele aanvraag",
            details: [
              {
                path: ["slotId"],
                message: "Er bestaat al een actieve booking voor dit tijdslot.",
              },
            ],
          },
          409
        );
      }

      throw e;
    }
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return json(
        {
          ok: false,
          error: "Validatie fout",
          details: err.issues,
        },
        400
      );
    }

    console.error("Booking create error:", err);

    return json(
      {
        ok: false,
        error: "Interne fout",
      },
      500
    );
  }
}