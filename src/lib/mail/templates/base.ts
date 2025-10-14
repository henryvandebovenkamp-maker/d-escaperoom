// PATH: src/lib/mail/templates/base.ts
import { getTransporter, MAIL_FROM, MAIL_BCC, MAIL_DEV_ECHO, DISABLE_EMAIL } from "@/lib/mail/transporter";

/* ===== Types ===== */
export type Locale = "nl" | "en" | "de" | "es";

/** Voeg nieuwe template-ids toe maar behoud bestaande */
export type TemplateId =
  | "login-code"
  | "booking-customer"
  | "booking-partner"
  | "contact-notify"
  | "contact-receipt";

/** Vars per template-id — bestaande velden ongewijzigd gelaten, contact-varianten toegevoegd */
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
    restCents: number;
    locale?: Locale;
  };

  /** ⬇️ nieuw: interne notificatie naar jullie inbox */
  "contact-notify": {
    fullName: string;
    email: string;
    phone?: string;
    topic: string;
    message: string;
    callOk: boolean;
    locale?: Locale;
  };

  /** ⬇️ nieuw: ontvangstbevestiging naar inzender */
  "contact-receipt": {
    fullName: string;
    email: string;
    topic: string;
    message: string;
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
/** Optie 1 — object-vorm (bestaande stijl) */
export type TemplateSendArgs<T extends TemplateId = TemplateId> = {
  to: string;
  template: T;
  vars: TemplateVars[T];
  from?: string;
  bcc?: string;
  replyTo?: string;
};

/** Optie 2 — korte vorm (nieuw): sendTemplateMail("id", vars, { to, ... }) */
export type TemplateSendOverrides = {
  to: string;
  from?: string;
  bcc?: string;
  replyTo?: string;
};

/* Overloads voor beide stijlen */
export async function sendTemplateMail<T extends TemplateId>(
  args: TemplateSendArgs<T>
): Promise<{ ok: true } | { ok: true; skipped: "DISABLE_EMAIL=1" }>;
export async function sendTemplateMail<T extends TemplateId>(
  template: T,
  vars: TemplateVars[T],
  overrides: TemplateSendOverrides
): Promise<{ ok: true } | { ok: true; skipped: "DISABLE_EMAIL=1" }>;

/* Implementatie */
export async function sendTemplateMail<T extends TemplateId>(
  a: TemplateSendArgs<T> | T,
  b?: TemplateVars[T],
  c?: TemplateSendOverrides
): Promise<{ ok: true } | { ok: true; skipped: "DISABLE_EMAIL=1" }> {
  // forceer side-effect registratie (alle templates importeren)
  await import("./register");

  // Normaliseren naar object-vorm
  let to: string;
  let template: T;
  let vars: TemplateVars[T];
  let from: string | undefined;
  let bcc: string | undefined;
  let replyTo: string | undefined;

  if (typeof a === "string") {
    // korte vorm
    template = a as T;
    vars = b as TemplateVars[T];
    to = c?.to as string;
    from = c?.from;
    bcc = c?.bcc;
    replyTo = c?.replyTo;
  } else {
    // object-vorm
    template = a.template as T;
    vars = a.vars as TemplateVars[T];
    to = a.to;
    from = a.from;
    bcc = a.bcc;
    replyTo = a.replyTo;
  }

  if (!to) throw new Error("sendTemplateMail: 'to' is verplicht.");

  const tpl = getTemplate(template);
  const subject = tpl.subject(vars as any);
  const html    = tpl.html(vars as any);
  const text    = tpl.text?.(vars as any);

  if (MAIL_DEV_ECHO) {
    console.log("[MAIL:compiled]", { to, template, subject, preview: html.slice(0, 180) + "…" });
  }
  if (DISABLE_EMAIL) return { ok: true, skipped: "DISABLE_EMAIL=1" as const };

  const transporter = getTransporter();
  await transporter.sendMail({
    to,
    from: from || tpl.from || MAIL_FROM,
    bcc: bcc || MAIL_BCC || undefined,
    replyTo,
    subject,
    html,
    text,
  });

  return { ok: true };
}
