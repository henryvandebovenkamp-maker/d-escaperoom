// PATH: src/lib/env.ts
const required = ["APP_URL", "MOLLIE_API_KEY", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] as const;
for (const k of required) {
  if (!process.env[k]) {
    // Niet crashen in dev; waarschuwing is genoeg
    console.warn(`[env] Missing ${k}. Some features may not work.`);
  }
}
export const APP_URL = process.env.APP_URL!;
export const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY!;
