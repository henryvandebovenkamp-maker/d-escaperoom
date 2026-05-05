import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

const DEFAULT_TIMEZONE = "Europe/Amsterdam";

export function monthRange(monthISO: string, tz = DEFAULT_TIMEZONE) {
  const [y, m] = monthISO.split("-").map((v) => parseInt(v, 10));

  const start = fromZonedTime(
    `${y}-${String(m).padStart(2, "0")}-01 00:00:00`,
    tz
  );

  const nextMonth = new Date(y, m, 1);
  const nextMonthISO = `${nextMonth.getFullYear()}-${String(
    nextMonth.getMonth() + 1
  ).padStart(2, "0")}-01`;

  const end = fromZonedTime(`${nextMonthISO} 00:00:00`, tz);

  return { start, end };
}

export function dayRange(dayISO: string, tz = DEFAULT_TIMEZONE) {
  const [y, m, d] = dayISO.split("-").map((v) => parseInt(v, 10));

  const start = fromZonedTime(`${dayISO} 00:00:00`, tz);

  const nextDay = new Date(y, m - 1, d);
  nextDay.setDate(nextDay.getDate() + 1);

  const nextDayISO = `${nextDay.getFullYear()}-${String(
    nextDay.getMonth() + 1
  ).padStart(2, "0")}-${String(nextDay.getDate()).padStart(2, "0")}`;

  const end = fromZonedTime(`${nextDayISO} 00:00:00`, tz);

  return { start, end };
}

export function toLocalISO(date: Date, tz = DEFAULT_TIMEZONE) {
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

export const STATUS_COLORS: Record<"DRAFT" | "PUBLISHED" | "BOOKED", string> = {
  DRAFT: "bg-orange-200 text-orange-900 border-orange-300",
  PUBLISHED: "bg-green-200 text-green-900 border-green-300",
  BOOKED: "bg-purple-200 text-purple-900 border-purple-300",
};