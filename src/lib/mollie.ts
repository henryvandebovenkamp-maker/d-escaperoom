// PATH: src/lib/mollie.ts
import createMollieClient from "@mollie/api-client";

export default function mollieClient() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY ontbreekt");
  return createMollieClient({ apiKey });
}
