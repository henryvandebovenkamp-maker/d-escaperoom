import { transporter, MAIL_FROM, MAIL_BCC, MAIL_DEV_ECHO, DISABLE_EMAIL } from "./transporter";
import { getTemplate, type TemplateId, type TemplateVars } from "./templates/base";
// Zorg dat templates geregistreerd zijn:
import "./templates/register";

type SendArgs<T extends TemplateId> = {
  to: string;
  template: T;
  vars: TemplateVars[T];
  from?: string;
  bcc?: string;
  replyTo?: string;
};

export async function sendTemplateMail<T extends TemplateId>(args: SendArgs<T>) {
  const { to, template, vars, from, bcc, replyTo } = args;
  const t = getTemplate(template);
  const subject = t.subject(vars as any);
  const html = t.html(vars as any);
  const text = t.text?.(vars as any);

  // DEV: echo naar console i.p.v. mailen
  if (DISABLE_EMAIL || MAIL_DEV_ECHO) {
    console.info("[mail:echo]", { to, template, subject });
    if (DISABLE_EMAIL) {
      return { messageId: "disabled", accepted: [], rejected: [to], preview: { subject, html, text } };
    }
  }

  const info = await transporter.sendMail({
    from: from ?? MAIL_FROM,
    to,
    bcc: (bcc ?? MAIL_BCC) || undefined,
    subject,
    html,
    text,
    replyTo,
  });

  return info;
}
