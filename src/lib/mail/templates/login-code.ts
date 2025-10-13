// PATH: src/lib/mail/templates/login-code.ts
import { registerTemplate, type TemplateVars } from "./base";
import { wrapEmail } from "./_layout";
import { APP_ORIGIN } from "@/lib/env";

const LoginTpl = {
  // ✅ Consistente afzender
  from: '"D-EscapeRoom" <no-reply@d-escaperoom.nl>',

  subject: (v: TemplateVars["login-code"]) => `Je inlogcode: ${v.code}`,

  html: (v: TemplateVars["login-code"]) => {
    const loginUrl = `${APP_ORIGIN}/login?email=${encodeURIComponent(v.email)}`;
    const body = `
      <p style="margin:0 0 12px 0">Hoi${v.email ? ` ${v.email}` : ""},</p>
      <p style="margin:0 0 8px 0">Gebruik onderstaande <strong>6-cijferige code</strong> om in te loggen:</p>

      <div style="margin:10px 0 14px 0;padding:12px 16px;border:1px dashed #e7e5e4;border-radius:10px;
                  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
                  font-size:26px; font-weight:800; letter-spacing:6px; text-align:center;">
        ${v.code}
      </div>

      <p style="margin:0 0 12px 0;color:#374151">
        Deze code is <strong>10 minuten</strong> geldig. Werk je liever via een link? Open dan de inlogpagina en vul de code in.
      </p>

      <p style="margin:12px 0 0 0;color:#6b7280;font-size:13px;line-height:1.6">
        Niet jij om een code gevraagd? Negeer dan deze e-mail.
      </p>
    `;

    return wrapEmail({
      title: "Inloggen bij D-EscapeRoom",
      preheader: `Je inlogcode is ${v.code} (10 min geldig)`,
      bodyHTML: body,
      cta: { label: "Open inlogpagina", url: loginUrl },
      brand: "partner", // zwart-accent voor partner/admin flows
    });
  },

  text: (v: TemplateVars["login-code"]) =>
    [
      `Inloggen bij D-EscapeRoom`,
      ``,
      `Je inlogcode: ${v.code}`,
      `Geldig: 10 minuten`,
      ``,
      `Open inlogpagina: ${APP_ORIGIN}/login${v.email ? `?email=${encodeURIComponent(v.email)}` : ""}`,
      ``,
      `Niet jij? Negeer deze e-mail.`,
    ].join("\n"),
};

registerTemplate("login-code", LoginTpl);
