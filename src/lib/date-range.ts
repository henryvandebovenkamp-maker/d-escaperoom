import { fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Europe/Amsterdam";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function addDaysISO(dayISO: string, amount: number) {
  const [y, m, d] = dayISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  date.setDate(date.getDate() + amount);

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function nextMonthISO(monthISO: string) {
  const [y, m] = monthISO.split("-").map(Number);
  const date = new Date(y, m, 1);

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function monthRange(monthISO: string) {
  const start = fromZonedTime(`${monthISO}-01 00:00:00`, TIMEZONE);
  const end = fromZonedTime(`${nextMonthISO(monthISO)}-01 00:00:00`, TIMEZONE);

  return { start, end };
}

export function dayRange(dayISO: string) {
  const start = fromZonedTime(`${dayISO} 00:00:00`, TIMEZONE);
  const end = fromZonedTime(`${addDaysISO(dayISO, 1)} 00:00:00`, TIMEZONE);

  return { start, end };
}