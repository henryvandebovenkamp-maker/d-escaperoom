import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { BookingStatus, PaymentStatus, PaymentType } from "@prisma/client";
import { releaseSlotIfUnpaid } from "@/lib/slots";

const TTL_MINUTES = 30;

export async function POST() {
  const cutoff = new Date(Date.now() - TTL_MINUTES * 60 * 1000);

  const pending = await prisma.booking.findMany({
    where: {
      status: BookingStatus.PENDING,
      createdAt: { lt: cutoff },
      payments: { some: { type: PaymentType.DEPOSIT, status: { in: [PaymentStatus.PENDING, PaymentStatus.CANCELED, PaymentStatus.FAILED] } } },
    },
    select: { id: true },
  });

  for (const b of pending) {
    await releaseSlotIfUnpaid(b.id);
  }

  return NextResponse.json({ ok: true, processed: pending.length });
}
