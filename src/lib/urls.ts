// PATH: src/lib/urls.ts
const ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function absoluteUrl(path: string = "/") {
  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(`${BASE_PATH}${p}`, ORIGIN).toString();
}
