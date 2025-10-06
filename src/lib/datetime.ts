export function monthRange(monthISO: string) {
  const [y, m] = monthISO.split("-").map((v) => parseInt(v, 10));
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)); // tot einde maand
  return { start, end };
}

export function dayRange(dayISO: string) {
  const [y, m, d] = dayISO.split("-").map((v) => parseInt(v, 10));
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  return { start, end };
}

export function toLocalISO(date: Date, tz = "Europe/Amsterdam") {
  // alleen voor labels in UI; DB blijft UTC
  const fmt = new Intl.DateTimeFormat("nl-NL", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [dd, mm, yyyy] = fmt.format(date).split("-");
  return `${yyyy}-${mm}-${dd}`;
}

export const STATUS_COLORS: Record<"DRAFT"|"PUBLISHED"|"BOOKED", string> = {
  DRAFT: "bg-orange-200 text-orange-900 border-orange-300",
  PUBLISHED: "bg-green-200 text-green-900 border-green-300",
  BOOKED: "bg-purple-200 text-purple-900 border-purple-300",
};
