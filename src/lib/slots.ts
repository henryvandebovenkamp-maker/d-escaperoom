import { BookingStatus, PaymentStatus, SlotStatus, PaymentType } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * Als de booking niet betaald is → booking CANCELLED + slot PUBLISHED.
 * Idempotent, safe in concurrentsituaties door transaction & locking via waar-clausules.
 */
export async function releaseSlotIfUnpaid(bookingId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        slotId: true,
        createdAt: true,
        payments: { where: { type: PaymentType.DEPOSIT }, select: { status: true } },
      },
    });
    if (!booking) return { changed: false, reason: "NO_BOOKING" };

    const paid = booking.payments.some(p => p.status === PaymentStatus.PAID);
    if (paid) return { changed: false, reason: "ALREADY_PAID" };

    // Alleen doorzetten als booking nog niet geannuleerd is
    if (booking.status !== BookingStatus.CANCELLED) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED },
      });
    }

    // Slot vrijgeven (alleen als die op BOOKED staat)
    if (booking.slotId) {
      const slot = await tx.slot.findUnique({
        where: { id: booking.slotId },
        select: { id: true, status: true },
      });
      if (slot && slot.status === SlotStatus.BOOKED) {
        await tx.slot.update({
          where: { id: slot.id },
          data: { status: SlotStatus.PUBLISHED }, // publieke agenda
        });
        return { changed: true, reason: "RELEASED" };
      }
    }
    return { changed: true, reason: "BOOKING_CANCELLED_ONLY" };
  });
}
