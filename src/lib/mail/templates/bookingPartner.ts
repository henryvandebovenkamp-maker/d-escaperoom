// PATH: src/lib/mail/templates/bookingPartner.ts
import { Booking, Partner, Customer } from "@prisma/client";
import { fmtEUR, fmtDateTimeISO, stripHtml } from "../format";
import { wrap } from "./_base";

export type BookingPartnerInput = {
  booking: Booking;
  partner: Partner;
  customer: Customer;
  slot: { startTime: string; endTime: string };
};

export function bookingPartnerTemplate({ booking, partner, customer, slot }: BookingPartnerInput) {
  const tz = partner.timezone || "Europe/Amsterdam";
  const startStr = fmtDateTimeISO(slot.startTime, tz);

  const html = wrap(
    "Nieuwe boeking (bevestigd)",
    `
      <p><strong>Nieuwe boeking bevestigd bij ${partner.name}</strong></p>
      <p><strong>Start:</strong> ${startStr}</p>
      <p><strong>Klant:</strong> ${customer.name ?? customer.email} (${customer.email})</p>
      <p><strong>Spelers:</strong> ${booking.playersCount} • <strong>Hond:</strong> ${booking.dogName ?? "n.v.t."}</p>
      <hr style="border:none;border-top:1px solid #e7e5e4;margin:16px 0"/>
      <p>
        <strong>Totaal:</strong> ${fmtEUR(booking.totalAmountCents)}<br/>
        <strong>Aanbetaling (betaald):</strong> ${fmtEUR(booking.depositAmountCents)}<br/>
        <strong>Rest op locatie:</strong> ${fmtEUR(booking.restAmountCents)}
      </p>
      ${booking.discountAmountCents ? `<p><em>Korting toegepast: −${fmtEUR(booking.discountAmountCents)}</em></p>` : ""}
      <p>Boeking-ID: ${booking.id}</p>
    `
  );

  return {
    subject: `Nieuwe boeking • ${startStr} • ${customer.name ?? customer.email}`,
    html,
    text: stripHtml(html),
  };
}
