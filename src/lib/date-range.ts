// UTC-helpers voor maand- en dag-ranges
export function monthRange(monthISO: string) {
  const [y, m] = monthISO.split("-").map((v) => parseInt(v, 10));
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0)); // eerste dag vólgende maand
  return { start, end };
}

export function dayRange(dayISO: string) {
  const [y, m, d] = dayISO.split("-").map((v) => parseInt(v, 10));
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  return { start, end };
}
