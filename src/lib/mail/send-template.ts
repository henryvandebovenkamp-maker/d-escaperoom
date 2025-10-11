// PATH: src/lib/mail/send-template.ts
import { sendMail } from "@/lib/mail";
import { renderLoginCodeHtml } from "./templates/login-code";

export async function sendTemplateMail(args: {
  to: string;
  templateId: "login_code";
  params: { code: string; expiresMinutes: number };
}) {
  const { to, templateId, params } = args;
  if (templateId !== "login_code") throw new Error(`Unknown templateId: ${templateId}`);

  const html = renderLoginCodeHtml({
    code: params.code,
    expiresMinutes: params.expiresMinutes,
    // Optioneel: zet MAIL_LOGO_URL in .env en geef ’m mee
    logoUrl: process.env.MAIL_LOGO_URL,
  });

  await sendMail({ to, subject: "Je login-code (D-EscapeRoom)", html });
  return { sent: true };
}
