// PATH: src/lib/mail/templates/loginCode.ts
import { stripHtml } from "../format";
import { wrap } from "./_base";

export function loginCodeTemplate(email: string, code: string, expiresAtISO: string) {
  const html = wrap(
    "Je login code",
    `
      <p>We hebben een login code voor je klaargezet.</p>
      <p style="font-size:28px;font-weight:800;letter-spacing:.08em">${code}</p>
      <p>Deze code is gekoppeld aan <strong>${email}</strong> en verloopt om <strong>${new Date(expiresAtISO).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</strong>.</p>
      <p>Vul de code in op de pagina waar je om een code hebt gevraagd.</p>
    `
  );
  return {
    subject: "Je D-EscapeRoom inlogcode",
    html,
    text: stripHtml(html),
  };
}
