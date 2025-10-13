// PATH: src/lib/mail/templates/booking-customer-v2.ts
import { register, TemplateDef, layout, formatEUR, formatNLDateTime } from "./base";

const T_V2: TemplateDef<"booking_customer_v2"> = {
  id: "booking_customer_v2",
  subject(v) {
    // marker om zeker te weten dat v2 live is (later weghalen)
    return `Bevestiging: jouw boeking ${v.bookingId} bij ${v.partnerName} • v2`;
  },
  html(v) {
    const when = formatNLDateTime(v.slotISO);
    const dog = v.dogName?.trim() ? v.dogName : "je hond";
    const addressBlock = v.address ? `<p><strong>Adres</strong><br>${v.address}</p>` : "";

    const mapsUrl =
      v.googleMapsUrl ||
      (v.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            v.address.replace(/\n/g, " ")
          )}`
        : "");
    const mapsLink = mapsUrl
      ? `<p style="margin:8px 0 0 0;">
           <a href="${mapsUrl}" style="text-decoration:underline;">Open in Google Maps</a>
         </p>`
      : "";

    const body = `
      <h1 style="margin:0 0 12px 0;">Yes! Je boeking staat vast 🎉</h1>
      <p>Hi ${v.firstName ?? "avonturier"}, te gek dat je hebt geboekt bij <strong>${v.partnerName}</strong>!
      We kijken ernaar uit om samen met <strong>${dog}</strong> op avontuur te gaan.</p>

      <table style="margin:16px 0 12px 0">
        <tr><th style="text-align:left;padding-right:12px;">Hondenschool</th><td>${v.partnerName}</td></tr>
        <tr><th style="text-align:left;padding-right:12px;">Wanneer</th><td>${when}</td></tr>
        <tr><th style="text-align:left;padding-right:12px;">Spelers</th><td>${v.players}</td></tr>
        <tr><th style="text-align:left;padding-right:12px;">Totaal</th><td>${formatEUR(v.totalCents)}</td></tr>
        <tr><th style="text-align:left;padding-right:12px;">Aanbetaling</th><td>${formatEUR(v.depositCents)} (betaald)</td></tr>
        <tr><th style="text-align:left;padding-right:12px;">Restbedrag</th><td>${formatEUR(v.restCents)} (betaal je op locatie)</td></tr>
      </table>

      ${addressBlock}
      ${mapsLink}

      <div class="hr" style="margin-top:20px;"></div>
      <p class="muted">
        Vragen? Mail ${v.partnerEmail ? `<a href="mailto:${v.partnerEmail}">${v.partnerEmail}</a>` : "de hondenschool"}.
        Vermeld je boekingsnummer: <strong>${v.bookingId}</strong>.
      </p>

      <p style="margin-top:8px;">Tot snel en veel speelplezier! 🐾</p>
    `;

    return layout({
      title: "Boekingsbevestiging",
      preheader: `Je boeking bij ${v.partnerName} is bevestigd — veel plezier met ${dog}!`,
      bodyHtml: body,
    });
  },
  text(v) {
    const when = formatNLDateTime(v.slotISO);
    const dog = v.dogName?.trim() ? v.dogName : "je hond";
    const mapsUrl =
      v.googleMapsUrl ||
      (v.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            v.address.replace(/\n/g, " ")
          )}`
        : "");

    return `Yes! Je boeking staat vast 🎉

Boekingsnummer: ${v.bookingId}
Hondenschool: ${v.partnerName}
Wanneer: ${when}
Spelers: ${v.players}
Totaal: ${formatEUR(v.totalCents)}
Aanbetaling: ${formatEUR(v.depositCents)} (betaald)
Restbedrag: ${formatEUR(v.restCents)} (op locatie)
${v.address ? `\nAdres:\n${v.address}\n` : ""}${mapsUrl ? `Google Maps: ${mapsUrl}\n` : ""}

Vragen? Mail de hondenschool${v.partnerEmail ? `: ${v.partnerEmail}` : ""}.

Tot snel en veel speelplezier met ${dog}! 🐾`;
  },
};

register(T_V2);

// 🔁 Alias-registratie: laat ook de oude id naar deze v2 wijzen
register({ ...(T_V2 as any), id: "booking_customer" } as unknown as TemplateDef<"booking_customer">);
