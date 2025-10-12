// PATH: src/lib/mollie.ts
// Lazy singleton Mollie client (Node.js only), safe for import anywhere.
// Werkt met:
//   import { mollie } from "@/lib/mollie"
//   import mollie from "@/lib/mollie"
//   import { getMollie } from "@/lib/mollie"

import createMollieClient, { type MollieClient } from "@mollie/api-client";

function assertServerNodeRuntime() {
  // Geen browser
  if (typeof window !== "undefined") {
    throw new Error("Mollie client mag niet in de browser gebruikt worden.");
  }
  // Geen Edge runtime (heeft geen echte Node APIs)
  const isNode = typeof process !== "undefined" && !!process.versions?.node;
  if (!isNode) {
    throw new Error('Mollie client vereist "nodejs" runtime. Zet: export const runtime = "nodejs";');
  }
}

function getApiKey(): string {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) {
    throw new Error(
      "MOLLIE_API_KEY ontbreekt. Zet deze in .env en in Vercel Project Settings (Production & Preview)."
    );
  }
  return key;
}

let _client: MollieClient | null = null;

/** Haal de singleton op (instantieer pas bij eerste gebruik) */
export function getMollie(): MollieClient {
  assertServerNodeRuntime();
  if (_client) return _client;
  _client = createMollieClient({ apiKey: getApiKey() });
  return _client;
}

/** Lazy proxy: instanties pas wanneer je daadwerkelijk een property/methode gebruikt */
const mollieProxy: MollieClient = new Proxy({} as MollieClient, {
  get(_target, prop, receiver) {
    const inst = getMollie();
    // @ts-ignore – dynamic property passthrough
    return Reflect.get(inst, prop, receiver);
  },
});

/** Named export (aanbevolen) */
export const mollie = mollieProxy;
/** Default export (voor bestaande imports) */
export default mollieProxy;
