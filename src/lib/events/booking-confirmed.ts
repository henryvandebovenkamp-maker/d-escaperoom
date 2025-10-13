// PATH: src/lib/events/booking-confirmed.ts
import prisma from "@/lib/prisma";
import { APP_ORIGIN } from "@/lib/env";
import { sendTemplateMail } from "@/lib/mail";

/** Netjes adres samenstellen voor de klantmail. */
function formatPartnerAddress(p?: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
}) {
  if (!p) return "";
  const line1 = p.addressLine1?.trim() || "";
  const line2 = p.addressLine2?.trim() || "";
  const pc    = p.postalCode?.trim() || "";
  const city  = p.city?.trim() || "";
  const address = [line1, line2].filter(Boolean).join(", ");
  const town    = [pc, city].filter(Boolean).join(" ");
  return [address, town].filter(Boolean).join(" — ");
}

/**
 * Verstuurt de bevestigingsmails (customer + partner) op basis van een bestaande, reeds
 * bevestigde booking. Deze helper **wijzigt geen DB-status**; hij verstuurt alléén e-mails
 * via templates. Perfect om in je webhook ná het bevestigen aan te roepen.
 */
export async function sendBookingEmails(bookingId: string): Promise<{
  sentCustomer: boolean;
  sentPartner: boolean;
}> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      partner: { include: { users: true } },
      slot: true,
      customer: true,
      discountCode: true,
    },
  });

  if (!booking || !booking.partner || !booking.slot || !booking.customer) {
    throw new Error(`[sendBookingEmails] Onvolledige booking-context voor id=${bookingId}`);
  }

  const manageUrl      = `${APP_ORIGIN}/booking/${booking.id}`;
  const partnerAddress = formatPartnerAddress(booking.partner);
  const totalCents     = booking.totalAmountCents;
  const depositCents   = booking.depositAmountCents;
  const restCents      = Math.max(
    (booking.restAmountCents ?? (totalCents - depositCents)) || 0,
    0
  );

  // === CUSTOMER MAIL ===
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
      totalCents,
      depositCents,
      restCents,
      manageUrl,
      locale: (booking.customer.locale as any) || "nl",
    },
  });

  // === PARTNER MAIL ===
  const partnerRecipients = [
    booking.partner.email,
    ...booking.partner.users.map(u => u.email).filter(Boolean),
  ]
    .filter(Boolean)
    .map(s => s!.trim())
    .filter((v, i, arr) => arr.indexOf(v) === i); // unique

  if (partnerRecipients.length > 0) {
    await sendTemplateMail({
      to: partnerRecipients[0],
      template: "booking-partner",
      vars: {
        partnerName: booking.partner.name,
        partnerEmail: booking.partner.email || partnerRecipients[0],
        customerName: booking.customer.name || booking.customer.email,
        slotISO: booking.slot.startTime.toISOString(),
        players: booking.playersCount,
        bookingId: booking.id,
        depositCents,
        locale: "nl",
      },
    });
  } else {
    console.warn(`[sendBookingEmails] Geen partner e-mail gevonden voor partner ${booking.partnerId}`);
  }

  return { sentCustomer: true, sentPartner: partnerRecipients.length > 0 };
}

/** ↙️ Voor wie per ongeluk default importeert: dit voorkomt de TS-fout. */
export default sendBookingEmails;
