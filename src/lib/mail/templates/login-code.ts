// PATH: src/lib/mail/templates/login-code.ts
import { registerTemplate, type TemplateVars } from "./base";

const LoginTpl = {
  subject: (v: TemplateVars["login-code"]) => `Je inlogcode: ${v.code}`,
  html: (v: TemplateVars["login-code"]) => `
    <div style="font-family:ui-sans-serif;line-height:1.5;color:#0c0c0c">
      <h1 style="margin:0 0 12px 0;font-size:20px;">Inloggen bij D-EscapeRoom</h1>
      <p>Gebruik onderstaande code om in te loggen:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${v.code}</p>
      <p style="color:#555;">Deze code vervalt na 10 minuten.</p>
    </div>
  `,
  text: (v: TemplateVars["login-code"]) =>
    `Inloggen bij D-EscapeRoom\n\nCode: ${v.code}\n(Verloopt na 10 minuten)`,
};
registerTemplate("login-code", LoginTpl);
