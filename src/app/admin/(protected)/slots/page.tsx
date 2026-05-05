"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/* ========================================================================
   Slots — complete page (admin/partner)
   - datumselectie mobiel/desktop gefixt
   - geen new Date("YYYY-MM-DD") meer voor kalenderdagen
   - tijden consequent Europe/Amsterdam
   - bestaande endpoints behouden
========================================================================= */

/* --------------------------------
   Helpers
---------------------------------- */
const TZ = "Europe/Amsterdam";

const NL_DAYS_SHORT = ["ma", "di", "wo", "do", "vr", "za", "zo"] as const;

const NL_MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
] as const;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function nowMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function parseYMDLocal(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toYMDLocal(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function cmpYMD(a: string, b: string) {
  return parseYMDLocal(a).getTime() - parseYMDLocal(b).getTime();
}

function fmtMonthISO(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function fmtDayLongNL(dayISO: string) {
  const d = parseYMDLocal(dayISO);

  const days = [
    "zondag",
    "maandag",
    "dinsdag",
    "woensdag",
    "donderdag",
    "vrijdag",
    "zaterdag",
  ];

  const monthsShort = [
    "jan",
    "feb",
    "mrt",
    "apr",
    "mei",
    "jun",
    "jul",
    "aug",
    "sept",
    "okt",
    "nov",
    "dec",
  ];

  return `${days[d.getDay()]} ${d.getDate()} ${monthsShort[d.getMonth()]}`;
}

function fmtTimeAmsterdam(input: string | Date) {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(typeof input === "string" ? new Date(input) : input);
}

function fmtSlotNL(dayISO: string, startISO: string) {
  const d = new Date(startISO);

  const parts = new Intl.DateTimeFormat("nl-NL", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";

  return `${get("weekday").toLowerCase()} ${get("day")} ${get("month").toLowerCase()} ${get("hour")}:${get("minute")}`;
}

/**
 * Maakt een echte UTC-instant voor een lokale Amsterdam-dag/tijd.
 * Voorbeeld: 2026-05-09 + 09:00 => juiste ISO voor 09:00 Amsterdam.
 */
function zonedDateFromAmsterdamLocal(dayISO: string, time: string) {
  const [year, month, day] = dayISO.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  const guessUTC = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(guessUTC));

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  const actualMinutes = Number(map.hour) * 60 + Number(map.minute);
  const intendedMinutes = hour * 60 + minute;
  const diffMinutes = intendedMinutes - actualMinutes;

  return new Date(guessUTC + diffMinutes * 60_000);
}

/* --------------------------------
   Types
---------------------------------- */
type PartnerRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
};

type ApiDay = {
  date: string;
  draftCount?: number;
  publishedCount?: number;
  bookedCount?: number;
  hasDraft?: boolean;
  hasPublished?: boolean;
  hasBooked?: boolean;
  capacityPerDay?: number;
};

type Cell = {
  dateISO?: string;
  day?: number;
  data?: ApiDay;
};

type DayItem = {
  id: string | null;
  status: "DRAFT" | "PUBLISHED" | "BOOKED";
  startTime: string;
  endTime?: string;
  virtual?: boolean;
  capacity?: number;
  maxPlayers?: number;
};

/* ========================================================================
   Page
========================================================================= */
export default function SlotsPage() {
  const sp =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const urlPartner = sp?.get("partner") ?? "";

  const [partners, setPartners] = React.useState<PartnerRow[]>([]);
  const [partnerSlug, setPartnerSlug] = React.useState<string>(urlPartner);
  const [monthISO, setMonthISO] = React.useState(nowMonthISO());
  const [selectedDay, setSelectedDay] = React.useState(todayISO());
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    async function loadPartners() {
      try {
        const r = await fetch("/api/partners/list", {
          cache: "no-store",
          credentials: "include",
        });

        if (!r.ok) return;

        const rows = (await r.json()) as PartnerRow[];

        if (cancelled) return;

        setPartners(rows || []);

        if (!partnerSlug && rows?.[0]?.slug) {
          setPartnerSlug(rows[0].slug);
        }
      } catch {
        // ignore
      }
    }

    loadPartners();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthDate = React.useMemo(
    () => parseYMDLocal(`${monthISO}-01`),
    [monthISO]
  );

  const monthTitle = `${NL_MONTHS[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

  function gotoPrevMonth() {
    const [year, month] = monthISO.split("-").map(Number);
    const d = new Date(year, month - 2, 1);
    setMonthISO(fmtMonthISO(d));
  }

  function gotoNextMonth() {
    const [year, month] = monthISO.split("-").map(Number);
    const d = new Date(year, month, 1);
    setMonthISO(fmtMonthISO(d));
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/80 backdrop-blur supports-[backdrop-filter]:bg-stone-50/60">
        <div className="mx-auto max-w-[92rem] px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-400" />
                Tijdsloten beheren
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              {partners.length > 0 ? (
                <select
                  className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  value={partnerSlug}
                  onChange={(e) => {
                    setPartnerSlug(e.target.value);
                    setSelectedDay(todayISO());
                    setRefreshKey((k) => k + 1);
                  }}
                  aria-label="Kies partner"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.name}
                      {p.city ? ` — ${p.city}` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    placeholder="partner-slug"
                    value={partnerSlug}
                    onChange={(e) => setPartnerSlug(e.target.value)}
                    className="w-48 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />

                  <button
                    onClick={() => setRefreshKey((k) => k + 1)}
                    className="hidden rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700 sm:inline-flex"
                  >
                    Laden
                  </button>
                </div>
              )}

              <a
                href="/admin"
                className="hidden rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700 sm:inline-flex"
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-[-10%] w-[120%] max-w-none px-4 py-6 sm:mx-auto sm:w-auto sm:max-w-[92rem] sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">📅 Jouw — {monthTitle}</h2>

              <div className="flex items-center gap-2">
                <button
                  onClick={gotoPrevMonth}
                  className="rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700"
                >
                  Vorige
                </button>

                <button
                  onClick={gotoNextMonth}
                  className="rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700"
                >
                  Volgende
                </button>
              </div>
            </div>

            <CalendarMonth
              key={`${partnerSlug}-${monthISO}-${refreshKey}`}
              partnerSlug={partnerSlug}
              monthISO={monthISO}
              selectedDay={selectedDay}
              onSelectDay={(d) => {
                setSelectedDay(d);
                setRefreshKey((k) => k + 1);
              }}
            />
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <h2 className="mb-3 text-xl font-extrabold">➕ Reeks toevoegen</h2>

            <SeriesForm
              partnerSlug={partnerSlug}
              onDone={() => setRefreshKey((k) => k + 1)}
            />
          </section>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <DayLists
            key={`${partnerSlug}-${selectedDay}-${refreshKey}`}
            partnerSlug={partnerSlug}
            dayISO={selectedDay}
            onChanged={() => setRefreshKey((k) => k + 1)}
          />
        </div>

        <div className="mt-6">
          <BulkPublished
            key={`${partnerSlug}-${monthISO}-${refreshKey}`}
            partnerSlug={partnerSlug}
            monthISO={monthISO}
            onChanged={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>
    </div>
  );
}

/* ========================================================================
   CalendarMonth
========================================================================= */
function CalendarMonth({
  partnerSlug,
  monthISO,
  selectedDay,
  onSelectDay,
}: {
  partnerSlug: string;
  monthISO: string;
  selectedDay: string;
  onSelectDay: (d: string) => void;
}) {
  const [days, setDays] = React.useState<ApiDay[]>([]);
  const [baseCap, setBaseCap] = React.useState<number>(12);
  const [loading, setLoading] = React.useState(false);

  const today = React.useMemo(() => todayISO(), []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadMonth() {
      if (!partnerSlug) {
        setDays([]);
        return;
      }

      setLoading(true);

      try {
        const url = `/api/slots/${encodeURIComponent(
          partnerSlug
        )}/list?scope=month&month=${encodeURIComponent(monthISO)}`;

        const r = await fetch(url, {
          cache: "no-store",
          credentials: "include",
        });

        if (!r.ok) throw new Error(await r.text());

        const j = await r.json();

        const mapped: ApiDay[] = Array.isArray(j?.days)
          ? j.days.map((d: any) => {
              const date = d.day ?? d.date;

              const draftCount =
                typeof d.DRAFT === "number"
                  ? d.DRAFT
                  : typeof d.draftCount === "number"
                    ? d.draftCount
                    : 0;

              const publishedCount =
                typeof d.PUBLISHED === "number"
                  ? d.PUBLISHED
                  : typeof d.publishedCount === "number"
                    ? d.publishedCount
                    : 0;

              const bookedCount =
                typeof d.BOOKED === "number"
                  ? d.BOOKED
                  : typeof d.bookedCount === "number"
                    ? d.bookedCount
                    : 0;

              return {
                date,
                draftCount,
                publishedCount,
                bookedCount,
                hasDraft: draftCount > 0,
                hasPublished: publishedCount > 0,
                hasBooked: bookedCount > 0,
                capacityPerDay: Number(j?.base ?? 12),
              };
            })
          : Array.isArray(j?.publishedDays)
            ? j.publishedDays.map((d: any) => ({
                date: d.date,
                draftCount: 0,
                publishedCount: Number(d.publishedCount ?? 0),
                bookedCount: 0,
                hasDraft: false,
                hasPublished: Number(d.publishedCount ?? 0) > 0,
                hasBooked: false,
                capacityPerDay: Number(j?.base ?? 12),
              }))
            : [];

        if (cancelled) return;

        setDays(mapped);
        setBaseCap(Number(j?.base ?? 12));
      } catch (e) {
        console.error("CalendarMonth load error:", e);

        if (!cancelled) {
          setDays([]);
          setBaseCap(12);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMonth();

    return () => {
      cancelled = true;
    };
  }, [partnerSlug, monthISO]);

  const byDate = React.useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const first = parseYMDLocal(`${monthISO}-01`);
  const year = first.getFullYear();
  const month = first.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = (first.getDay() + 6) % 7;

  const cells: Cell[] = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({});
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateISO = `${monthISO}-${pad2(d)}`;
    cells.push({
      dateISO,
      day: d,
      data: byDate.get(dateISO),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({});
  }

  function deriveCounts(d?: ApiDay) {
    const cap = Math.max(0, d?.capacityPerDay ?? baseCap ?? 12);
    const G = Math.max(0, d?.publishedCount ?? 0);
    const P = Math.max(0, d?.bookedCount ?? 0);
    const O = Math.max(0, d?.draftCount ?? cap - (G + P));

    return { O, G, P, cap };
  }

  function moveSelection(deltaDays: number) {
    if (!selectedDay) return;

    const d = parseYMDLocal(selectedDay);
    d.setDate(d.getDate() + deltaDays);

    const next = toYMDLocal(d);

    if (next >= today) {
      onSelectDay(next);
    }
  }

  const Dot = ({ className }: { className: string }) => (
    <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${className}`} />
  );

  return (
    <div className="px-2 sm:px-0">
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase text-stone-500 sm:gap-2 sm:text-xs">
        {NL_DAYS_SHORT.map((d) => (
          <div key={d} className="truncate">
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-1.5 sm:gap-2"
        role="grid"
        aria-label="Kalender maand"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            moveSelection(-1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            moveSelection(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            moveSelection(-7);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            moveSelection(7);
          }
        }}
      >
        {cells.map((c, i) => {
          if (!c.dateISO) {
            return <div key={i} className="invisible h-16 rounded-xl border sm:h-24" />;
          }

          const isSelected = c.dateISO === selectedDay;
          const isPast = c.dateISO < today;
          const { O, G, P, cap } = deriveCounts(c.data);

          return (
            <button
              key={c.dateISO}
              onClick={() => {
                if (!isPast) onSelectDay(c.dateISO!);
              }}
              disabled={isPast}
              aria-current={isSelected ? "date" : undefined}
              aria-label={
                isPast
                  ? `Dag ${c.dateISO} is verleden en niet selecteerbaar.`
                  : `Selecteer ${c.dateISO}. Oranje ${O} van ${cap}, groen ${G}, paars ${P}.`
              }
              className={[
                "relative h-16 rounded-xl border bg-white p-1.5 text-left shadow-sm transition sm:h-24 sm:rounded-2xl sm:p-2",
                "border-stone-200",
                isPast
                  ? "pointer-events-none cursor-default text-stone-400 opacity-50"
                  : "cursor-pointer hover:bg-stone-50 hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-safe:transition-transform",
                isSelected && !isPast ? "ring-2 ring-pink-500 ring-offset-2" : "",
              ].join(" ")}
            >
              <div className="absolute right-1.5 top-1.5 text-[11px] font-extrabold text-stone-600 sm:right-2 sm:top-2 sm:text-sm">
                {c.day}
              </div>

              <div className="absolute bottom-1.5 left-1.5 flex flex-col items-start gap-0.5 text-[10px] leading-none text-stone-700 tabular-nums sm:bottom-2 sm:left-2 sm:gap-1 sm:text-[11px]">
                <div className="flex items-center gap-1" title={`Oranje: ${O}`}>
                  <Dot className="bg-orange-500" />
                  <span>{O}</span>
                </div>

                <div className="flex items-center gap-1" title={`Groen: ${G}`}>
                  <Dot className="bg-emerald-600" />
                  <span>{G}</span>
                </div>

                <div className="flex items-center gap-1" title={`Paars: ${P}`}>
                  <Dot className="bg-purple-600" />
                  <span>{P}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {loading && (
        <p className="mt-2 text-[11px] text-stone-500 sm:text-xs">Agenda laden…</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-stone-700 sm:gap-4 sm:text-[11px]">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          Oranje beschikbaar
        </span>

        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          Groen boekbaar
        </span>

        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-purple-600" />
          Paars geboekt
        </span>
      </div>
    </div>
  );
}

/* ========================================================================
   SeriesForm
========================================================================= */
function SeriesForm({
  partnerSlug,
  onDone,
}: {
  partnerSlug: string;
  onDone?: () => void;
}) {
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [msgKind, setMsgKind] = React.useState<"success" | "error" | "info">("info");

  const NL_DAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"] as const;
  const jsDayOrder = [1, 2, 3, 4, 5, 6, 0];

  const TIMES = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
  ] as const;

  const [weekdays, setWeekdays] = React.useState<Set<number>>(new Set());
  const [selectedTimes, setSelectedTimes] = React.useState<Set<string>>(new Set());

  const dateMin = todayISO();

  const dateMax = React.useMemo(() => {
    const now = new Date();
    const max = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    return toYMDLocal(max);
  }, []);

  function clampDate(ymd: string) {
    if (!ymd) return ymd;
    if (cmpYMD(ymd, dateMin) < 0) return dateMin;
    if (cmpYMD(ymd, dateMax) > 0) return dateMax;
    return ymd;
  }

  function combineDateTime(ymd: string, hhmm: string) {
    const [year, month, day] = ymd.split("-").map(Number);
    const [hour, minute] = hhmm.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }

  function isTodayOnly() {
    return !!start && !!end && start === end && start === dateMin;
  }

  function isPastTimeForToday(hhmm: string) {
    return combineDateTime(dateMin, hhmm).getTime() <= Date.now();
  }

  React.useEffect(() => {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStart((prev) => prev || clampDate(toYMDLocal(now)));
    setEnd((prev) => prev || clampDate(toYMDLocal(last)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleWeekday(jsDay: number) {
    setWeekdays((p) => {
      const n = new Set(p);
      n.has(jsDay) ? n.delete(jsDay) : n.add(jsDay);
      return n;
    });
  }

  function toggleTime(t: string) {
    if (isTodayOnly() && isPastTimeForToday(t)) return;

    setSelectedTimes((p) => {
      const n = new Set(p);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });
  }

  function setPresetToday() {
    const d = dateMin;
    setStart(d);
    setEnd(d);
  }

  function setPresetThisWeek() {
    const d = new Date();
    const dow = (d.getDay() + 6) % 7;

    const monday = new Date(d);
    monday.setDate(d.getDate() - dow);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setStart(clampDate(toYMDLocal(monday)));
    setEnd(clampDate(toYMDLocal(sunday)));
  }

  function setPresetNextMonth() {
    const now = new Date();

    const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    setStart(clampDate(toYMDLocal(first)));
    setEnd(clampDate(toYMDLocal(last)));
  }

  function setPresetRestOfYear() {
    const now = new Date();
    const last = new Date(now.getFullYear(), 11, 31);

    setStart(clampDate(start || toYMDLocal(now)));
    setEnd(clampDate(toYMDLocal(last)));
  }

  function setWeekdaysNone() {
    setWeekdays(new Set());
  }

  function setWeekdaysAll() {
    setWeekdays(new Set([0, 1, 2, 3, 4, 5, 6]));
  }

  function setWeekdaysWorkdays() {
    setWeekdays(new Set([1, 2, 3, 4, 5]));
  }

  function setWeekdaysWeekend() {
    setWeekdays(new Set([0, 6]));
  }

  function setTimesNone() {
    setSelectedTimes(new Set());
  }

  function setTimesAll() {
    setSelectedTimes(
      new Set(isTodayOnly() ? TIMES.filter((t) => !isPastTimeForToday(t)) : TIMES)
    );
  }

  function setTimesDay() {
    const arr = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
    setSelectedTimes(
      new Set(isTodayOnly() ? arr.filter((t) => !isPastTimeForToday(t)) : arr)
    );
  }

  function setTimesEvening() {
    const arr = ["17:00", "18:00", "19:00", "20:00"];
    setSelectedTimes(
      new Set(isTodayOnly() ? arr.filter((t) => !isPastTimeForToday(t)) : arr)
    );
  }

  const validation = React.useMemo(() => {
    if (!partnerSlug) return { ok: false, reason: "Geen partner geselecteerd." };
    if (!start || !end) return { ok: false, reason: "Kies een start- en einddatum." };
    if (cmpYMD(start, end) > 0) return { ok: false, reason: "Einddatum moet na startdatum liggen." };
    if (cmpYMD(start, dateMin) < 0) return { ok: false, reason: "Startdatum mag niet in het verleden liggen." };
    if (cmpYMD(end, dateMax) > 0) return { ok: false, reason: "Maximaal 2 jaar vooruit plannen." };
    if (weekdays.size === 0) return { ok: false, reason: "Kies minimaal één weekdag." };
    if (selectedTimes.size === 0) return { ok: false, reason: "Kies minimaal één tijd." };

    return { ok: true, reason: null as string | null };
  }, [partnerSlug, start, end, weekdays, selectedTimes, dateMin, dateMax]);

  const estimateCount = React.useMemo(() => {
    if (!validation.ok) return 0;

    const from = parseYMDLocal(start);
    const to = parseYMDLocal(end);

    let days = 0;
    const cursor = new Date(from);

    while (cursor <= to) {
      if (weekdays.has(cursor.getDay())) days += 1;
      cursor.setDate(cursor.getDate() + 1);
    }

    return days * selectedTimes.size;
  }, [start, end, weekdays, selectedTimes, validation.ok]);

  async function submit() {
    setMsg(null);

    const startForSubmit = clampDate(start);
    const rawEnd = clampDate(end);
    const endForSubmit =
      cmpYMD(rawEnd, startForSubmit) < 0 ? startForSubmit : rawEnd;

    if (!partnerSlug) {
      setMsgKind("error");
      setMsg("Geen partner geselecteerd.");
      return;
    }

    if (weekdays.size === 0 || selectedTimes.size === 0) {
      setMsgKind("error");
      setMsg("Kies minimaal één dag en één tijd.");
      return;
    }

    let timesToSend = Array.from(selectedTimes);

    if (startForSubmit === dateMin && endForSubmit === dateMin) {
      timesToSend = timesToSend.filter((t) => !isPastTimeForToday(t));

      if (timesToSend.length === 0) {
        setMsgKind("error");
        setMsg("Alle gekozen tijden voor vandaag zijn al voorbij.");
        return;
      }
    }

    setLoading(true);

    try {
      const r = await fetch(`/api/slots/${encodeURIComponent(partnerSlug)}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          startDate: startForSubmit,
          endDate: endForSubmit,
          publish: true,
          weekdays: Array.from(weekdays),
          times: timesToSend,
        }),
      });

      let data: any = null;
      let rawText = "";

      try {
        if (r.headers.get("content-type")?.includes("application/json")) {
          data = await r.json();
        } else {
          rawText = await r.text();
        }
      } catch {
        // ignore
      }

      if (!r.ok) {
        const errStr = String(data?.error || data?.message || rawText || "").toLowerCase();

        if (
          r.status === 409 ||
          errStr.includes("duplicate") ||
          errStr.includes("unique") ||
          errStr.includes("p2002") ||
          errStr.includes("already exists") ||
          errStr.includes("bestaat al")
        ) {
          setMsgKind("error");
          setMsg("Deels mislukt: dubbele tijdsloten gevonden — controleer je selectie.");
        } else {
          setMsgKind("error");
          setMsg(data?.error || data?.message || rawText || "Fout bij aanmaken reeks.");
        }

        return;
      }

      if (data && typeof data.skippedDuplicates === "number" && data.skippedDuplicates > 0) {
        setMsgKind("info");
        setMsg(
          `Gedeeltelijk gepubliceerd: ${data.created ?? "een deel"} toegevoegd, ${data.skippedDuplicates} overgeslagen.`
        );
        onDone?.();
        return;
      }

      setMsgKind("success");
      setMsg("Reeks gepubliceerd ✔️");
      onDone?.();
    } catch (e: any) {
      setMsgKind("error");
      setMsg(e?.message || "Onbekende fout.");
    } finally {
      setLoading(false);
    }
  }

  const submitDisabled = loading || !validation.ok;
  const disablePastTimesToday = isTodayOnly();

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-stone-800">Periode</label>

        <div className="mt-2 max-w-[330px] sm:max-w-none">
          <div className="flex gap-2.5">
            <div className="min-w-[130px] grow basis-0">
              <span className="block text-xs text-stone-700">Startdatum</span>

              <input
                type="date"
                min={dateMin}
                max={dateMax}
                className="mt-1 h-10 w-full min-w-0 appearance-none rounded-lg border border-stone-300 bg-white px-3 text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-stone-400 [font-variant-numeric:tabular-nums]"
                value={start}
                onChange={(e) => {
                  const v = clampDate(e.target.value);
                  setStart(v);

                  if (end && cmpYMD(v, end) > 0) {
                    setEnd(v);
                  }
                }}
              />
            </div>

            <div className="ml-2 min-w-[130px] grow basis-0 sm:ml-0">
              <span className="block text-xs text-stone-700">Einddatum</span>

              <input
                type="date"
                min={start || dateMin}
                max={dateMax}
                className="mt-1 h-10 w-full min-w-0 appearance-none rounded-lg border border-stone-300 bg-white px-3 text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-stone-400 [font-variant-numeric:tabular-nums]"
                value={end}
                onChange={(e) => {
                  const v = clampDate(e.target.value);
                  setEnd(start && cmpYMD(v, start) < 0 ? start : v);
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <PresetButton onClick={setPresetToday} label="Vandaag" />
          <PresetButton onClick={setPresetThisWeek} label="Deze week" />
          <PresetButton onClick={setPresetNextMonth} label="Volgende maand" />
          <PresetButton onClick={setPresetRestOfYear} label="Rest van het jaar" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-stone-800">
          Dagen van de week
        </label>

        <div className="mt-2 flex flex-wrap gap-2">
          {NL_DAYS.map((label, i) => {
            const jsDay = jsDayOrder[i];
            const active = weekdays.has(jsDay);

            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleWeekday(jsDay)}
                aria-pressed={active}
                className={[
                  "rounded-2xl border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2",
                  active
                    ? "border-stone-900 bg-stone-900 text-white shadow focus:ring-stone-800"
                    : "border-stone-300 bg-white text-stone-900 hover:bg-stone-50 focus:ring-stone-400",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <MiniGhost onClick={setWeekdaysAll} label="Alles" />
          <MiniGhost onClick={setWeekdaysWorkdays} label="Ma–Vr" />
          <MiniGhost onClick={setWeekdaysWeekend} label="Weekend" />
          <MiniGhost onClick={setWeekdaysNone} label="Niets" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-stone-800">
          Tijden (60 min)
        </label>

        <div className="mt-3 grid grid-cols-6 gap-2">
          {TIMES.map((t) => {
            const isSelected = selectedTimes.has(t);
            const isPast = disablePastTimesToday && isPastTimeForToday(t);

            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTime(t)}
                aria-pressed={isSelected}
                disabled={isPast}
                className={[
                  "flex items-center justify-between rounded-xl border px-2 py-1 text-xs font-medium transition focus:outline-none focus:ring-2",
                  isSelected
                    ? "border-emerald-600 bg-emerald-50 text-stone-900 focus:ring-emerald-500"
                    : "border-stone-300 bg-white text-stone-900 hover:bg-stone-50 focus:ring-stone-400",
                  isPast ? "cursor-not-allowed opacity-50" : "",
                ].join(" ")}
                title={isPast ? "Tijd is al verstreken" : undefined}
              >
                <span>{t}</span>

                {isSelected && !isPast && (
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white"
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 10l3 3 7-7" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <MiniGhost onClick={setTimesAll} label="Alles" />
          <MiniGhost onClick={setTimesDay} label="Overdag 10–16" />
          <MiniGhost onClick={setTimesEvening} label="Avond 17–20" />
          <MiniGhost onClick={setTimesNone} label="Niets" />
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={[
              "inline-flex items-center rounded-full px-2.5 py-1 font-medium ring-1",
              validation.ok
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-amber-50 text-amber-700 ring-amber-200",
            ].join(" ")}
          >
            {validation.ok ? `Schatting: ${estimateCount} tijdsloten` : "Onvolledige selectie"}
          </span>

          {msg && (
            <span
              className={[
                "ml-1 text-sm",
                msgKind === "success"
                  ? "text-green-700"
                  : msgKind === "info"
                    ? "text-stone-700"
                    : "text-red-700",
              ].join(" ")}
              role="status"
              aria-live="polite"
            >
              {msg}
            </span>
          )}
        </div>

        <button
          onClick={submit}
          disabled={submitDisabled}
          className="rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-semibold text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700 disabled:opacity-60"
        >
          {loading ? "Bezig…" : "Reeks publiceren"}
        </button>
      </div>
    </div>
  );
}

/* ========================================================================
   Kleine UI helpers
========================================================================= */
function PresetButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-300"
    >
      {label}
    </button>
  );
}

function MiniGhost({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-300"
    >
      {label}
    </button>
  );
}

/* ========================================================================
   DayLists
========================================================================= */
function DayLists({
  partnerSlug,
  dayISO,
  onChanged,
}: {
  partnerSlug: string;
  dayISO: string;
  onChanged: () => void;
}) {
  const router = useRouter();

  const [items, setItems] = React.useState<DayItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [nowMs, setNowMs] = React.useState(Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  function generateSchedule(day: string) {
    const out: string[] = [];

    for (let h = 9; h <= 20; h++) {
      out.push(zonedDateFromAmsterdamLocal(day, `${pad2(h)}:00`).toISOString());
    }

    return out;
  }

  function agendaHrefForDay(day: string) {
    if (typeof window !== "undefined") {
      const p = window.location.pathname || "";
      const base = p.includes("/admin") ? "/admin/agenda" : "/partner/agenda";
      return `${base}?scope=day&date=${encodeURIComponent(day)}#day`;
    }

    return `/admin/agenda?scope=day&date=${encodeURIComponent(day)}#day`;
  }

  async function load() {
    if (!partnerSlug) {
      setItems([]);
      setMsg("Kies eerst een partner om de daglijst te zien.");
      return;
    }

    setMsg(null);
    setLoading(true);

    try {
      const u = `/api/slots/${encodeURIComponent(
        partnerSlug
      )}/list?scope=day&day=${encodeURIComponent(dayISO)}`;

      const r = await fetch(u, {
        cache: "no-store",
        credentials: "include",
      });

      if (!r.ok) throw new Error(await r.text());

      const j = await r.json();

      const existing = new Map<string, DayItem>();
      const rows: any[] = Array.isArray(j?.items)
        ? j.items
        : Array.isArray(j?.slots)
          ? j.slots
          : [];

      function toMinuteISO(x: any) {
        const d = new Date(typeof x === "string" ? x : x);
        d.setSeconds(0, 0);
        return d.toISOString();
      }

      for (const s of rows) {
        const rawStart = s?.startTime ?? s?.startsAt ?? s?.start ?? s?.time ?? null;
        if (!rawStart) continue;

        const startISO = toMinuteISO(rawStart);
        const endISO = s?.endTime ? toMinuteISO(s.endTime) : undefined;

        const hasConfirmed =
          Boolean(s?.hasConfirmedBooking) ||
          (Array.isArray(s?.bookings) && s.bookings.length > 0);

        const status: DayItem["status"] = hasConfirmed
          ? "BOOKED"
          : ((s?.status as DayItem["status"]) ?? "DRAFT");

        existing.set(startISO, {
          id: s?.id ?? null,
          startTime: startISO,
          endTime: endISO,
          status,
          virtual: Boolean(s?.virtual) || s?.id == null,
          capacity: s?.capacity,
          maxPlayers: s?.maxPlayers,
        });
      }

      const schedule = generateSchedule(dayISO);

      const merged: DayItem[] = schedule.map(
        (iso) =>
          existing.get(iso) ?? {
            id: null,
            startTime: iso,
            status: "DRAFT",
            virtual: true,
          }
      );

      merged.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setItems(merged);
    } catch (e) {
      console.error("DayLists load error:", e);
      setItems([]);
      setMsg("Kon de tijdsloten niet laden.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerSlug, dayISO]);

  const drafts = items
    .filter((i) => i.status === "DRAFT")
    .filter((i) => new Date(i.startTime).getTime() > nowMs);

  const published = items.filter((i) => i.status === "PUBLISHED");
  const booked = items.filter((i) => i.status === "BOOKED");

  async function publishSingle(draft: DayItem) {
    if (loading) return;

    setLoading(true);

    try {
      const r = await fetch(`/api/slots/${encodeURIComponent(partnerSlug)}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ startTimeISO: draft.startTime }),
      });

      if (!r.ok) throw new Error(await r.text());
    } finally {
      await load();
      onChanged();
    }
  }

  async function unpublishSingle(id: string) {
    if (loading) return;

    setLoading(true);

    try {
      const r = await fetch(`/api/slots/${encodeURIComponent(partnerSlug)}/unpublish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slotId: id }),
      });

      if (!r.ok) throw new Error(await r.text());
    } finally {
      await load();
      onChanged();
    }
  }

  const timeTextCls = "truncate whitespace-nowrap [font-variant-numeric:tabular-nums] leading-tight";

  const pillBase =
    "group flex items-center justify-between rounded-xl border px-2 py-2 text-xs font-medium transition min-h-9";

  return (
    <>
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <h3 className="text-lg font-extrabold leading-tight">
          ✅ Beschikbare tijdsloten — {fmtDayLongNL(dayISO)}
        </h3>

        <p className="mb-3 mt-0.5 text-xs text-stone-600">
          <span className="font-medium">Eén klik = toevoegen</span> publiceren.
        </p>

        {msg && <p className="mb-2 text-sm text-stone-600">{msg}</p>}

        {loading ? (
          <p className="text-sm text-stone-500">Laden…</p>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-stone-500">Geen beschikbare tijdsloten meer.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {drafts.map((s) => (
              <button
                key={`d-${s.startTime}`}
                type="button"
                onClick={() => publishSingle(s)}
                disabled={loading}
                title="Publiceer dit tijdslot"
                aria-label={`Publiceer tijdslot ${fmtTimeAmsterdam(s.startTime)}`}
                className={[
                  pillBase,
                  "border-orange-300 bg-orange-50 text-stone-900",
                  "hover:border-orange-400 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-300",
                  loading ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                ].join(" ")}
              >
                <span className={timeTextCls}>{fmtTimeAmsterdam(s.startTime)}</span>

                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4 shrink-0 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M5 10l3 3 7-7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <h3 className="text-lg font-extrabold leading-tight">
          📌 Boekbare &amp; Geboekte tijdsloten — {fmtDayLongNL(dayISO)}
        </h3>

        <p className="mb-3 mt-0.5 text-xs text-stone-600">
          <span className="font-medium">Eén klik = verwijderen</span> depublish.
        </p>

        {loading && <p className="text-sm text-stone-500">Laden…</p>}

        {published.length > 0 ? (
          <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {published.map((s) => (
              <button
                key={s.id!}
                type="button"
                onClick={() => unpublishSingle(s.id!)}
                disabled={loading}
                title="Verwijder dit tijdslot"
                aria-label={`Verwijder tijdslot ${fmtTimeAmsterdam(s.startTime)}`}
                className={[
                  pillBase,
                  "border-emerald-200 bg-emerald-50 text-stone-900",
                  "hover:border-emerald-400 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300",
                  loading ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                ].join(" ")}
              >
                <span className={timeTextCls}>{fmtTimeAmsterdam(s.startTime)}</span>

                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4 shrink-0 text-rose-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M6 6l8 8M14 6l-8 8" />
                </svg>
              </button>
            ))}
          </div>
        ) : (
          !loading && (
            <p className="mb-4 text-sm text-stone-500">
              Je hebt nog geen tijdsloten gepubliceerd.
            </p>
          )
        )}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {booked.map((s) => (
            <div
              key={`b-${s.id ?? s.startTime}`}
              className="flex min-h-9 items-center justify-between rounded-xl border border-purple-200 bg-purple-50 px-2 py-2 text-xs font-medium text-stone-900 opacity-90"
              title="Geboekt"
              aria-label={`Geboekt: ${fmtTimeAmsterdam(s.startTime)}`}
            >
              <button
                type="button"
                onClick={() => router.push(agendaHrefForDay(dayISO))}
                className={[
                  timeTextCls,
                  "flex items-center gap-1 rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300",
                ].join(" ")}
                title="Open deze dag in de agenda"
                aria-label={`Open agenda voor ${fmtDayLongNL(dayISO)} om ${fmtTimeAmsterdam(s.startTime)}`}
              >
                <span aria-hidden>🕒</span>
                <span>{fmtTimeAmsterdam(s.startTime)}</span>
              </button>
            </div>
          ))}

          {!loading && booked.length === 0 && (
            <div className="col-span-3 text-sm text-stone-500 sm:col-span-6">
              Nog geen boekingen op deze dag.
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ========================================================================
   BulkPublished
========================================================================= */
function BulkPublished({
  partnerSlug,
  monthISO,
  onChanged,
}: {
  partnerSlug: string;
  monthISO: string;
  onChanged: () => void;
}) {
  type Row = {
    id: string;
    startTime: string;
    dayISO: string;
  };

  const [rows, setRows] = React.useState<Row[]>([]);
  const [sel, setSel] = React.useState<string[]>([]);
  const [selHistory, setSelHistory] = React.useState<string[][]>([]);
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");

  const NL_DAYS = ["zo", "ma", "di", "wo", "do", "vr", "za"] as const;
  const [days, setDays] = React.useState<Set<number>>(new Set());

  const daysKey = React.useMemo(
    () => Array.from(days).sort((x, y) => x - y).join(","),
    [days]
  );

  function getMonthsBetweenInclusive(fromISO: string, toISO: string) {
    const start = parseYMDLocal(fromISO);
    const end = parseYMDLocal(toISO);

    const months: string[] = [];
    const d = new Date(start.getFullYear(), start.getMonth(), 1);

    while (d <= end) {
      months.push(fmtMonthISO(d));
      d.setMonth(d.getMonth() + 1, 1);
    }

    return months;
  }

  function isWithinRange(dayISO: string, fromISO: string, toISO: string) {
    if (!fromISO && !toISO) return true;

    const d = parseYMDLocal(dayISO);

    if (fromISO && d < parseYMDLocal(fromISO)) return false;
    if (toISO && d > parseYMDLocal(toISO)) return false;

    return true;
  }

  function matchDayFilter(dayISO: string) {
    if (days.size === 0) return true;
    return days.has(parseYMDLocal(dayISO).getDay());
  }

  React.useEffect(() => {
    const today = new Date();
    const eoy = new Date(today.getFullYear(), 11, 31);

    setFromDate((prev) => prev || toYMDLocal(today));
    setToDate((prev) => prev || toYMDLocal(eoy));
  }, [monthISO]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadByRange() {
      if (!partnerSlug || !fromDate || !toDate) {
        if (!cancelled) setRows([]);
        return;
      }

      const months = getMonthsBetweenInclusive(fromDate, toDate);
      const dayCandidates = new Set<string>();

      for (const mi of months) {
        const url = `/api/slots/${encodeURIComponent(
          partnerSlug
        )}/list?scope=month&month=${encodeURIComponent(mi)}`;

        const r = await fetch(url, {
          cache: "no-store",
          credentials: "include",
        });

        if (!r.ok) continue;

        const j = await r.json();

        let daysAgg: Array<{ date: string; publishedCount: number }> = [];

        if (Array.isArray(j.publishedDays)) {
          daysAgg = j.publishedDays;
        } else if (Array.isArray(j.days)) {
          daysAgg = j.days.map((d: any) => {
            const date = d.day ?? d.date;

            const publishedCount =
              typeof d.PUBLISHED === "number"
                ? d.PUBLISHED
                : typeof d.publishedCount === "number"
                  ? d.publishedCount
                  : 0;

            return { date, publishedCount };
          });
        }

        for (const d of daysAgg) {
          if (!d?.date) continue;

          if (
            d.publishedCount > 0 &&
            isWithinRange(d.date, fromDate, toDate) &&
            matchDayFilter(d.date)
          ) {
            dayCandidates.add(d.date);
          }
        }
      }

      const collected: Row[] = [];

      for (const dayISO of dayCandidates) {
        const du = `/api/slots/${encodeURIComponent(
          partnerSlug
        )}/list?scope=day&day=${encodeURIComponent(dayISO)}`;

        const rd = await fetch(du, {
          cache: "no-store",
          credentials: "include",
        });

        if (!rd.ok) continue;

        const dj = await rd.json();

        const source: any[] = Array.isArray(dj?.items)
          ? dj.items
          : Array.isArray(dj?.slots)
            ? dj.slots
            : [];

        for (const s of source) {
          const id = s?.id ?? null;
          const startTime =
            typeof s?.startTime === "string"
              ? s.startTime
              : s?.startTime
                ? new Date(s.startTime).toISOString()
                : "";

          const status = (s?.status as DayItem["status"]) ?? "DRAFT";

          if (id && startTime && status === "PUBLISHED") {
            collected.push({
              id,
              startTime,
              dayISO,
            });
          }
        }
      }

      if (!cancelled) {
        collected.sort((a, b) =>
          `${a.dayISO}-${a.startTime}`.localeCompare(`${b.dayISO}-${b.startTime}`)
        );

        setRows(collected);
        setSel([]);
        setSelHistory([]);
      }
    }

    loadByRange();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerSlug, fromDate, toDate, daysKey]);

  function pushHistory(prev: string[]) {
    setSelHistory((h) => [...h.slice(-19), prev]);
  }

  function setChecked(id: string, checked: boolean) {
    setSel((prev) => {
      const next = checked
        ? prev.includes(id)
          ? prev
          : [...prev, id]
        : prev.filter((x) => x !== id);

      if (next !== prev) pushHistory(prev);

      return next;
    });
  }

  const filtered = React.useMemo(
    () =>
      rows
        .filter((r) => isWithinRange(r.dayISO, fromDate, toDate))
        .filter((r) => matchDayFilter(r.dayISO)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, fromDate, toDate, daysKey]
  );

  const filteredIds = React.useMemo(() => filtered.map((r) => r.id), [filtered]);
  const hasSelection = sel.length > 0;
  const canUndo = selHistory.length > 0;

  async function removeSelected() {
    if (!sel.length) return;

    const r = await fetch(`/api/slots/${encodeURIComponent(partnerSlug)}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids: sel }),
    });

    if (r.ok) {
      setRows((prev) => prev.filter((x) => !sel.includes(x.id)));
      setSel([]);
      setSelHistory([]);
      onChanged();
    }
  }

  async function removeOne(id: string) {
    const r = await fetch(`/api/slots/${encodeURIComponent(partnerSlug)}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids: [id] }),
    });

    if (r.ok) {
      setRows((prev) => prev.filter((x) => x.id !== id));
      setSel((prev) => prev.filter((x) => x !== id));
      onChanged();
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-extrabold">🛠️ Tijdsloten beheren</h3>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSel(filteredIds)}
            disabled={filteredIds.length === 0}
            className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
          >
            Selecteer alle
          </button>

          <button
            onClick={() => {
              if (!hasSelection) return;
              setSelHistory((h) => [...h, sel]);
              setSel([]);
            }}
            disabled={!hasSelection}
            className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
          >
            Wis selectie
          </button>

          <button
            onClick={() =>
              setSelHistory((h) => {
                if (h.length === 0) return h;
                const prev = h[h.length - 1];
                setSel(prev);
                return h.slice(0, -1);
              })
            }
            disabled={!canUndo}
            className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
          >
            Maak selectie ongedaan
          </button>

          <button
            onClick={removeSelected}
            disabled={!hasSelection}
            className="rounded-xl border border-rose-500 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-50"
          >
            Verwijder geselecteerde
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 p-2">
          <div className="mb-1 text-xs font-semibold text-stone-700">
            Agenda van–tot
          </div>

          <div className="flex items-center gap-2">
            <input
              aria-label="Vanaf datum"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
            />

            <span className="text-stone-400">–</span>

            <input
              aria-label="Tot en met datum"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
            />
          </div>

          <p className="mt-1 text-[11px] leading-4 text-stone-500">
            Standaard: vandaag t/m eind van dit jaar.
          </p>
        </div>

        <div className="rounded-lg border border-stone-200 p-2">
          <div className="mb-1 text-xs font-semibold text-stone-700">Dagen</div>

          <div className="grid grid-cols-7 gap-1.5">
            {NL_DAYS.map((lbl, dow) => {
              const active = days.has(dow);

              return (
                <label
                  key={dow}
                  className={[
                    "cursor-pointer rounded-md px-2 py-1 text-center text-sm ring-1 transition",
                    active
                      ? "bg-emerald-50 font-semibold text-stone-900 ring-emerald-300"
                      : "bg-white text-stone-700 ring-stone-300",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={active}
                    onChange={(e) => {
                      setDays((prev) => {
                        const n = new Set(prev);
                        e.target.checked ? n.add(dow) : n.delete(dow);
                        return n;
                      });
                    }}
                  />

                  {lbl}
                </label>
              );
            })}
          </div>

          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setDays(new Set())}
              className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
            >
              Alles tonen
            </button>
          </div>
        </div>

        <div className="hidden md:block" />
      </div>

      <ul className="space-y-2">
        {filtered.length > 0 && (
          <li className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
            <input
              type="checkbox"
              aria-label="Selecteer alle zichtbare tijdsloten"
              className="h-4 w-4 rounded border-stone-300"
              checked={filtered.every((f) => sel.includes(f.id))}
              onChange={(e) => {
                if (e.target.checked) {
                  setSel(filtered.map((f) => f.id));
                } else {
                  setSelHistory((h) => [...h, sel]);
                  setSel([]);
                }
              }}
            />

            <span className="text-sm text-stone-800">
              {filtered.every((f) => sel.includes(f.id))
                ? "Alle zichtbare tijdsloten geselecteerd"
                : "Selecteer alle zichtbare tijdsloten"}
            </span>
          </li>
        )}

        {filtered.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                aria-label={`Selecteer ${fmtSlotNL(r.dayISO, r.startTime)}`}
                className="h-4 w-4 rounded border-stone-300"
                checked={sel.includes(r.id)}
                onChange={(e) => setChecked(r.id, e.target.checked)}
              />

              <span className="font-medium text-stone-900">
                {fmtSlotNL(r.dayISO, r.startTime)}
              </span>
            </div>

            <button
              onClick={() => removeOne(r.id)}
              className="rounded-lg border border-red-300 bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
            >
              Verwijderen
            </button>
          </li>
        ))}

        {filtered.length === 0 && (
          <li className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
            Geen resultaten voor de huidige filters.
          </li>
        )}
      </ul>
    </section>
  );
}