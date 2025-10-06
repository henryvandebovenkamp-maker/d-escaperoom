// PATH: src/lib/mail/format.ts
import { DateTime } from "luxon";

export function fmtEUR(cents: number, locale = "nl-NL") {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
}

export function fmtDateTimeISO(iso: string, tz = "Europe/Amsterdam", locale = "nl-NL") {
  const dt = DateTime.fromISO(iso, { zone: tz });
  return dt.setLocale(locale).toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY); // bijv. "za 4 okt 2025 14:30"
}

export function stripHtml(html: string) {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").trim();
}
