// PATH: src/lib/events/booking-confirmed.ts
import prisma from "@/lib/prisma";
import { APP_ORIGIN } from "@/lib/env";
import { sendTemplateMail } from "@/lib/mail";

/** Restbedrag berekenen met fallback als restAmountCents niet is ingevuld. */
function calcRestCents(b: {
  totalAmountCents: number;
  depositAmountCents: number;
  discountAmountCents?: number | null;
  giftCardAppliedCents?: number | null;
  restAmountCents?: number | null;
}) {
  if (typeof b.restAmountCents === "number" && b.restAmountCents >= 0) return b.restAmountCents;
  const total = b.totalAmountCents ?? 0;
  const dep   = b.depositAmountCents ?? 0;
  const disc  = b.discountAmountCents ?? 0;
  const gift  = b.giftCardAppliedCents ?? 0;
  return Math.max(total - dep - disc - gift, 0);
}

/** 1) Alleen klantmail (idempotent via emailsSentAt) */
export async function sendCustomerBookingEmail(bookingId: string, p0: { force: boolean; }) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      emailsSentAt: true,
      totalAmountCents: true,
      depositAmountCents: true,
      discountAmountCents: true,
      giftCardAppliedCents: true,
      restAmountCents: true,
      playersCount: true,
      partner: {
        select: {
          name: true,
          email: true,
          addressLine1: true,
          addressLine2: true,
          postalCode: true,
          city: true,
        },
      },
      slot: { select: { startTime: true } },
      customer: { select: { name: true, email: true, locale: true } },
    },
  });

  if (!booking || !booking.partner || !booking.slot || !booking.customer) {
    throw new Error(`[sendCustomerBookingEmail] Onvolledige data voor ${bookingId}`);
  }

  // ⛳ Idempotency guard
  if (booking.emailsSentAt) {
    console.info(`[sendCustomerBookingEmail] E-mails al verzonden voor ${bookingId}; overslaan.`);
    return;
  }

  const restCents = calcRestCents(booking);
  const address = [booking.partner.addressLine1, booking.partner.addressLine2].filter(Boolean).join(", ");
  const town = [booking.partner.postalCode, booking.partner.city].filter(Boolean).join(" ");
  const partnerAddress = [address, town].filter(Boolean).join(" — ");

  await sendTemplateMail({
    to: booking.customer.email,
    template: "booking-customer",
    vars: {
      customerName: booking.customer.name || "",
      partnerName: booking.partner.name,
      partnerAddress,
      slotISO: booking.slot.startTime.toISOString(),
      players: booking.playersCount,
      bookingId: booking.id,
      totalCents: booking.totalAmountCents,
      depositCents: booking.depositAmountCents,
      restCents,
      manageUrl: `${APP_ORIGIN}/booking/${booking.id}`,
      locale: (booking.customer.locale as any) || "nl",
    },
  });
}

/** 2) Alleen partnermail (idempotent via emailsSentAt) */
export async function sendPartnerBookingEmail(bookingId: string, p0: { force: boolean; }) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      emailsSentAt: true,
      totalAmountCents: true,
      depositAmountCents: true,
      discountAmountCents: true,
      giftCardAppliedCents: true,
      restAmountCents: true,
      playersCount: true,
      customer: { select: { name: true, email: true } },
      slot: { select: { startTime: true } },
      partner: {
        select: {
          name: true,
          email: true,
          users: { select: { email: true } },
        },
      },
    },
  });

  if (!booking || !booking.partner || !booking.slot || !booking.customer) {
    throw new Error(`[sendPartnerBookingEmail] Onvolledige data voor ${bookingId}`);
  }

  // ⛳ Idempotency guard
  if (booking.emailsSentAt) {
    console.info(`[sendPartnerBookingEmail] E-mails al verzonden voor ${bookingId}; overslaan.`);
    return;
  }

  const restCents = calcRestCents(booking);
  const recipients = [
    booking.partner.email,
    ...booking.partner.users.map(u => u.email).filter(Boolean),
  ]
    .filter(Boolean)
    .map(s => s!.trim())
    .filter((v, i, a) => a.indexOf(v) === i);

  if (recipients.length === 0) {
    console.warn(`[sendPartnerBookingEmail] Geen partner e-mail voor booking ${bookingId}`);
    return;
  }

  await sendTemplateMail({
    to: recipients[0]!,
    template: "booking-partner",
    vars: {
      partnerName: booking.partner.name,
      partnerEmail: booking.partner.email || recipients[0]!,
      customerName: booking.customer.name || booking.customer.email,
      slotISO: booking.slot.startTime.toISOString(),
      players: booking.playersCount,
      bookingId: booking.id,
      depositCents: booking.depositAmountCents,
      restCents,
      locale: "nl",
    },
  });
}

/**
 * 3) Combinatie-helper:
 * - Stuurt klant + optioneel partner
 * - Markeert booking.emailsSentAt na succesvolle verzending
 * - Idempotent: als emailsSentAt al gezet is → no-op
 */
export async function sendBookingEmails(
  bookingId: string,
  opts: { includePartner?: boolean } = {}
) {
  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, emailsSentAt: true },
  });
  if (!existing) throw new Error(`[sendBookingEmails] Booking niet gevonden: ${bookingId}`);

  if (existing.emailsSentAt) {
    console.info(`[sendBookingEmails] E-mails al verzonden voor ${bookingId}; overslaan.`);
    return;
  }

  await sendCustomerBookingEmail(bookingId, { force: false });
  if (opts.includePartner) {
    await sendPartnerBookingEmail(bookingId, { force: false });
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { emailsSentAt: new Date() },
  });
}

export default sendBookingEmails;
