// PATH: src/lib/mail.ts
import { APP_ORIGIN } from "./env";

// Optioneel: echte e-mail via SMTP (TransIP)
// Zet env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
import nodemailer from "nodemailer";

type SendArgs = {
  to: string;
  template: string;              // bv. "login_code"
  vars?: Record<string, any>;    // bv. { code, loginUrl }
  subject?: string;              // optioneel override
};

function render(args: SendArgs) {
  const t = args.template;
  const v = args.vars || {};
  if (t === "login_code") {
    const s = args.subject ?? "Je inlogcode";
    const html = `
      <div style="font-family:ui-sans-serif,system-ui,Segoe UI,Roboto">
        <h1 style="margin:0 0 12px 0;">Je inlogcode</h1>
        <p style="margin:0 0 8px 0;">Gebruik deze code om in te loggen:</p>
        <p style="font: 700 22px/1 ui-monospace,Menlo,Consolas,monospace; letter-spacing:4px; background:#f4f4f5; display:inline-block; padding:8px 12px; border-radius:10px;">
          ${String(v.code ?? "").replace(/</g,"&lt;")}
        </p>
        ${v.loginUrl ? `<p style="margin:12px 0 0 0;"><a href="${v.loginUrl}">Inloggen</a></p>` : ""}
      </div>`;
    const text = `Je inlogcode: ${v.code}${v.loginUrl ? `\nInloggen: ${v.loginUrl}` : ""}`;
    return { subject: s, html, text };
  }

  // Fallback generiek
  const s = args.subject ?? `Bericht: ${t}`;
  const html = `<pre style="font-family:ui-monospace,Menlo,Consolas,monospace">${JSON.stringify(v, null, 2)}</pre>`;
  const text = JSON.stringify(v, null, 2);
  return { subject: s, html, text };
}

export async function sendTemplateMail(args: SendArgs) {
  // Als SMTP vars ontbreken: in dev gewoon loggen (geen crash)
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM || "no-reply@localhost";
  if (!host) {
    const r = render(args);
    console.log("[dev-mail] would send", { to: args.to, subject: r.subject, APP_ORIGIN, preview: r.text });
    return { ok: true as const, dev: true };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const transporter = nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  const r = render(args);
  const info = await transporter.sendMail({
    from, to: args.to, subject: r.subject, html: r.html, text: r.text,
  });
  return { ok: true as const, info };
}

// Re-export zodat imports blijven werken
export { APP_ORIGIN } from "./env";
