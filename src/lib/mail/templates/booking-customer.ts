// PATH: src/lib/mail/templates/booking-customer.ts
import { registerTemplate, type TemplateVars, eur, nlDateTime } from "./base";
import { wrapEmail } from "./_layout";

function mapsUrlFromAddress(address: string) {
  const q = encodeURIComponent(address.replace(/\s+/g, " ").trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

const Tpl = {
  subject: (v: TemplateVars["booking-customer"]) =>
    `Bevestiging — The Missing Snack — ${nlDateTime(v.slotISO)}`,

  html: (v: TemplateVars["booking-customer"]) => {
    const address = v.partnerAddress || "";
    const mapsUrl = mapsUrlFromAddress(address);
    const body = `
      <p style="margin:0 0 12px 0">Hoi ${v.customerName || "gast"},</p>
      <p style="margin:0 0 16px 0">
        Je boeking voor <strong>The Missing Snack</strong> bij <strong>${v.partnerName}</strong> is
        <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#f3f4f6;color:#111827;font-weight:600">bevestigd</span>.
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #e7e5e4;border-radius:10px;margin:8px 0 12px 0">
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #e7e5e4;"><strong>Datum & tijd</strong></td>
          <td style="padding:12px 14px;border-bottom:1px solid #e7e5e4;">${nlDateTime(v.slotISO)}</td>
        </tr>
        ${address ? `
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #e7e5e4;"><strong>Locatie</strong></td>
          <td style="padding:12px 14px;border-bottom:1px solid #e7e5e4;">
            ${address}<br/>
            <a href="${mapsUrl}" style="color:#2563eb;text-decoration:underline">Route in Google Maps</a>
          </td>
        </tr>` : "" }
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #e7e5e4;"><strong>Spelers</strong></td>
          <td style="padding:12px 14px;border-bottom:1px solid #e7e5e4;">${v.players}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px"><strong>Totaal</strong></td>
          <td style="padding:12px 14px">${eur(v.totalCents)}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px"><strong>Aanbetaling (betaald)</strong></td>
          <td style="padding:12px 14px">${eur(v.depositCents)}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px"><strong>Rest op locatie</strong></td>
          <td style="padding:12px 14px">${eur(v.restCents)}</td>
        </tr>
      </table>

      <p style="margin:12px 0 0 0;color:#374151">
        Tip: kom 5 minuten eerder. Betaling van het restbedrag kan op locatie.
      </p>
    `;

    return wrapEmail({
      title: "Je boeking is bevestigd 🎉",
      preheader: `Bevestiging voor ${v.partnerName} op ${nlDateTime(v.slotISO)}`,
      bodyHTML: body,
      cta: { label: "Beheer je boeking", url: v.manageUrl },
      brand: "consumer",
    });
  },

  text: (v: TemplateVars["booking-customer"]) =>
    [
      `Je boeking is bevestigd`,
      ``,
      `The Missing Snack — ${v.partnerName}`,
      `Datum & tijd: ${nlDateTime(v.slotISO)}`,
      `Spelers: ${v.players}`,
      `Totaal: ${eur(v.totalCents)} | Aanbetaling: ${eur(v.depositCents)} | Rest: ${eur(v.restCents)}`,
      `Beheer: ${v.manageUrl}`,
    ].join("\n"),
};

registerTemplate("booking-customer", Tpl);
