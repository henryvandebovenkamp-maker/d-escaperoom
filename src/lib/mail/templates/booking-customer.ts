// PATH: src/lib/mail/templates/booking-customer.ts
import { registerTemplate, type TemplateVars, eur, nlDateTime } from "./base";

const Tpl = {
  subject: (v: TemplateVars["booking-customer"]) =>
    `Bevestiging boeking — The Missing Snack — ${nlDateTime(v.slotISO)}`,
  html: (v: TemplateVars["booking-customer"]) => `
  <div style="font-family:ui-sans-serif;line-height:1.6;color:#0c0c0c">
    <h1 style="margin:0 0 12px 0;font-size:20px;">Je boeking is bevestigd 🎉</h1>
    <p>Hoi ${v.customerName || "gast"},</p>
    <p>Je speelt <strong>The Missing Snack</strong> bij <strong>${v.partnerName}</strong>.</p>
    <ul style="padding-left:18px;margin:8px 0 12px 0;">
      <li><strong>Datum & tijd:</strong> ${nlDateTime(v.slotISO)}</li>
      <li><strong>Spelers:</strong> ${v.players}</li>
      ${v.partnerAddress ? `<li><strong>Adres:</strong> ${v.partnerAddress}</li>` : ""}
      <li><strong>Totaal:</strong> ${eur(v.totalCents)}</li>
      <li><strong>Aanbetaling (betaald):</strong> ${eur(v.depositCents)}</li>
      <li><strong>Rest op locatie:</strong> ${eur(v.restCents)}</li>
    </ul>
    <p>Je boeking beheren of wijzigen kan hier:<br/>
      <a href="${v.manageUrl}" style="color:#e11d48">${v.manageUrl}</a>
    </p>
    <p style="color:#555">Tot snel! — Team D-EscapeRoom</p>
  </div>
  `,
  text: (v: TemplateVars["booking-customer"]) =>
    `Boeking bevestigd: The Missing Snack\n` +
    `Partner: ${v.partnerName}\nDatum & tijd: ${nlDateTime(v.slotISO)}\n` +
    `Spelers: ${v.players}\nTotaal: ${eur(v.totalCents)} | Aanbetaling: ${eur(v.depositCents)} | Rest: ${eur(v.restCents)}\n` +
    `Beheer: ${v.manageUrl}\n`,
};
registerTemplate("booking-customer", Tpl);
