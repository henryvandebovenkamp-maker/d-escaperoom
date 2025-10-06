// PATH: src/lib/mail/verify.ts
import { transporter } from "./transporter";

/** Checkt verbinding en authenticatie met je SMTP-server. */
export async function verifySmtp() {
  try {
    await transporter.verify();
    return { ok: true as const };
  } catch (err: any) {
    return { ok: false as const, error: err?.message ?? String(err) };
  }
}
