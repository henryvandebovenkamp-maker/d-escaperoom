// PATH: src/lib/mail/templates/bookingCustomer.ts
import { Booking, Partner, Customer } from "@prisma/client";
import { fmtEUR, fmtDateTimeISO, stripHtml } from "../format";
import { wrap } from "./_base";

export type BookingCustomerInput = {
  booking: Booking & { // verwacht slot en partner in route waar je dit aanroept
    // start/end komen via slot
  };
  customer: Customer;
  partner: Partner;
  slot: { startTime: string; endTime: string };
};

export function bookingCustomerTemplate({ booking, customer, partner, slot }: BookingCustomerInput) {
  const tz = partner.timezone || "Europe/Amsterdam";
  const startStr = fmtDateTimeISO(slot.startTime, tz);
  const html = wrap(
    "Bevestiging van je boeking",
    `
      <p>Beste ${customer.name ?? "gast"},</p>
      <p>Bedankt voor je boeking bij <strong>${partner.name}</strong>.</p>
      <p><strong>Wanneer:</strong> ${startStr}<br/>
         <strong>Locatie:</strong> ${partner.addressLine1 ?? ""} ${partner.postalCode ?? ""} ${partner.city ?? ""}</p>
      <p><strong>Spelers:</strong> ${booking.playersCount} • <strong>Hond:</strong> ${booking.dogName ?? "n.v.t."}</p>
      <hr style="border:none;border-top:1px solid #e7e5e4;margin:16px 0"/>
      <p>
        <strong>Totaal:</strong> ${fmtEUR(booking.totalAmountCents)}<br/>
        <strong>Betaald (aanbetaling):</strong> ${fmtEUR(booking.depositAmountCents)}<br/>
        <strong>Te betalen op locatie:</strong> ${fmtEUR(booking.restAmountCents)}
      </p>
      ${booking.discountAmountCents ? `<p><em>Inclusief korting: −${fmtEUR(booking.discountAmountCents)}</em></p>` : ""}
      <p style="margin-top:16px">Je betaalt nu alleen de aanbetaling; het restbedrag reken je af op de hondenschool.</p>
      <p>Tot snel! Team D-EscapeRoom</p>
    `
  );
  return {
    subject: `Bevestiging • ${partner.name} • ${startStr}`,
    html,
    text: stripHtml(html),
  };
}
