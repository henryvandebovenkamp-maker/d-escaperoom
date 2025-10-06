export function getBaseUrl() {
  // accepteer beide env namen
  const APP = process.env.NEXT_PUBLIC_APP_URL;
  const BASE = process.env.NEXT_PUBLIC_BASE_URL;
  if (APP) return APP;
  if (BASE) return BASE;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
