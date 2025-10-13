// PATH: src/lib/env.ts
export const APP_ORIGIN = (() => {
  const explicit = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  if (explicit) return explicit;
  const vercel = (process.env.VERCEL_URL || "").replace(/\/+$/, "");
  if (vercel) return `https://${vercel}`;
  return process.env.NODE_ENV === "development" ? "https://d-escaperoom.vercel.app" : "";
})();
