// PATH: src/lib/mail/index.ts
import "@/lib/mail/templates/register";
export { sendTemplateMail } from "./send-template";
export { transporter } from "./transporter";

// 🚫 elke oude call laten falen met stacktrace
export async function sendMail(..._args: any[]) {
  throw new Error("[mail] sendMail() deprecated. Use sendTemplateMail().");
}
