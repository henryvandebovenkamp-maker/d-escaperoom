import { PaymentStatus, PaymentType } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function isBookingPaid(bookingId: string) {
  const payments = await prisma.payment.findMany({
    where: { bookingId, type: PaymentType.DEPOSIT },
    select: { status: true },
  });
  return payments.some(p => p.status === PaymentStatus.PAID);
}
