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

/** 1) Alleen klantmail */
export async function sendCustomerBookingEmail(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { partner: true, slot: true, customer: true },
  });
  if (!booking || !booking.partner || !booking.slot || !booking.customer) {
    throw new Error(`[sendCustomerBookingEmail] Onvolledige data voor ${bookingId}`);
  }

  const restCents = calcRestCents(booking);
  const address =
    [booking.partner.addressLine1, booking.partner.addressLine2].filter(Boolean).join(", ");
  const town =
    [booking.partner.postalCode, booking.partner.city].filter(Boolean).join(" ");
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

/** 2) Alleen partnermail (alleen gebruiken bij PAID/webhook) */
export async function sendPartnerBookingEmail(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { partner: { include: { users: true } }, slot: true, customer: true },
  });
  if (!booking || !booking.partner || !booking.slot || !booking.customer) {
    throw new Error(`[sendPartnerBookingEmail] Onvolledige data voor ${bookingId}`);
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
    console.warn(`[sendPartnerBookingEmail] Geen partner e-mail voor partner ${booking.partnerId}`);
    return;
  }

  await sendTemplateMail({
    to: recipients[0],
    template: "booking-partner",
    vars: {
      partnerName: booking.partner.name,
      partnerEmail: booking.partner.email || recipients[0],
      customerName: booking.customer.name || booking.customer.email,
      slotISO: booking.slot.startTime.toISOString(),
      players: booking.playersCount,
      bookingId: booking.id,
      depositCents: booking.depositAmountCents, // niet getoond in template, maar oké
      restCents,
      locale: "nl",
    },
  });
}

/** 3) Combinatie-helper: standaard GEEN partner (voorkomt dubbele mails bij 'bekijk') */
export async function sendBookingEmails(
  bookingId: string,
  opts: { includePartner?: boolean } = {}
) {
  await sendCustomerBookingEmail(bookingId);
  if (opts.includePartner) {
    await sendPartnerBookingEmail(bookingId);
  }
}

export default sendBookingEmails;
