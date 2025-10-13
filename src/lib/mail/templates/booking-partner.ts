// PATH: src/lib/mail/templates/booking-partner.ts
import { z } from "zod";
import { registerTemplate, type TemplateDef, type Locale } from "./base";

const Vars = z.object({
  partnerEmail: z.string().email(),
  partnerName: z.string(),
  bookingId: z.string(),
  slotISO: z.string(),
  players: z.number().int().min(1).max(3),
  customerEmail: z.string().email(),
  depositCents: z.number().int(),
  restCents: z.number().int(),
});

const subjectBy = (loc: Locale, p: string, when: string) =>
  loc === "nl" ? `Nieuwe boeking — ${p} — ${when}`
: loc === "de" ? `Neue Buchung — ${p} — ${when}`
: loc === "es" ? `Nueva reserva — ${p} — ${when}`
:               `New booking — ${p} — ${when}`;

const T: TemplateDef<typeof Vars> = {
  id: "booking_partner",
  varsSchema: Vars,
  subject: (loc, v) => subjectBy(loc, v.partnerName, new Date(v.slotISO).toLocaleString("nl-NL")),
  renderHtml(loc, v, h) {
    const body = `
      <p>Er is een nieuwe boeking bevestigd.</p>
      <table>
        <tr><td>Datum & tijd</td><td class="right">${new Date(v.slotISO).toLocaleString("nl-NL")}</td></tr>
        <tr><td>Spelers</td><td class="right">${v.players}</td></tr>
        <tr><td>Klant</td><td class="right">${v.customerEmail}</td></tr>
      </table>
      <hr/>
      <table>
        <tr><td>Aanbetaling (betaald)</td><td class="right">${h.euro(v.depositCents)}</td></tr>
        <tr><td>Rest op locatie</td><td class="right">${h.euro(v.restCents)}</td></tr>
      </table>
      <p class="muted">Boeking ID: ${v.bookingId}</p>
    `;
    return h.renderBase({ title: "Nieuwe boeking", lead: v.partnerName, body, locale: loc });
  },
};

registerTemplate(T);
