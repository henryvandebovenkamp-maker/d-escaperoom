// PATH: src/lib/slot-times.ts

const DAY_START_MINUTES = 9 * 60;  // 09:00
const DAY_END_EXCLUSIVE = 21 * 60; // last start must be < 21:00

/**
 * Generates non-overlapping slot start times from 09:00, spaced by durationMinutes,
 * while start < 21:00.
 *
 * Example: durationMinutes=75 → ["09:00","10:15","11:30","12:45","14:00","15:15","16:30","17:45","19:00","20:15"]
 * Example: durationMinutes=60 → ["09:00","10:00","11:00",...,"20:00"]
 */
export function generateStartTimes(durationMinutes: number): string[] {
  const times: string[] = [];
  let cur = DAY_START_MINUTES;
  while (cur < DAY_END_EXCLUSIVE) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    cur += durationMinutes;
  }
  return times;
}
