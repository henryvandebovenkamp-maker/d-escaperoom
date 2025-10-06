// PATH: src/lib/mail/send.ts
import { transporter, FROM } from "./transporter";

export type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
};

export async function sendMail(args: SendArgs) {
  return transporter.sendMail({
    from: FROM,
    ...args,
  });
}
