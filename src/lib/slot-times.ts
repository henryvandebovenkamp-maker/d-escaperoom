// PATH: src/lib/slot-times.ts

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Generates non-overlapping slot start times beginning at dayStartTime,
 * spaced by durationMinutes, while slotEnd <= dayEndTime.
 *
 * Example: start=09:00, end=21:00, duration=75
 * → ["09:00","10:15","11:30","12:45","14:00","15:15","16:30","17:45","19:00"]
 * (20:15 excluded: 20:15+75=21:30 > 21:00)
 */
export function generateStartTimes({
  dayStartTime = "09:00",
  dayEndTime = "21:00",
  durationMinutes,
}: {
  dayStartTime?: string;
  dayEndTime?: string;
  durationMinutes: number;
}): string[] {
  const startMin = hhmmToMinutes(dayStartTime);
  const endMin = hhmmToMinutes(dayEndTime);
  const times: string[] = [];
  let cur = startMin;
  while (cur + durationMinutes <= endMin) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    cur += durationMinutes;
  }
  return times;
}
