// PATH: src/lib/mail.ts
import nodemailer from "nodemailer";

/* ================= Mail transporter ================= */
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: (process.env.SMTP_SECURE ?? "false") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/* =============== Core send helper =============== */
export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}) {
  const from = input.from ?? process.env.MAIL_FROM ?? process.env.SMTP_USER!;
  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text ?? stripHtml(input.html),
  });
  return info.messageId;
}

/* =============== Compatibility templates ===============
   Sommige routes importeren onderstaande namen.
   We bieden minimal viable templates terug.
======================================================== */

type Money = number | null | undefined;
const euro = (cents: Money) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" })
    .format(((cents ?? 0) as number) / 100);

/** Voor klanten: boekingsbevestiging */
export function bookingCustomerTemplate(input: {
  customerName?: string | null;
  partnerName?: string | null;
  slotDate?: string | Date | null;
  totalCents?: Money;
  depositCents?: Money;
  restCents?: Money;
}) {
  const subject = `Boekingsbevestiging – D-EscapeRoom`;
  const when =
    input.slotDate instanceof Date
      ? input.slotDate.toLocaleString("nl-NL")
      : (input.slotDate ?? "—");

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <h2>Bevestiging van je boeking</h2>
      <p>Bedankt${input.customerName ? `, ${input.customerName}` : ""}! Je boeking is geregistreerd bij <strong>${input.partnerName ?? "onze partner"}</strong>.</p>
      <ul>
        <li><strong>Datum & tijd:</strong> ${when}</li>
        <li><strong>Totaal:</strong> ${euro(input.totalCents)}</li>
        <li><strong>Aanbetaling (betaald):</strong> ${euro(input.depositCents)}</li>
        <li><strong>Restbedrag op locatie:</strong> ${euro(input.restCents)}</li>
      </ul>
      <p>Tot snel bij D-EscapeRoom – The Missing Snack!</p>
    </div>`;
  const text =
    `Bevestiging boeking.\n` +
    `Partner: ${input.partnerName ?? "-"}\n` +
    `Wanneer: ${when}\n` +
    `Totaal: ${euro(input.totalCents)} | Aanbetaling: ${euro(input.depositCents)} | Rest: ${euro(input.restCents)}\n`;
  return { subject, html, text };
}

/** Voor partner: nieuwe boeking */
export function bookingPartnerTemplate(input: {
  customerName?: string | null;
  partnerName?: string | null;
  slotDate?: string | Date | null;
  players?: number | null;
  totalCents?: Money;
  depositCents?: Money;
}) {
  const subject = `Nieuwe boeking – ${input.partnerName ?? "Partner"}`;
  const when =
    input.slotDate instanceof Date
      ? input.slotDate.toLocaleString("nl-NL")
      : (input.slotDate ?? "—");
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <h2>Nieuwe boeking</h2>
      <ul>
        <li><strong>Klant:</strong> ${input.customerName ?? "-"}</li>
        <li><strong>Wanneer:</strong> ${when}</li>
        <li><strong>Spelers:</strong> ${input.players ?? "-"}</li>
        <li><strong>Totaal:</strong> ${euro(input.totalCents)}</li>
        <li><strong>Aanbetaling:</strong> ${euro(input.depositCents)}</li>
      </ul>
    </div>`;
  const text =
    `Nieuwe boeking.\n` +
    `Klant: ${input.customerName ?? "-"} | Wanneer: ${when} | Spelers: ${input.players ?? "-"}\n` +
    `Totaal: ${euro(input.totalCents)} | Aanbetaling: ${euro(input.depositCents)}\n`;
  return { subject, html, text };
}

/** Login code (magic code) */
export function loginCodeTemplate(code: string) {
  const subject = "Je inlogcode voor D-EscapeRoom";
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <h2>Je inlogcode</h2>
      <p>Gebruik de onderstaande code. De code is <strong>10 minuten</strong> geldig.</p>
      <div style="font-size:28px;letter-spacing:4px;font-weight:700;
           padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;
           display:inline-block;margin:12px 0">${code}</div>
      <p>Heb jij dit niet aangevraagd? Negeer dan deze e-mail.</p>
    </div>`;
  const text = `Je inlogcode: ${code} (10 min geldig)`;
  return { subject, html, text };
}

/* =============== SMTP verify (compat) =============== */
export async function verifySmtp() {
  try {
    const ok = await transporter.verify();
    return { ok: !!ok };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}
