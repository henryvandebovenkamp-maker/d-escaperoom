// PATH: src/lib/mail/templates/booking-partner.ts
import { register, type TemplateDef, layout, formatEUR, formatNLDateTime, type TemplateVars } from "./base";

const T: TemplateDef<"booking-partner"> = {
  id: "booking-partner",
  subject(v: TemplateVars["booking-partner"]) {
    return `Nieuwe boeking ${v.bookingId}`;
  },
  html(v: TemplateVars["booking-partner"]) {
    const when = formatNLDateTime(v.slotISO);
    const body = `
      <h1 style="margin:0 0 12px 0;">Nieuwe boeking</h1>
      <table style="margin:16px 0 12px 0">
        <tr><th>Boekingsnummer</th><td>${v.bookingId}</td></tr>
        <tr><th>Wanneer</th><td>${when}</td></tr>
        <tr><th>Deelnemers</th><td>${v.players}</td></tr>
        <tr><th>Totaal</th><td>${formatEUR(v.totalCents)}</td></tr>
        <tr><th>Aanbetaling</th><td>${formatEUR(v.depositCents)} (betaald)</td></tr>
        <tr><th>Restbedrag</th><td>${formatEUR(v.restCents)} (op locatie)</td></tr>
        <tr><th>Klant</th><td>${v.customerName ?? ""} &lt;${v.customerEmail}&gt;</td></tr>
      </table>

      <p style="margin:16px 0 24px 0;">
        <a class="btn" href="${v.partnerDashboardUrl}">Open dashboard</a>
      </p>
    `;
    return layout({
      title: "Nieuwe boeking",
      preheader: `Nieuwe boeking ${v.bookingId}`,
      bodyHtml: body,
    });
  },
  text(v: TemplateVars["booking-partner"]) {
    return `Nieuwe boeking

Boekingsnummer: ${v.bookingId}
Wanneer: ${formatNLDateTime(v.slotISO)}
Deelnemers: ${v.players}
Totaal: ${formatEUR(v.totalCents)}
Aanbetaling: ${formatEUR(v.depositCents)} (betaald)
Restbedrag: ${formatEUR(v.restCents)} (op locatie)
Klant: ${v.customerName ?? ""} <${v.customerEmail}>

Dashboard: ${v.partnerDashboardUrl}`;
  },
};
register(T);
