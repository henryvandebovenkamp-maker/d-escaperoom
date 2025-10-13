// PATH: src/lib/mail/templates/booking-partner.ts
import { registerTemplate, type TemplateVars, eur, nlDateTime } from "./base";
import { wrapEmail } from "./_layout";
import { APP_ORIGIN } from "@/lib/env";

const Tpl = {
  subject: (v: TemplateVars["booking-partner"]) =>
    `Nieuwe boeking — ${nlDateTime(v.slotISO)} — ${v.customerName}`,

  html: (v: TemplateVars["booking-partner"]) => {
    const body = `
      <p style="margin:0 0 12px 0">
        Er is zojuist een boeking geplaatst voor <strong>The Missing Snack</strong>.
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #e7e5e4;border-radius:10px;margin:8px 0 12px 0">
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #e7e5e4;"><strong>Klant</strong></td>
          <td style="padding:12px 14px;border-bottom:1px solid #e7e5e4;">${v.customerName}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #e7e5e4;"><strong>Slot</strong></td>
          <td style="padding:12px 14px;border-bottom:1px solid #e7e5e4;">${nlDateTime(v.slotISO)}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #e7e5e4;"><strong>Spelers</strong></td>
          <td style="padding:12px 14px;border-bottom:1px solid #e7e5e4;">${v.players}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px"><strong>Rest te voldoen op locatie</strong></td>
          <td style="padding:12px 14px">${eur(v.restCents)}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px"><strong>Booking ID</strong></td>
          <td style="padding:12px 14px">${v.bookingId}</td>
        </tr>
      </table>

      <p style="margin:12px 0 0 0;color:#374151">
        Tip: bekijk de dagagenda om je bezetting in te zien.
      </p>
    `;

    return wrapEmail({
      title: "Nieuwe boeking",
      preheader: `Boeking door ${v.customerName} op ${nlDateTime(v.slotISO)}`,
      bodyHTML: body,
      cta: { label: "Open partner-dashboard", url: `${APP_ORIGIN}/partner` },
      brand: "partner",
    });
  },
};

registerTemplate("booking-partner", Tpl);
