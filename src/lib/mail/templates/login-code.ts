import { register, TemplateDef, layout } from "./base";

const T: TemplateDef<"login_code"> = {
  id: "login_code",
  subject(v) {
    return "Je inlogcode voor D-EscapeRoom";
  },
  html(v) {
    const body = `
      <h1 style="margin:0 0 12px 0;">Inloggen</h1>
      <p class="muted">Gebruik onderstaande code om in te loggen. Deze code verloopt na 10 minuten.</p>
      <p><span class="code">${v.code}</span></p>
      <p style="margin:16px 0 24px 0;"><a class="btn" href="${v.loginUrl}">Inloggen</a></p>
      <div class="hr"></div>
      <p class="muted">Werkt de knop niet? Ga naar <a href="${v.loginUrl}">${v.loginUrl}</a> en voer de code handmatig in.</p>
    `;
    return layout({ title: "Inloggen", preheader: "Je inlogcode is klaar", bodyHtml: body });
  },
  text(v) {
    return `Inloggen bij D-EscapeRoom

Je inlogcode: ${v.code}
Inloggen: ${v.loginUrl}

Let op: de code verloopt na 10 minuten.`;
  },
};
register(T);
