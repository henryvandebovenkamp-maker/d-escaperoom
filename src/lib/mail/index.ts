// PATH: src/lib/mail/index.ts
import { transporter } from "./transporter";
import {
  DISABLE_EMAIL, MAIL_FROM, MAIL_BCC, MAIL_DEV_ECHO, APP_ORIGIN,
} from "@/lib/env";
import {
  getTemplate, registry, renderBaseFactory, type TemplateId, type Locale,
} from "./templates/base";
import "./templates/register";

type SendArgs<T extends TemplateId> = {
  to: string;
  template: T;
  vars: any;                // gevalideerd per template via zod
  locale?: Locale;          // default: 'nl'
  from?: string;
  bcc?: string;
  replyTo?: string;
};

function stripHtml(html: string) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "")
             .replace(/<[^>]+>/g, " ")
             .replace(/\s+/g, " ")
             .trim();
}

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" })
    .format((cents ?? 0) / 100);
}

export async function sendTemplateMail<T extends TemplateId>(args: SendArgs<T>) {
  const { to, template, vars, locale = "nl", from = MAIL_FROM, bcc = MAIL_BCC, replyTo } = args;

  // 1) Template + validatie
  const def = getTemplate(template);
  const parsed = def.varsSchema.safeParse(vars);
  if (!parsed.success) {
    throw new Error(`[mail] Invalid vars for "${template}": ${parsed.error.message}`);
  }

  // 2) Render
  const helpers = {
    appOrigin: APP_ORIGIN,
    euro,
    renderBase: renderBaseFactory(APP_ORIGIN),
  };
  const subject = def.subject(locale, parsed.data);
  const html = def.renderHtml(locale, parsed.data, helpers);
  const text = def.renderText?.(locale, parsed.data) ?? stripHtml(html);

  // 3) Dev echo / disable
  if (DISABLE_EMAIL || MAIL_DEV_ECHO) {
    console.log("[mail echo] to:", to, "| subject:", subject, "| template:", template);
    console.log(html.slice(0, 800) + (html.length > 800 ? " ..." : ""));
    return { ok: true, echoed: true as const };
  }

  // 4) Verzenden
  await transporter.sendMail({
    to, from, subject, html, text,
    bcc: bcc || undefined,
    replyTo,
  });

  return { ok: true as const };
}

// Voor gemakkelijke import elders
export { APP_ORIGIN } from "@/lib/env";
export type { TemplateId } from "./templates/base";

// Hulpfunctie voor een health check (optioneel)
export function listRegisteredTemplates(): TemplateId[] {
  return Array.from(registry.keys());
}
