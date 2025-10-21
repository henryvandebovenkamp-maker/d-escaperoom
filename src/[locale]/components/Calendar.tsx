// PATH: src/components/Calendar.tsx
"use client";

import * as React from "react";

type LocaleKey = "nl" | "en" | "de" | "es";

const L = {
  nl: {
    months: ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"],
    days: ["ma","di","wo","do","vr","za","zo"],
    today: "Vandaag",
    prev: "Vorige maand",
    next: "Volgende maand",
  },
  en: {
    months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    days: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    today: "Today",
    prev: "Previous month",
    next: "Next month",
  },
  de: {
    months: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
    days: ["Mo","Di","Mi","Do","Fr","Sa","So"],
    today: "Heute",
    prev: "Vorheriger Monat",
    next: "Nächster Monat",
  },
  es: {
    months: ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],
    days: ["lu","ma","mi","ju","vi","sá","do"],
    today: "Hoy",
    prev: "Mes anterior",
    next: "Mes siguiente",
  },
} as const;

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fromISO(s: string | undefined | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return null;
  return dt;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function clampDate(d: Date, min?: Date | null, max?: Date | null) {
  let x = d;
  if (min && x < min) x = new Date(min);
  if (max && x > max) x = new Date(max);
  return x;
}
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function daysInMonth(year: number, monthIdx0: number) {
  return new Date(year, monthIdx0 + 1, 0).getDate();
}
function getMonthGrid(year: number, monthIdx0: number) {
  // Weekstart maandag (1=ma ... 0=zo)
  const first = new Date(year, monthIdx0, 1);
  const firstDayJs = first.getDay(); // 0=zo..6=za
  const firstCol = (firstDayJs + 6) % 7; // 0=ma..6=zo
  const totalDays = daysInMonth(year, monthIdx0);
  const cells: Array<{ date: Date; inMonth: boolean }> = [];

  // Leading (vorige maand)
  for (let i = 0; i < firstCol; i++) {
    const d = new Date(year, monthIdx0, 1 - (firstCol - i));
    cells.push({ date: d, inMonth: false });
  }
  // Current month
  for (let day = 1; day <= totalDays; day++) {
    cells.push({ date: new Date(year, monthIdx0, day), inMonth: true });
  }
  // Trailing (volgende maand) tot 6 rijen totaal
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last);
    d.setDate(last.getDate() + 1);
    cells.push({ date: d, inMonth: false });
  }
  // Zorg voor max 6 rijen (42 cellen)
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last);
    d.setDate(last.getDate() + 1);
    cells.push({ date: d, inMonth: false });
  }

  // Split in weken
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks.slice(0, 6);
}

export type CalendarProps = {
  value?: string;                 // YYYY-MM-DD
  onChange: (isoDate: string) => void;
  locale?: LocaleKey;             // default 'nl'
  min?: string;                   // YYYY-MM-DD
  max?: string;                   // YYYY-MM-DD
  disabled?: (date: Date) => boolean; // custom disable
  className?: string;
  showTodayButton?: boolean;      // default true
};

export default function Calendar({
  value,
  onChange,
  locale = "nl",
  min,
  max,
  disabled,
  className,
  showTodayButton = true,
}: CalendarProps) {
  const labels = L[locale] ?? L.nl;
  const today = startOfDay(new Date());
  const minDate = fromISO(min) ? startOfDay(fromISO(min)!) : undefined;
  const maxDate = fromISO(max) ? startOfDay(fromISO(max)!) : undefined;

  const selectedDate = fromISO(value);
  const initialMonth = selectedDate ?? clampDate(today, minDate, maxDate);
  const [viewYear, setViewYear] = React.useState(initialMonth.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(initialMonth.getMonth());

  // Zorg dat switchen via props het zichtbare maandjaar bijwerkt
  React.useEffect(() => {
    const base = selectedDate ?? today;
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function canGoPrev() {
    if (!minDate) return true;
    const prevEnd = new Date(viewYear, viewMonth, 0); // laatste dag vorige maand
    return prevEnd >= minDate;
  }
  function canGoNext() {
    if (!maxDate) return true;
    const nextStart = new Date(viewYear, viewMonth + 1, 1);
    return nextStart <= maxDate;
  }
  function go(n: number) {
    const next = addMonths(new Date(viewYear, viewMonth, 1), n);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  const weeks = getMonthGrid(viewYear, viewMonth);

  function isDisabled(d: Date) {
    const sd = startOfDay(d);
    if (minDate && sd < minDate) return true;
    if (maxDate && sd > maxDate) return true;
    if (disabled && disabled(sd)) return true;
    return false;
  }

  // Keyboard focus management
  const gridRef = React.useRef<HTMLDivElement>(null);
  function moveFocus(current: HTMLElement, days: number) {
    const target = current.getAttribute("data-idx");
    if (!target) return;
    const nextIdx = Number(target) + days;
    const next = gridRef.current?.querySelector<HTMLElement>(`[data-idx="${nextIdx}"]`);
    next?.focus();
  }

  return (
    <div className={["w-full select-none", className].filter(Boolean).join(" ")}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={!canGoPrev()}
          aria-label={labels.prev}
          className={[
            "rounded-xl border px-3 py-2 text-sm font-semibold",
            canGoPrev() ? "border-stone-300 hover:border-stone-400" : "border-stone-200 opacity-50 cursor-not-allowed",
          ].join(" ")}
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-lg font-bold">
            {labels.months[viewMonth]} {viewYear}
          </div>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={!canGoNext()}
          aria-label={labels.next}
          className={[
            "rounded-xl border px-3 py-2 text-sm font-semibold",
            canGoNext() ? "border-stone-300 hover:border-stone-400" : "border-stone-200 opacity-50 cursor-not-allowed",
          ].join(" ")}
        >
          ›
        </button>
      </div>

      {/* Weeklabels */}
      <div className="mt-3 grid grid-cols-7 text-center text-xs uppercase tracking-wide text-stone-500">
        {labels.days.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        role="grid"
        aria-label="Kalender"
        className="mt-1 grid grid-cols-7 gap-1"
      >
        {weeks.flat().map((cell, idx) => {
          const d = cell.date;
          const selected = selectedDate ? isSameDay(d, selectedDate) : false;
          const isToday = isSameDay(d, today);
          const out = !cell.inMonth;
          const dis = isDisabled(d);

          const base =
            "relative h-10 rounded-xl border text-sm font-semibold flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-pink-500";
          const tone = selected
            ? "border-pink-500"
            : dis
            ? "border-stone-200 text-stone-300"
            : out
            ? "border-stone-200 text-stone-400 hover:border-stone-300"
            : "border-stone-300 hover:border-stone-400";

          return (
            <button
              key={toISO(d)}
              type="button"
              role="gridcell"
              aria-selected={selected}
              data-idx={idx}
              tabIndex={selected ? 0 : -1}
              disabled={dis}
              onClick={() => !dis && onChange(toISO(d))}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") { e.preventDefault(); moveFocus(e.currentTarget, 1); }
                else if (e.key === "ArrowLeft") { e.preventDefault(); moveFocus(e.currentTarget, -1); }
                else if (e.key === "ArrowDown") { e.preventDefault(); moveFocus(e.currentTarget, 7); }
                else if (e.key === "ArrowUp") { e.preventDefault(); moveFocus(e.currentTarget, -7); }
                else if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!dis) onChange(toISO(d));
                }
              }}
              className={[base, tone].join(" ")}
            >
              {isToday && !selected && (
                <span className="absolute top-1 left-1 inline-block h-1.5 w-1.5 rounded-full bg-pink-500" aria-hidden />
              )}
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Today button */}
      {showTodayButton && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              const base = clampDate(today, minDate, maxDate);
              setViewYear(base.getFullYear());
              setViewMonth(base.getMonth());
              if (!isDisabled(base)) onChange(toISO(base));
            }}
            className="rounded-2xl border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-100"
          >
            {labels.today}
          </button>
        </div>
      )}
    </div>
  );
}
