// PATH: src/lib/mail/transporter.ts
import nodemailer from "nodemailer";
import { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } from "@/lib/env";

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

export async function verifyTransporter() {
  try {
    await transporter.verify();
    return true;
  } catch (e) {
    console.error("[mail] transporter.verify() failed:", e);
    return false;
  }
}
