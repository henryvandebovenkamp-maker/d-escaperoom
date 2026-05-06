// PATH: src/lib/review-requests.ts
import prisma from "@/lib/prisma";
import { APP_ORIGIN, sendTemplateMail } from "@/lib/mail";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || APP_ORIGIN || "https://d-escaperoom.com";

export async function sendPendingReviewRequests() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reviewRequestSentAt: null,
      review: null,
      slot: {
        startTime: {
          gte: yesterday,
          lt: today,
        },
      },
    },
    include: {
      customer: true,
      partner: true,
    },
    take: 50,
  });

  for (const booking of bookings) {
    try {
      const reviewUrl = `${APP_URL}/review?email=${encodeURIComponent(
        booking.customer.email
      )}`;

      await sendTemplateMail({
        template: "review-request",
        to: booking.customer.email,
        vars: {
          customerName: booking.customer.name || "cowboy",
          partnerName: booking.partner.name,
          dogName: booking.dogName || undefined,
          reviewUrl,
          locale: "nl",
        },
      });

      await prisma.booking.update({
        where: { id: booking.id },
        data: { reviewRequestSentAt: new Date() },
      });

      console.log("[review_request_sent]", booking.id);
    } catch (error) {
      console.error("[review_request_error]", booking.id, error);
    }
  }
}