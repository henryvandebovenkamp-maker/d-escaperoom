// PATH: src/lib/mail/templates/contact.ts
import { registerTemplate, type TemplateVars } from "./base";
import { wrapEmail } from "./_layout";
import { APP_ORIGIN } from "@/lib/env";

/** ========= 1) Interne notificatie: naar jullie inbox ========= */
const ContactNotifyTpl = {
  from: '"D-EscapeRoom" <no-reply@d-escaperoom.com>',

  subject: (v: TemplateVars["contact-notify"]) =>
    `Nieuw contactformulier – ${v.topic}`,

  html: (v: TemplateVars["contact-notify"]) => {
    const body = `
      <p style="margin:0 0 8px 0">Er is een nieuw bericht via het contactformulier.</p>

      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;border-collapse:collapse;margin:8px 0 12px 0">
        <tr><td style="padding:6px 0;width:160px;color:#666">Naam</td><td>${v.fullName}</td></tr>
        <tr><td style="padding:6px 0;color:#666">E-mail</td><td>${v.email}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Telefoon</td><td>${v.phone || "-"}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Terugbelverzoek</td><td>${v.callOk ? "Ja, graag" : "Niet nodig"}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Onderwerp</td><td><strong>${v.topic}</strong></td></tr>
      </table>

      <p style="margin:12px 0 6px 0;color:#374151">Bericht:</p>
      <div style="white-space:pre-wrap;border:1px dashed #e7e5e4;border-radius:10px;padding:12px 14px;color:#111">
        ${v.message}
      </div>

      <p style="margin:16px 0 0 0;color:#6b7280;font-size:13px">
        Beheer: ${APP_ORIGIN}/partner
      </p>
    `;
    return wrapEmail({
      title: "Nieuw contactformulier",
      preheader: `Onderwerp: ${v.topic}`,
      bodyHTML: body,
      brand: "partner", // zwarte accenten
    });
  },

  text: (v: TemplateVars["contact-notify"]) =>
    [
      `Nieuw contactformulier`,
      `Onderwerp: ${v.topic}`,
      ``,
      `Naam: ${v.fullName}`,
      `E-mail: ${v.email}`,
      `Telefoon: ${v.phone || "-"}`,
      `Terugbelverzoek: ${v.callOk ? "Ja, graag" : "Niet nodig"}`,
      ``,
      `Bericht:`,
      v.message,
      ``,
      `Beheer: ${APP_ORIGIN}/partner`,
    ].join("\n"),
};

registerTemplate("contact-notify", ContactNotifyTpl);

/** ========= 2) Ontvangstbevestiging: naar inzender ========= */
const ContactReceiptTpl = {
  from: '"D-EscapeRoom" <no-reply@d-escaperoom.com>',

  subject: (_v: TemplateVars["contact-receipt"]) => `We hebben je bericht ontvangen`,

  html: (v: TemplateVars["contact-receipt"]) => {
    const body = `
      <p style="margin:0 0 8px 0">Hoi ${v.fullName},</p>
      <p style="margin:0 0 10px 0">Bedankt voor je bericht. We reageren doorgaans binnen één werkdag.</p>

      <p style="margin:12px 0 6px 0;color:#374151">Je bericht:</p>
      <div style="white-space:pre-wrap;border:1px dashed #e7e5e4;border-radius:10px;padding:12px 14px;color:#111">
        ${v.message}
      </div>

      <p style="margin:16px 0 0 0;color:#6b7280;font-size:13px">
        Wil je alvast meer weten of direct boeken? Bezoek ${APP_ORIGIN}
      </p>
    `;
    return wrapEmail({
      title: "Bedankt voor je bericht",
      preheader: "We nemen snel contact met je op",
      bodyHTML: body,
      brand: "consumer", // roze accenten
      cta: { label: "Bezoek website", url: APP_ORIGIN },
    });
  },

  text: (v: TemplateVars["contact-receipt"]) =>
    [
      `Bedankt voor je bericht`,
      ``,
      `Hoi ${v.fullName}, we reageren doorgaans binnen één werkdag.`,
      ``,
      `Je bericht:`,
      v.message,
      ``,
      `Meer info: ${APP_ORIGIN}`,
    ].join("\n"),
};

registerTemplate("contact-receipt", ContactReceiptTpl);
