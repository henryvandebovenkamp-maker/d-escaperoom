// PATH: src/lib/mail/send-template.ts
import { transporter, MAIL_FROM, MAIL_BCC, MAIL_DEV_ECHO, DISABLE_EMAIL } from "./transporter";
import { getTemplate, type TemplateId, type TemplateVars } from "./templates/base";
// Zorg dat templates geregistreerd zijn:
import "./templates/register";

/** Eén-object API (aanrader) */
export type SendArgs<T extends TemplateId> = {
  to: string;
  template: T;
  vars: TemplateVars[T];
  from?: string;        // bv. 'D-EscapeRoom <info@d-escaperoom.com>'
  bcc?: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

/** Klassieke 3-args API */
export type SendOpts = {
  to: string;
  from?: string;
  bcc?: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

/* ===================== Overloads ===================== */
export async function sendTemplateMail<T extends TemplateId>(
  args: SendArgs<T>
): Promise<any>;
export async function sendTemplateMail<T extends TemplateId>(
  template: T,
  vars: TemplateVars[T],
  opts: SendOpts
): Promise<any>;

/* ===================== Implementatie ===================== */
export async function sendTemplateMail<T extends TemplateId>(
  a0: SendArgs<T> | T,
  a1?: TemplateVars[T],
  a2?: SendOpts
): Promise<any> {
  let template: TemplateId;
  let vars: TemplateVars[TemplateId];
  let to = "";
  let from: string | undefined;
  let bcc: string | undefined;
  let replyTo: string | undefined;
  let extraHeaders: Record<string, string> | undefined;

  if (typeof a0 === "string") {
    // Vorm: sendTemplateMail("booking-customer", vars, { to, ... })
    template = a0 as TemplateId;
    vars = a1 as TemplateVars[TemplateId];
    const opts = a2 as SendOpts;
    to = opts?.to ?? "";
    from = opts?.from;
    bcc = opts?.bcc;
    replyTo = opts?.replyTo;
    extraHeaders = opts?.headers;
  } else {
    // Vorm: sendTemplateMail({ template, vars, to, ... })
    const args = a0 as SendArgs<TemplateId>;
    template = args.template;
    vars = args.vars as TemplateVars[TemplateId];
    to = args.to;
    from = args.from;
    bcc = args.bcc;
    replyTo = args.replyTo;
    extraHeaders = args.headers;
  }

  if (!to) {
    throw new Error(`[mail] Missing "to" address for template "${template}".`);
  }

  const { def, from: sourceFile } = getTemplate(template) as any;
  const subject = def.subject(vars);
  const html = def.html?.(vars);
  const text = def.text?.(vars) ?? "";

  if (!html) {
    // Nooit ongestyled versturen
    throw new Error(`[mail] Template "${template}" produced no HTML (source: ${sourceFile}).`);
  }

  // DEV: echo naar console i.p.v. mailen
  if (DISABLE_EMAIL || MAIL_DEV_ECHO) {
    console.info("[mail:echo]", { to, template, subject, sourceFile });
    if (DISABLE_EMAIL) {
      return {
        messageId: "disabled",
        accepted: [],
        rejected: [to],
        preview: { subject, html, text, template, sourceFile },
      };
    }
  }

  // From: val terug op MAIL_FROM (zet in .env als 'D-EscapeRoom <info@d-escaperoom.com>')
  const info = await transporter.sendMail({
    from: from ?? MAIL_FROM,
    to,
    bcc: (bcc ?? MAIL_BCC) || undefined,
    replyTo,
    subject,
    html,
    text,
    headers: {
      "X-DER-Template": template,
      "X-DER-Source-File": sourceFile ?? "unknown",
      ...(extraHeaders ?? {}),
    },
  });

  // Handige serverlog (niet in prod spammen)
  if (process.env.NODE_ENV !== "production") {
    console.debug("[mail] sent", { template, to, subject });
  }

  return info;
}
