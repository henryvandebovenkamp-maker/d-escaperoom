// PATH: src/lib/mail.ts

// Forceer dat alle templates direct worden geregistreerd zodra je "@/lib/mail" importeert
import "./mail/templates/register";

export { sendTemplateMail } from "./mail/send-template";
export { getTemplate, listTemplates } from "./mail/templates/base";
export { APP_ORIGIN } from "./mail/transporter";
