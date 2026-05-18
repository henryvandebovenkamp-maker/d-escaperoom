// PATH: src/lib/review-requests.ts
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import prisma from "@/lib/prisma";
import { APP_ORIGIN, sendTemplateMail } from "@/lib/mail";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || APP_ORIGIN || "https://d-escaperoom.com";

const TIMEZONE = "Europe/Amsterdam";

/** YYYY-MM-DD in Europe/Amsterdam voor een UTC Date */
function toAmsterdamYMD(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

/** UTC-instant voor middernacht Amsterdam op een YYYY-MM-DD */
function startOfAmsterdamDayUtc(ymd: string): Date {
  return fromZonedTime(`${ymd} 00:00:00`, TIMEZONE);
}

/** UTC-instant voor 12:00 Amsterdam op een YYYY-MM-DD */
function noonAmsterdamUtc(ymd: string): Date {
  return fromZonedTime(`${ymd} 12:00:00`, TIMEZONE);
}

/** YYYY-MM-DD + n dagen (kalenderrekening, timezone-onafhankelijk) */
function addDaysYMD(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/**
 * Moment waarop een reviewmail verstuurd mag worden:
 * 12:00 Europe/Amsterdam op de dag ná het slot.
 *
 * Voorbeeld: slot op zaterdag 30 mei 15:00 → due op zondag 31 mei 12:00 Amsterdam
 */
function reviewDueAt(slotStartTime: Date): Date {
  const slotYMD = toAmsterdamYMD(slotStartTime);
  const nextDayYMD = addDaysYMD(slotYMD, 1);
  return noonAmsterdamUtc(nextDayYMD);
}

export async function sendPendingReviewRequests() {
  const now = new Date();
  const todayYMD = toAmsterdamYMD(now);

  // Slot moet gestart zijn vóór vandaag (Amsterdam-tijd).
  // Dit vangt alle boekingen van gisteren en eerder.
  const startOfTodayUtc = startOfAmsterdamDayUtc(todayYMD);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reviewRequestSentAt: null,
      review: null,
      slot: {
        startTime: { lt: startOfTodayUtc },
      },
    },
    include: {
      customer: true,
      partner: true,
      slot: { select: { startTime: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  for (const booking of bookings) {
    if (!booking.slot) continue;

    // Stuur alleen als 12:00 Amsterdam op de dag ná het slot verstreken is.
    const due = reviewDueAt(booking.slot.startTime);
    if (now < due) continue;

    try {
      const reviewUrl = `${APP_URL}/review?email=${encodeURIComponent(
        booking.customer.email
      )}`;

      await sendTemplateMail({
        template: "review-request",
        to: booking.customer.email,
        vars: {
          customerName: booking.customer.name || "gast",
          partnerName: booking.partner.name,
          dogName: booking.dogName || undefined,
          reviewUrl,
          locale: "nl",
        },
      });

      // Markeer ALLEEN na succesvolle verzending.
      // Bij een fout blijft reviewRequestSentAt null → retry bij volgende cron-run.
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
