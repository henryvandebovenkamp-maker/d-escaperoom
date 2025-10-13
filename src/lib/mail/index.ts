// PATH: src/lib/mail/index.ts
// Forceer template-registratie één keer
import "@/lib/mail/templates/register";

export { sendTemplateMail, type TemplateId, type TemplateVars } from "@/lib/mail/templates/base";
export { MAIL_FROM, MAIL_BCC, MAIL_DEV_ECHO, DISABLE_EMAIL } from "@/lib/mail/transporter";
export { APP_ORIGIN } from "@/lib/env";
