// PATH: src/lib/mail/templates/loginCode.ts
import { stripHtml } from "../format";
import { wrap } from "./_base";

export function loginCodeTemplate(email: string, code: string, expiresAtISO: string) {
  const expireTime = new Date(expiresAtISO).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = wrap(
    "Je inlogcode voor D-EscapeRoom",
    `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-family:system-ui,-apple-system,sans-serif;color:#1c1917;background:#fafaf9;padding:24px;border-radius:12px">
        <tr>
          <td align="center" style="padding:8px 0 16px 0">
            <img src="https://d-escaperoom.vercel.app/images/header-foto.png" alt="D-EscapeRoom" width="100%" style="max-width:560px;border-radius:8px"/>
          </td>
        </tr>
        <tr>
          <td align="center" style="font-size:20px;font-weight:700;color:#1c1917;padding-top:8px">
            Welkom terug bij D-EscapeRoom 🐾
          </td>
        </tr>
        <tr>
          <td style="font-size:16px;line-height:1.6;padding:16px 0 4px 0;text-align:center">
            Gebruik onderstaande code om veilig in te loggen.
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:12px 0 20px 0">
            <div style="display:inline-block;font-size:36px;font-weight:800;letter-spacing:.12em;background:#fdf2f8;color:#9d174d;padding:16px 28px;border-radius:10px">
              ${code}
            </div>
          </td>
        </tr>
        <tr>
          <td style="font-size:15px;text-align:center;line-height:1.6;color:#444">
            Deze code is gekoppeld aan <strong>${email}</strong><br/>
            en verloopt om <strong>${expireTime}</strong>.
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-top:20px;font-size:15px;line-height:1.6;color:#444">
            Vul de code in op de pagina waar je om een inlogcode hebt gevraagd.<br/>
            Heb je dit verzoek niet zelf gedaan? Negeer dan deze e-mail.
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:28px">
            <a href="https://d-escaperoom.vercel.app/login" style="display:inline-block;background:#9d174d;color:#fff;text-decoration:none;font-weight:600;padding:12px 28px;border-radius:8px">
              Ga naar de inlogpagina
            </a>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-top:32px;font-size:13px;color:#78716c">
            D-EscapeRoom — The Missing Snack<br/>
            © ${new Date().getFullYear()} D-EscapeRoom. Alle rechten voorbehouden.
          </td>
        </tr>
      </table>
    `
  );

  return {
    subject: "Je D-EscapeRoom inlogcode",
    html,
    text: stripHtml(html),
  };
}
