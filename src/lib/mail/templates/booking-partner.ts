// PATH: src/lib/mail/templates/booking-partner.ts
import { registerTemplate, type TemplateVars, eur, nlDateTime } from "./base";

const Tpl = {
  subject: (v: TemplateVars["booking-partner"]) =>
    `Nieuwe boeking — ${nlDateTime(v.slotISO)} — ${v.customerName}`,
  html: (v: TemplateVars["booking-partner"]) => `
  <div style="font-family:ui-sans-serif;line-height:1.6;color:#0c0c0c">
    <h1 style="margin:0 0 12px 0;font-size:18px;">Nieuwe boeking</h1>
    <ul style="padding-left:18px;margin:8px 0 12px 0;">
      <li><strong>Klant:</strong> ${v.customerName}</li>
      <li><strong>Slot:</strong> ${nlDateTime(v.slotISO)}</li>
      <li><strong>Spelers:</strong> ${v.players}</li>
      <li><strong>Aanbetaling (binnen):</strong> ${eur(v.depositCents)}</li>
      <li><strong>Booking ID:</strong> ${v.bookingId}</li>
    </ul>
    <p>— Automatische melding D-EscapeRoom</p>
  </div>
  `,
};
registerTemplate("booking-partner", Tpl);
