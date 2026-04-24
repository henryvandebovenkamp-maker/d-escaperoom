import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      bookingId?: string;
      dogName?: string | null;
      dogAllergies?: string | null;
      dogFears?: string | null;
      dogSocialWithPeople?: boolean | null;
    };

    const {
      bookingId,
      dogName,
      dogAllergies,
      dogFears,
      dogSocialWithPeople,
    } = body;

    if (!bookingId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_ID" },
        { status: 400 }
      );
    }

    const socialWithPeople: boolean | null =
      dogSocialWithPeople === true
        ? true
        : dogSocialWithPeople === false
          ? false
          : null;

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        dogName: dogName ?? null,
        dogAllergies: dogAllergies ?? null,
        dogFears: dogFears ?? null,
        dogSocialWithPeople: socialWithPeople,
      },
      select: {
        id: true,
        dogName: true,
        dogAllergies: true,
        dogFears: true,
        dogSocialWithPeople: true,
      },
    });

    return NextResponse.json({ ok: true, booking }, { status: 200 });
  } catch (err: any) {
    console.error("[POST /api/booking/update-dog] error:", err);

    return NextResponse.json(
      { ok: false, error: err?.message ?? "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}