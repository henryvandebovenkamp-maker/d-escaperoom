// PATH: src/lib/review-requests.ts

import prisma from "@/lib/prisma";

import { sendEmail } from "@/lib/mail/send-email";
import { buildReviewRequestEmail } from "@/lib/mail/templates/review-request";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.d-escaperoom.com";

export async function sendPendingReviewRequests() {
  const yesterday = new Date();

  yesterday.setHours(yesterday.getHours() - 24);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",

      reviewRequestSentAt: null,

      slot: {
        endTime: {
          lte: yesterday,
        },
      },

      review: null,
    },

    include: {
      customer: true,
    },

    take: 50,
  });

  for (const booking of bookings) {
    const reviewUrl =
      `${APP_URL}/review?email=` +
      encodeURIComponent(booking.customer.email);

    const mail = buildReviewRequestEmail({
      customerName: booking.customer.name,
      dogName: booking.dogName,
      reviewUrl,
    });

    try {
      await sendEmail({
        to: booking.customer.email,
        subject: mail.subject,
        html: mail.html,
      });

      await prisma.booking.update({
        where: {
          id: booking.id,
        },

        data: {
          reviewRequestSentAt: new Date(),
        },
      });

      console.log(
        "[review_request_sent]",
        booking.customer.email
      );
    } catch (error) {
      console.error(
        "[review_request_failed]",
        booking.customer.email,
        error
      );
    }
  }
}