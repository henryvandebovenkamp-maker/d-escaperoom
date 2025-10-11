import { register, TemplateDef, layout, formatEUR, formatNLDateTime } from "./base";

const T: TemplateDef<"booking_customer"> = {
  id: "booking_customer",
  subject(v) {
    return `Bevestiging: jouw boeking ${v.bookingId} bij ${v.partnerName}`;
  },
  html(v) {
    const when = formatNLDateTime(v.slotISO);
    const body = `
      <h1 style="margin:0 0 12px 0;">Bedankt voor je boeking!</h1>
      <p>Hi ${v.firstName ?? "avonturier"}, je boeking is bevestigd.</p>

      <table style="margin:16px 0 12px 0">
        <tr><th>Hondenschool</th><td>${v.partnerName}</td></tr>
        <tr><th>Wanneer</th><td>${when}</td></tr>
        <tr><th>Spelers</th><td>${v.players}</td></tr>
        <tr><th>Totaal</th><td>${formatEUR(v.totalCents)}</td></tr>
        <tr><th>Aanbetaling</th><td>${formatEUR(v.depositCents)} (betaald)</td></tr>
        <tr><th>Restbedrag</th><td>${formatEUR(v.restCents)} (betaal je op locatie)</td></tr>
      </table>

      ${v.address ? `<p><strong>Adres:</strong><br>${v.address}</p>` : ""}

      <p style="margin:16px 0 24px 0;"><a class="btn" href="${v.manageUrl}">Boeking beheren</a></p>

      <div class="hr"></div>
      <p class="muted">
        Vragen? Mail ${v.partnerEmail ? `<a href="mailto:${v.partnerEmail}">${v.partnerEmail}</a>` : "de hondenschool"}.
        Vermeld je boekingsnummer: <strong>${v.bookingId}</strong>.
      </p>
    `;
    return layout({
      title: "Boekingsbevestiging",
      preheader: `Je boeking bij ${v.partnerName} is bevestigd`,
      bodyHtml: body,
    });
  },
  text(v) {
    return `Boekingsbevestiging

Boekingsnummer: ${v.bookingId}
Hondenschool: ${v.partnerName}
Wanneer: ${formatNLDateTime(v.slotISO)}
Spelers: ${v.players}
Totaal: ${formatEUR(v.totalCents)}
Aanbetaling: ${formatEUR(v.depositCents)} (betaald)
Restbedrag: ${formatEUR(v.restCents)} (op locatie)

Boeking beheren: ${v.manageUrl}
${v.address ? `Adres: ${v.address}\n` : ""}

Vragen? Mail de hondenschool${v.partnerEmail ? `: ${v.partnerEmail}` : ""}.`;
  },
};
register(T);
