// PATH: src/lib/mail/transporter.ts
import nodemailer from "nodemailer";
import {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
  MAIL_FROM, MAIL_BCC, MAIL_DEV_ECHO, DISABLE_EMAIL, assertEmailEnv
} from "@/lib/env";

type T = nodemailer.Transporter;

let _t: T | null = null;

export function getTransporter(): T {
  if (_t) return _t;
  assertEmailEnv();
  _t = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // TransIP vaak 465/SSL
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _t;
}

export { MAIL_FROM, MAIL_BCC, MAIL_DEV_ECHO, DISABLE_EMAIL };
