// PATH: src/app/api/reviews/create/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { BookingStatus } from "@prisma/client";
import { z } from "zod";

import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ReviewCreateSchema = z.object({
  email: z.string().trim().email("Vul het e-mailadres in waarmee je hebt geboekt."),
  name: z.string().trim().min(2, "Vul je naam in.").max(80),
  dogName: z.string().trim().max(80).optional().nullable(),
  rating: z.number().int().min(1).max(5),
  message: z
    .string()
    .trim()
    .min(10, "Schrijf een iets langere review.")
    .max(1200, "Je review is te lang."),
  consent: z.boolean(),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const input = ReviewCreateSchema.parse(json);
    const email = normalizeEmail(input.email);

    const booking = await prisma.booking.findFirst({
      where: {
        status: BookingStatus.CONFIRMED,
        review: null,
        customer: {
          email: {
            equals: email,
            mode: "insensitive",
          },
        },
        slot: {
          startTime: {
            lt: new Date(),
          },
        },
      },
      select: {
        id: true,
        partnerId: true,
      },
      orderBy: {
        slot: {
          startTime: "desc",
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "We konden geen gespeelde boeking zonder review vinden op dit e-mailadres.",
        },
        { status: 403 }
      );
    }

    const review = await prisma.review.create({
      data: {
        bookingId: booking.id,
        partnerId: booking.partnerId,
        name: input.name,
        dogName: input.dogName || null,
        rating: input.rating,
        message: input.message,
        consent: input.consent,

        // Eerst controleren/publiceren in admin.
        isPublished: false,
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      ok: true,
      reviewId: review.id,
    });
  } catch (error) {
    console.error("[reviews_create_error]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.issues[0]?.message || "Controleer je review.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: "Review kon niet worden opgeslagen.",
      },
      { status: 500 }
    );
  }
}