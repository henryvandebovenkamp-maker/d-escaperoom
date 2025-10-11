// PATH: src/lib/mail/templates/login-code.ts
import { renderBaseHtml } from "./base";

export function renderLoginCodeHtml(opts: {
  code: string;
  expiresMinutes: number;
  logoUrl?: string;
}) {
  const accent = "#ec4899"; // roze accent van je site

  const body = `
    <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:#111827;">
      Inloggen bijD-EscapeRoom
    </h1>

    <p style="margin:0 0 18px;color:#44403c;">
      Je staat op het punt om in te loggen in jouw account van <strong>D-EscapeRoom</strong>.
      Gebruik onderstaande code om je login te bevestigen.
    </p>

    <div style="margin:22px 0;text-align:center;">
      <div style="
        display:inline-block;
        background:${accent};
        color:white;
        border-radius:12px;
        padding:18px 28px;
        font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,Monaco,'Courier New',monospace;
        font-size:32px;
        letter-spacing:6px;
      ">
        ${opts.code}
      </div>
    </div>

    <p style="margin:0 0 16px;color:#44403c;">
      Deze code is <strong>${opts.expiresMinutes} minuten</strong> geldig.
      Vul hem in op het inlogscherm om verder te gaan naar jouw partner- of beheeromgeving.
    </p>

    <p style="margin:0 0 20px;color:#78716c;font-size:15px;">
      Heb jij deze login niet aangevraagd? Geen zorgen — je kunt dit bericht gerust negeren.
      Er wordt niets gewijzigd zonder dat je zelf de code invoert.
    </p>

    <hr style="margin:28px 0 20px;border:none;border-top:1px solid #e5e7eb;"/>

    <div style="margin-top:8px;">
      <p style="margin:0 0 4px;font-size:15px;font-weight:600;">Met vriendelijke groet,</p>
      <p style="margin:0 0 6px;font-size:15px;">Team D-EscapeRoom</p>
      <p style="margin:0;font-size:13px;color:#78716c;">
        <a href="https://d-escaperoom.com" style="color:${accent};text-decoration:none;">www.d-escaperoom.nl</a> ·
        <a href="mailto:info@d-escaperoom.com" style="color:${accent};text-decoration:none;">info@d-escaperoom.com</a><br/>
        Lakerveld&nbsp;84, 4128&nbsp;LK&nbsp;Lexmond
      </p>
    </div>
  `;

  return renderBaseHtml({
    title: "Inloggen bij D-EscapeRoom",
    preheader: `Je login-code is ${opts.code}`,
    body,
    logoUrl: opts.logoUrl,
  });
}
