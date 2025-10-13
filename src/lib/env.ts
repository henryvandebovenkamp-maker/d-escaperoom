// PATH: src/lib/env.ts
const toBool = (v: string | undefined, d = false) =>
  (v ?? (d ? "1" : "0")) === "1";

export const APP_ORIGIN   = process.env.APP_ORIGIN || "https://d-escaperoom.vercel.app";

export const SMTP_HOST    = process.env.SMTP_HOST || "";
export const SMTP_PORT    = Number(process.env.SMTP_PORT || 465);
export const SMTP_USER    = process.env.SMTP_USER || "";
export const SMTP_PASS    = process.env.SMTP_PASS || "";

export const MAIL_FROM    = process.env.MAIL_FROM || SMTP_USER;
export const MAIL_BCC     = process.env.MAIL_BCC || "";

export const MAIL_DEV_ECHO = toBool(process.env.MAIL_DEV_ECHO); // log compiled mails
export const DISABLE_EMAIL = toBool(process.env.DISABLE_EMAIL); // skip real send

export function assertEmailEnv() {
  if (DISABLE_EMAIL) return; // bij lokaal testen mag SMTP ontbreken
  const missing = [SMTP_HOST && "ok", SMTP_USER && "ok", SMTP_PASS && "ok"].filter(Boolean).length < 3;
  if (missing) {
    throw new Error("SMTP env mist (SMTP_HOST/SMTP_USER/SMTP_PASS). Zet DISABLE_EMAIL=1 voor dry-run.");
  }
}
