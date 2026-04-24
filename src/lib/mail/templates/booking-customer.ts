// PATH: src/lib/mail/templates/booking-customer.ts
import { registerTemplate, type TemplateVars, eur, nlDateTime } from "./base";
import { wrapEmail } from "./_layout";

function mapsUrlFromAddress(address: string) {
  const q = encodeURIComponent(address.replace(/\s+/g, " ").trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// Format voor Google Calendar: YYYYMMDDTHHMMSSZ
function asGCalDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function googleCalendarUrl(v: TemplateVars["booking-customer"]) {
  const start = new Date(v.slotISO);
  // D-EscapeRoom slotduur = 60 min
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const title = `The Stolen Snack @ ${v.partnerName}`;
  const details =
    `Boeking bevestigd.\n` +
    `Spelers: ${v.players}\n` +
    `Totaal: ${eur(v.totalCents)}\nAanbetaling: ${eur(v.depositCents)}\nRest: ${eur(v.restCents)}\n` +
    `Let op: spelen met een loopse teef is niet toegestaan. In dat geval verzetten we de afspraak graag in overleg.\n` +
    (v.manageUrl ? `Beheer je boeking: ${v.manageUrl}\n` : ``);

  const location = v.partnerAddress || "";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${asGCalDate(start)}/${asGCalDate(end)}`,
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const Tpl = {
  // ✅ Forceer juiste afzendernaam (laat zo staan als dit voor jou klopt)
  from: '"D-EscapeRoom" <no-reply@d-escaperoom.com>',

  subject: (v: TemplateVars["booking-customer"]) =>
    `Bevestiging — The Stolen Snack — ${nlDateTime(v.slotISO)}`,

  html: (v: TemplateVars["booking-customer"]) => {
    const address = v.partnerAddress || "";
    const mapsUrl = address ? mapsUrlFromAddress(address) : "";
    const body = `
      <p style="margin:0 0 12px 0">Hoi ${v.customerName || "gast"},</p>

      <p style="margin:0 0 8px 0">
        Je boeking voor <strong>The Stolen Snack</strong> bij <strong>${v.partnerName}</strong> is
        <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#f3f4f6;color:#111827;font-weight:600">bevestigd</span>.
      </p>

      <p style="margin:0 0 16px 0">
        Wat leuk dat je het avontuur <strong>met je hond</strong> aangaat! 🐾
        Deze beleving is juist ontworpen om <em>samen</em> te spelen en nieuwe dingen te ontdekken.
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
        <strong>Kleine tips:</strong> kom 5 minuten eerder, neem wat favoriete beloningssnacks mee
        en zorg dat je hond een kort plasje heeft gedaan. Het resterende bedrag reken je op locatie af.
      </p>

      <p style="margin:12px 0 0 0;padding:12px 14px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#7c2d12">
        <strong>Let op:</strong> het is niet toegestaan om met een loopse teef het spel te spelen.
        Is je hond loops op het moment van de afspraak? Dan verzetten we de afspraak graag in overleg.
      </p>
    `;

    return wrapEmail({
      title: "Je boeking is bevestigd 🎉",
      preheader: `Wat leuk dat je met je hond het avontuur aangaat — ${v.partnerName}, ${nlDateTime(v.slotISO)}`,
      bodyHTML: body,
      cta: { label: "Zet in mijn agenda", url: googleCalendarUrl(v) },
      brand: "consumer",
    });
  },

  text: (v: TemplateVars["booking-customer"]) => {
    const gcal = googleCalendarUrl(v);
    return [
      `Je boeking is bevestigd`,
      ``,
      `Wat leuk dat je het avontuur met je hond aangaat!`,
      `The Stolen Snack — ${v.partnerName}`,
      `Datum & tijd: ${nlDateTime(v.slotISO)}`,
      `Spelers: ${v.players}`,
      `Totaal: ${eur(v.totalCents)} | Aanbetaling: ${eur(v.depositCents)} | Rest: ${eur(v.restCents)}`,
      ``,
      `Let op: het is niet toegestaan om met een loopse teef het spel te spelen.`,
      `Is je hond loops op het moment van de afspraak? Dan verzetten we de afspraak graag in overleg.`,
      ``,
      `Agenda (Google): ${gcal}`,
      v.manageUrl ? `Beheer: ${v.manageUrl}` : ``,
    ].filter(Boolean).join("\n");
  },
};

registerTemplate("booking-customer", Tpl);