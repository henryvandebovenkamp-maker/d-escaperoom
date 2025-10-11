import nodemailer from "nodemailer";

export const MAIL_FROM = process.env.MAIL_FROM ?? process.env.SMTP_USER!;
export const MAIL_BCC = process.env.MAIL_BCC || ""; // optioneel
export const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";
export const MAIL_DEV_ECHO = (process.env.MAIL_DEV_ECHO ?? "0") === "1"; // echo in logs
export const DISABLE_EMAIL = (process.env.DISABLE_EMAIL ?? "0") === "1"; // force skip

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: (process.env.SMTP_SECURE ?? "false") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
