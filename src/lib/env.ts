// src/lib/env.ts
function computeOrigin(): string {
  const env = process.env;

  if (env.VERCEL_ENV === "production") {
    const fromEnv = env.APP_ORIGIN || env.NEXT_PUBLIC_APP_URL;
    if (!fromEnv || !fromEnv.startsWith("https://")) {
      throw new Error(`APP_ORIGIN ontbreekt/ongeldig in production: ${fromEnv ?? "(unset)"}`);
    }
    return fromEnv;
  }

  if (env.VERCEL_ENV === "preview") {
    if (env.APP_ORIGIN) return env.APP_ORIGIN;
    if (env.VERCEL_BRANCH_URL) return `https://${env.VERCEL_BRANCH_URL}`;
    if (env.VERCEL_URL)        return `https://${env.VERCEL_URL}`;
  }

  return env.APP_ORIGIN || "http://localhost:3000";
}

export const APP_ORIGIN = computeOrigin();

// Safety net: nooit localhost in production
if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(APP_ORIGIN)) {
  throw new Error(`Production draait met localhost APP_ORIGIN: ${APP_ORIGIN}`);
}
