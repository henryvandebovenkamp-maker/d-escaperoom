// PATH: src/lib/mail.ts
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: (process.env.SMTP_SECURE ?? "false") === "true", // 587 -> false, 465 -> true
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// 1x verify per processtart (fout = meteen zichtbaar in logs)
let verified = false;
async function verifyOnce() {
  if (verified) return;
  try {
    await transporter.verify();
    verified = true;
    console.log("[mail] transporter.verify OK", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
      from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    });
  } catch (e) {
    console.error("[mail] transporter.verify FAIL:", e);
  }
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function sendMail(input: {
  to: string; subject: string; html: string; text?: string; from?: string;
}) {
  await verifyOnce();

  const from = input.from ?? process.env.MAIL_FROM ?? process.env.SMTP_USER!;
  const text = input.text ?? stripHtml(input.html);

  const info = await transporter.sendMail({
    from, to: input.to, subject: input.subject, html: input.html, text,
  });

  console.log(`[mail] sent → ${input.to}: ${info.messageId}`);
  return info;
}

// Re-export voor routes die sendTemplateMail verwachten
export { sendTemplateMail } from "./mail/send-template";
