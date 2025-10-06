// PATH: src/lib/mail/index.ts
export { sendMail } from "./send";
export { transporter, FROM } from "./transporter";
export { verifySmtp } from "./verify";

export * from "./templates/bookingCustomer";
export * from "./templates/bookingPartner";
export * from "./templates/loginCode";

