// PATH: src/lib/mail/templates/booking-customer.ts
import { z } from "zod";
import { registerTemplate, type TemplateDef, type Locale } from "./base";

const Vars = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  partnerName: z.string(),
  partnerAddress: z.string().optional(),
  slotISO: z.string(),                // "2025-10-13T14:00:00+02:00"
  players: z.number().int().min(1).max(3),
  bookingId: z.string(),
  totalCents: z.number().int(),
  depositCents: z.number().int(),
  restCents: z.number().int(),
  manageUrl: z.string().url().optional(), // link naar /booking/[bookingId]
});

const subjectBy = (loc: Locale, p: string, when: string) =>
  loc === "nl" ? `Bevestiging boeking — ${p} — ${when}`
: loc === "de" ? `Buchungsbestätigung — ${p} — ${when}`
: loc === "es" ? `Confirmación de reserva — ${p} — ${when}`
:               `Booking confirmation — ${p} — ${when}`;

const T: TemplateDef<typeof Vars> = {
  id: "booking_customer",
  varsSchema: Vars,
  subject: (loc, v) => subjectBy(loc, v.partnerName, new Date(v.slotISO).toLocaleString("nl-NL")),
  renderHtml(loc, v, h) {
    const rows = `
      <table>
        <tr><td>Partner</td><td class="right"><strong>${v.partnerName}</strong></td></tr>
        ${v.partnerAddress ? `<tr><td>Adres</td><td class="right">${v.partnerAddress}</td></tr>` : ""}
        <tr><td>Datum & tijd</td><td class="right">${new Date(v.slotISO).toLocaleString("nl-NL")}</td></tr>
        <tr><td>Spelers</td><td class="right">${v.players}</td></tr>
      </table>
      <hr/>
      <table>
        <tr><td>Totaal</td><td class="right"><strong>${h.euro(v.totalCents)}</strong></td></tr>
        <tr><td>Aanbetaling (betaald)</td><td class="right">${h.euro(v.depositCents)}</td></tr>
        <tr><td>Rest op locatie</td><td class="right">${h.euro(v.restCents)}</td></tr>
      </table>
    `;
    const cta = v.manageUrl
      ? `<p><a class="btn" href="${v.manageUrl}">Bekijk boeking</a></p>`
      : "";

    const body = `
      <p>Bedankt voor je boeking! Je aanbetaling is ontvangen. Het resterende bedrag betaal je op de hondenschool.</p>
      ${rows}
      ${cta}
      <p class="muted">Boeking ID: ${v.bookingId}</p>
    `;
    return h.renderBase({ title: "Boekingsbevestiging", lead: v.customerEmail, body, locale: loc });
  },
};

registerTemplate(T);
