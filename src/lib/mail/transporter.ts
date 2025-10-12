import nodemailer from "nodemailer";
import { APP_ORIGIN } from "@/lib/env";

export { APP_ORIGIN }; // her-export voor bestaande imports elders

export const MAIL_FROM =
  process.env.MAIL_FROM ?? process.env.SMTP_USER ?? (() => { throw new Error("MAIL_FROM/SMTP_USER ontbreekt"); })();

export const MAIL_BCC = process.env.MAIL_BCC || "";                // optioneel
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

// (optioneel) in dev/vercel preview even controleren of SMTP connectie oké is
if (process.env.NODE_ENV !== "production") {
  transporter.verify().then(
    () => console.log("[mail] SMTP OK"),
    (err) => console.warn("[mail] SMTP verify failed:", err?.message ?? err)
  );
}
