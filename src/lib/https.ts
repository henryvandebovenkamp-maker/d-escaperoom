// PATH: src/lib/http.ts
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const api = (p: string) => `${BASE}/api${p.startsWith("/") ? p : `/${p}`}`;
// gebruik: fetch(api("/payments/mollie/create"), {...})
