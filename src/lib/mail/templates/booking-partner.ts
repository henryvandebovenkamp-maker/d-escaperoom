import { register, TemplateDef, layout, formatEUR, formatNLDateTime } from "./base";

const T: TemplateDef<"booking_partner"> = {
  id: "booking_partner",
  subject(v) {
    return `Nieuwe boeking ${v.bookingId} — ${v.players} spelers (${formatEUR(v.totalCents)})`;
  },
  html(v) {
    const when = formatNLDateTime(v.slotISO);
    const body = `
      <h1 style="margin:0 0 12px 0;">Nieuwe boeking</h1>
      <table style="margin:16px 0 12px 0">
        <tr><th>Boekingsnummer</th><td>${v.bookingId}</td></tr>
        <tr><th>Klant</th><td>${v.customerName ?? "Onbekend"} &lt;${v.customerEmail}&gt;</td></tr>
        <tr><th>Wanneer</th><td>${when}</td></tr>
        <tr><th>Spelers</th><td>${v.players}</td></tr>
        <tr><th>Totaal</th><td>${formatEUR(v.totalCents)}</td></tr>
        <tr><th>Aanbetaling</th><td>${formatEUR(v.depositCents)} (ontvangen)</td></tr>
        <tr><th>Restbedrag</th><td>${formatEUR(v.restCents)} (te innen op locatie)</td></tr>
      </table>

      <p style="margin:16px 0 24px 0;"><a class="btn" href="${v.partnerDashboardUrl}">Open partnerdashboard</a></p>

      <div class="hr"></div>
      <p class="muted">Verwijs de klant naar het boekingsnummer <strong>${v.bookingId}</strong> bij vragen.</p>
    `;
    return layout({
      title: "Nieuwe boeking",
      preheader: `Nieuwe boeking voor ${when}`,
      bodyHtml: body,
    });
  },
  text(v) {
    return `Nieuwe boeking

Boekingsnummer: ${v.bookingId}
Klant: ${v.customerName ?? "Onbekend"} <${v.customerEmail}>
Wanneer: ${formatNLDateTime(v.slotISO)}
Spelers: ${v.players}
Totaal: ${formatEUR(v.totalCents)}
Aanbetaling: ${formatEUR(v.depositCents)} (ontvangen)
Restbedrag: ${formatEUR(v.restCents)} (te innen op locatie)

Partnerdashboard: ${v.partnerDashboardUrl}`;
  },
};
register(T);
