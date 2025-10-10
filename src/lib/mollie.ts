// src/lib/mollie.ts
// Singleton Mollie client (Node.js only). Werkt met zowel:
//   import mollie from "@/lib/mollie"
//   import { mollie } from "@/lib/mollie"

import createMollieClient, { type MollieClient } from "@mollie/api-client";

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("Mollie client mag niet in de browser gebruikt worden.");
  }
  // Mollie SDK vereist Node.js (NIET Edge runtime)
  // Zorg dat je API routes dit hebben:
  //   export const runtime = "nodejs";
}

function getApiKey(): string {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) {
    throw new Error(
      "MOLLIE_API_KEY ontbreekt. Zet deze in je .env / Vercel Project Settings."
    );
  }
  return key;
}

let _client: MollieClient | null = null;

/** Lazy singleton */
export function getMollie(): MollieClient {
  assertServerRuntime();
  if (_client) return _client;
  _client = createMollieClient({ apiKey: getApiKey() });
  return _client;
}

/** Named export voor jouw stijl */
export const mollie = getMollie();

/** Default export voor bestaande imports in code die al zo werken */
export default mollie;
