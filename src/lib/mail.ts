export { sendTemplateMail } from "./mail/send-template";
export {
  transporter,
  MAIL_FROM,
  MAIL_BCC,
  APP_ORIGIN,
  MAIL_DEV_ECHO,
  DISABLE_EMAIL,
} from "./mail/transporter";
export { listTemplates, type TemplateId } from "./mail/templates/base";
