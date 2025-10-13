// PATH: src/lib/env.ts
export const APP_ORIGIN =
  process.env.APP_ORIGIN ||
  process.env.NEXT_PUBLIC_APP_ORIGIN ||
  `https://${process.env.VERCEL_URL || "d-escaperoom.vercel.app"}`;

export const SMTP_HOST = must("SMTP_HOST");
export const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
export const SMTP_SECURE = (process.env.SMTP_SECURE ?? "1") === "1";
export const SMTP_USER = must("SMTP_USER");
export const SMTP_PASS = must("SMTP_PASS");

export const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER;
export const MAIL_BCC = process.env.MAIL_BCC || "";
export const MAIL_DEV_ECHO = (process.env.MAIL_DEV_ECHO ?? "0") === "1";
export const DISABLE_EMAIL = (process.env.DISABLE_EMAIL ?? "0") === "1";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}
