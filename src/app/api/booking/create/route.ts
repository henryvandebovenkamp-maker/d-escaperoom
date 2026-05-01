// PATH: src/app/api/booking/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  BookingStatus,
  Prisma,
  SlotStatus,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const FIXED_TOTAL_CENTS = 7990;
const PENDING_BOOKING_TTL_SECONDS = 90;

function json(data: unknown, status = 200, extraHeaders?: Record<string, string>) {
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

function computePriceCents(feePercent: number) {
  const totalCents = FIXED_TOTAL_CENTS;
  const depositCents = Math.round((totalCents * feePercent) / 100);

  return {
    currency: "EUR",
    totalCents,
    depositCents,
    restCents: totalCents - depositCents,
  };
}

function isExpiredPendingBooking(booking: {
  status: BookingStatus;
  createdAt: Date;
}) {
  if (booking.status !== BookingStatus.PENDING) return false;

  return (
    Date.now() >
    booking.createdAt.getTime() + PENDING_BOOKING_TTL_SECONDS * 1000
  );
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
    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
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
      players: raw.players ?? raw.playersCount,
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
    const normalizedEmail = data.customer.email.trim().toLowerCase();

    const result = await prisma.$transaction(
      async (tx) => {
        const partner = await tx.partner.findUnique({
          where: { slug: data.partnerSlug },
          select: {
            id: true,
            feePercent: true,
          },
        });

        if (!partner) {
          return {
            status: 404,
            body: { ok: false, error: "Partner niet gevonden" },
          };
        }

        const slot = data.slotId
          ? await tx.slot.findFirst({
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
          : await tx.slot.findFirst({
              where: {
                partnerId: partner.id,
                startTime: new Date(data.startTimeISO!),
              },
              select: {
                id: true,
                status: true,
                startTime: true,
              },
            });

        if (!slot) {
          return {
            status: 404,
            body: { ok: false, error: "Tijdslot niet gevonden" },
          };
        }

        if (slot.status !== SlotStatus.PUBLISHED) {
          return {
            status: 409,
            body: {
              ok: false,
              error:
                slot.status === SlotStatus.BOOKED
                  ? "Tijdslot is al geboekt"
                  : "Tijdslot is niet beschikbaar",
            },
          };
        }

        const existing = await tx.booking.findUnique({
          where: { slotId: slot.id },
          select: {
            id: true,
            status: true,
            createdAt: true,
            slotId: true,
          },
        });

        if (existing?.status === BookingStatus.CONFIRMED) {
          return {
            status: 409,
            body: {
              ok: false,
              error: "Tijdslot is al geboekt",
              details: [
                {
                  path: ["slotId"],
                  message: "Dit tijdslot is al definitief geboekt.",
                },
              ],
            },
          };
        }

        if (
          existing?.status === BookingStatus.PENDING &&
          !isExpiredPendingBooking(existing)
        ) {
          const secondsLeft = Math.max(
            1,
            Math.ceil(
              (existing.createdAt.getTime() +
                PENDING_BOOKING_TTL_SECONDS * 1000 -
                Date.now()) /
                1000
            )
          );

          return {
            status: 409,
            body: {
              ok: false,
              error: "Tijdslot is tijdelijk gereserveerd",
              details: [
                {
                  path: ["slotId"],
                  message: `Dit tijdslot is tijdelijk gereserveerd. Probeer het over ${secondsLeft} seconden opnieuw.`,
                },
              ],
              booking: {
                id: existing.id,
                status: existing.status,
              },
              secondsLeft,
            },
          };
        }

        if (
          existing?.status === BookingStatus.PENDING &&
          isExpiredPendingBooking(existing)
        ) {
          await tx.payment.deleteMany({
            where: { bookingId: existing.id },
          });

          await tx.booking.delete({
            where: { id: existing.id },
          });

          await tx.slot.update({
            where: { id: slot.id },
            data: {
              status: SlotStatus.PUBLISHED,
              bookedAt: null,
            },
          });
        }

        if (existing?.status === BookingStatus.CANCELLED) {
          await tx.payment.deleteMany({
            where: { bookingId: existing.id },
          });

          await tx.booking.delete({
            where: { id: existing.id },
          });

          await tx.slot.update({
            where: { id: slot.id },
            data: {
              status: SlotStatus.PUBLISHED,
              bookedAt: null,
            },
          });
        }

        let customer = await tx.customer.findFirst({
          where: { email: normalizedEmail },
          select: { id: true },
        });

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              email: normalizedEmail,
              name: data.customer.name,
              phone: data.customer.phone ?? null,
              locale: data.customer.locale ?? "nl",
            },
            select: { id: true },
          });
        } else {
          await tx.customer.update({
            where: { id: customer.id },
            data: {
              name: data.customer.name,
              phone: data.customer.phone ?? null,
              locale: data.customer.locale ?? "nl",
            },
          });
        }

        const price = computePriceCents(partner.feePercent);

        const booking = await tx.booking.create({
          data: {
            partnerId: partner.id,
            slotId: slot.id,
            customerId: customer.id,

            status: BookingStatus.PENDING,
            emailsSentAt: null,

            currency: price.currency,
            totalAmountCents: price.totalCents,
            depositAmountCents: price.depositCents,
            restAmountCents: price.restCents,

            playersCount: data.players,

            dogName: data.dog?.name ?? null,
            dogAllergies: data.dog?.allergies ?? null,
            dogFears: data.dog?.fears ?? null,
            dogTrackingLevel: data.dog?.trackingLevel ?? null,

            confirmedAt: null,
            cancelledAt: null,
            depositPaidAt: null,

            giftCardId: null,
            giftCardAppliedCents: null,
            discountCodeId: null,
            discountAmountCents: 0,
          },
          select: {
            id: true,
            status: true,
            slotId: true,
          },
        });

        return {
          status: 201,
          body: {
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
              status: SlotStatus.PUBLISHED,
            },
            expiresInSeconds: PENDING_BOOKING_TTL_SECONDS,
            expiresInMinutes: PENDING_BOOKING_TTL_SECONDS / 60,
          },
          headers: {
            Location: `/api/booking/${booking.id}`,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return json(result.body, result.status, result.headers);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return json(
        {
          ok: false,
          error: "Validatie fout",
          details: err.issues,
        },
        400
      );
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return json(
        {
          ok: false,
          error: "Tijdslot net geboekt of dubbele aanvraag",
          details: [
            {
              path: ["slotId"],
              message:
                "Dit tijdslot werd net door iemand anders gereserveerd. Wacht kort of kies een ander tijdslot.",
            },
          ],
        },
        409
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