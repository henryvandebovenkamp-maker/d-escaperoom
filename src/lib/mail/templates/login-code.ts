// PATH: src/lib/mail/templates/login-code.ts
import { z } from "zod";
import { registerTemplate, type TemplateDef, type Locale } from "./base";

const Vars = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
  magicUrl: z.string().url().optional(), // optioneel: 1-click link
});

const subjectBy = (loc: Locale, code: string) =>
  loc === "nl" ? `Je inlogcode: ${code}`
: loc === "de" ? `Dein Login-Code: ${code}`
: loc === "es" ? `Tu código de acceso: ${code}`
:               `Your login code: ${code}`;

const T: TemplateDef<typeof Vars> = {
  id: "login_code",
  varsSchema: Vars,
  subject: (loc, v) => subjectBy(loc, v.code),
  renderHtml(loc, v, h) {
    const body = `
      <p>Gebruik de volgende code om in te loggen:</p>
      <p style="font-size:28px;letter-spacing:4px;"><strong>${v.code}</strong></p>
      ${v.magicUrl ? `<p><a class="btn" href="${v.magicUrl}">Inloggen met 1 klik</a></p>` : ""}
      <p class="muted">Deze code verloopt na 10 minuten.</p>
    `;
    return h.renderBase({ title: "Inloggen", lead: v.email, body, locale: loc });
  },
};

registerTemplate(T);
