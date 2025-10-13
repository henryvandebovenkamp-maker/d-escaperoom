// PATH: src/lib/mail/templates/base.ts
import { getTransporter, MAIL_FROM, MAIL_BCC, MAIL_DEV_ECHO, DISABLE_EMAIL } from "@/lib/mail/transporter";

/* ===== Types ===== */
export type Locale = "nl" | "en" | "de" | "es";

export type TemplateId =
  | "login-code"
  | "booking-customer"
  | "booking-partner";

export type TemplateVars = {
  "login-code": {
    email: string;
    code: string;
    locale?: Locale;
  };
  "booking-customer": {
    customerName: string;
    partnerName: string;
    partnerAddress?: string;
    slotISO: string;
    players: number;
    bookingId: string;
    totalCents: number;
    depositCents: number;
    restCents: number;
    manageUrl: string;
    locale?: Locale;
  };
  "booking-partner": {
    partnerName: string;
    partnerEmail?: string;
    customerName: string;
    slotISO: string;
    players: number;
    bookingId: string;
    depositCents: number;
    locale?: Locale;
  };
};

export type TemplateRenderer<T extends TemplateId = TemplateId> = {
  subject: (vars: TemplateVars[T]) => string;
  html:    (vars: TemplateVars[T]) => string;
  text?:   (vars: TemplateVars[T]) => string;
  from?:   string;
};

const registry = new Map<TemplateId, TemplateRenderer<any>>();

/* ===== Helpers voor templates ===== */
export function eur(cents: number, locale: string = "nl-NL") {
  return (Number(cents || 0) / 100).toLocaleString(locale, { style: "currency", currency: "EUR" });
}
export function nlDateTime(iso: string, locale: string = "nl-NL") {
  const d = new Date(iso);
  return d.toLocaleString(locale, {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
  });
}

/* ===== Registry API ===== */
export function registerTemplate<T extends TemplateId>(id: T, tpl: TemplateRenderer<T>) {
  registry.set(id, tpl);
}

export function getTemplate<T extends TemplateId>(id: T): TemplateRenderer<T> {
  const t = registry.get(id);
  if (!t) throw new Error(`Mail template niet geregistreerd: ${id}`);
  return t as TemplateRenderer<T>;
}

/* ===== High-level send (enkel via templates!) ===== */
export async function sendTemplateMail<T extends TemplateId>(args: {
  to: string;
  template: T;
  vars: TemplateVars[T];
  from?: string;
  bcc?: string;
  replyTo?: string;
}) {
  // forceer side-effect registratie
  await import("./register");

  const tpl = getTemplate(args.template);
  const subject = tpl.subject(args.vars);
  const html    = tpl.html(args.vars);
  const text    = tpl.text?.(args.vars);

  if (MAIL_DEV_ECHO) {
    console.log("[MAIL:compiled]", { to: args.to, subject, preview: html.slice(0, 180) + "…" });
  }
  if (DISABLE_EMAIL) return { ok: true, skipped: "DISABLE_EMAIL=1" as const };

  const transporter = getTransporter();
  await transporter.sendMail({
    to: args.to,
    from: args.from || tpl.from || MAIL_FROM,
    bcc: args.bcc || MAIL_BCC || undefined,
    replyTo: args.replyTo,
    subject,
    html,
    text,
  });
  return { ok: true };
}
