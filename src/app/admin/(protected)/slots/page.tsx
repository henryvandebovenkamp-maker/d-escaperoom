"use client";

import * as React from "react";

/* ================================
   Helpers
   ================================ */
const nlDays = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const nlMonths = [
  "januari","februari","maart","april","mei","juni",
  "juli","augustus","september","oktober","november","december"
];

function nowMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ================================
   Top-level pagina
   ================================ */
export default function SlotsOnePage() {
  const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const urlPartner = sp?.get("partner") ?? "";

  const [partners, setPartners] = React.useState<Array<{id:string;name:string;slug:string;city:string|null}>>([]);
  const [partnerSlug, setPartnerSlug] = React.useState<string>(urlPartner);
  const [monthISO, setMonthISO] = React.useState(nowMonthISO());
  const [selectedDay, setSelectedDay] = React.useState(todayISO());
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/partners/list", { cache: "no-store", credentials: "include" });
        if (!r.ok) return;
        const rows = await r.json();
        setPartners(rows);
        if (!partnerSlug && rows[0]?.slug) {
          setPartnerSlug(rows[0].slug);
        }
      } catch {/* ignore */}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthDate = new Date(`${monthISO}-01T00:00:00`);
  const monthTitle = `${nlMonths[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-400" />
              Tijdsloten beheren
            </span>
          </h1>

          <div className="flex items-center gap-2">
            {partners.length > 0 ? (
              <select
                className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                value={partnerSlug}
                onChange={(e) => { setPartnerSlug(e.target.value); setSelectedDay(todayISO()); setRefreshKey(k=>k+1); }}
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name} {p.city ? `— ${p.city}` : ""}
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
                  onClick={() => setRefreshKey(k=>k+1)}
                  className="hidden sm:inline-flex rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700"
                >
                  Laden
                </button>
              </div>
            )}

            <a
              href="/admin"
              className="hidden sm:inline-flex rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700"
            >
              Dashboard
            </a>
          </div>
        </div>

        {/* BOVEN: Agenda (links) + Reeks toevoegen (rechts) */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Agenda */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">📅 Agenda — {monthTitle}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const [y, m] = monthISO.split("-").map(Number);
                    const prev = new Date(y, m - 2, 1);
                    setMonthISO(`${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,"0")}`);
                  }}
                  className="rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700"
                >
                  Vorige
                </button>
                <button
                  onClick={() => {
                    const [y, m] = monthISO.split("-").map(Number);
                    const next = new Date(y, m, 1);
                    setMonthISO(`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}`);
                  }}
                  className="rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700"
                >
                  Volgende
                </button>
              </div>
            </div>

            <CalendarMonthInline
              key={partnerSlug + monthISO + "#" + refreshKey}
              partnerSlug={partnerSlug}
              monthISO={monthISO}
              selectedDay={selectedDay}
              onSelectDay={(d) => { setSelectedDay(d); setRefreshKey(k=>k+1); }}
            />
          </div>

          {/* Reeks toevoegen */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <h2 className="mb-3 text-xl font-extrabold">➕ Reeks toevoegen</h2>
            <SeriesFormInline partnerSlug={partnerSlug} onDone={() => setRefreshKey(k=>k+1)} />
          </div>
        </div>

        {/* MIDDEN: Links ORANJE — Rechts GROEN/PAARS */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <DayListsInline
            key={partnerSlug + selectedDay + refreshKey}
            partnerSlug={partnerSlug}
            dayISO={selectedDay}
            onChanged={() => setRefreshKey(k=>k+1)}
          />
        </div>

        {/* ONDER: Bulkbeheer GROEN (optioneel) */}
        <div className="mt-6">
          <BulkPublishedInline
            key={partnerSlug + monthISO + refreshKey}
            partnerSlug={partnerSlug}
            monthISO={monthISO}
            onChanged={() => setRefreshKey(k=>k+1)}
          />
        </div>
      </div>
    </div>
  );
}

/* ================================
   CalendarMonth — TZ-safe + stacked indicators
   ================================ */
type ApiDay = {
  date: string; // "YYYY-MM-DD"
  draftCount?: number;
  publishedCount?: number;
  bookedCount?: number;
  hasDraft?: boolean;
  hasPublished?: boolean;
  hasBooked?: boolean;
  capacityPerDay?: number;
};

type Cell = { dateISO?: string; day?: number; data?: ApiDay };

function CalendarMonthInline({
  partnerSlug, monthISO, selectedDay, onSelectDay,
}: {
  partnerSlug: string;
  monthISO: string;
  selectedDay: string;
  onSelectDay: (d: string) => void;
}) {
  const [days, setDays] = React.useState<ApiDay[]>([]);
  const [baseCap, setBaseCap] = React.useState<number>(12);
  const [loading, setLoading] = React.useState(false);

  // ✅ Nieuw: "vandaag" als YYYY-MM-DD
  const todayISO = React.useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  React.useEffect(() => {
    (async () => {
      if (!partnerSlug) { setDays([]); return; }
      setLoading(true);
      try {
        const url = `/api/slots/${encodeURIComponent(partnerSlug)}/list?scope=month&month=${encodeURIComponent(monthISO)}`;
        const r = await fetch(url, { cache: "no-store", credentials: "include" });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();

        const mapped: ApiDay[] = Array.isArray(j?.days)
          ? j.days.map((d: any) => {
              const date = d.day ?? d.date;
              const draftCount =
                typeof d.DRAFT === "number" ? d.DRAFT :
                typeof d.draftCount === "number" ? d.draftCount : 0;
              const publishedCount =
                typeof d.PUBLISHED === "number" ? d.PUBLISHED :
                typeof d.publishedCount === "number" ? d.publishedCount : 0;
              const bookedCount =
                typeof d.BOOKED === "number" ? d.BOOKED :
                typeof d.bookedCount === "number" ? d.bookedCount : 0;

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

        setDays(mapped);
        setBaseCap(Number(j?.base ?? 12));
      } catch (e) {
        console.error("CalendarMonth load error:", e);
        setDays([]);
        setBaseCap(12);
      } finally {
        setLoading(false);
      }
    })();
  }, [partnerSlug, monthISO]);

  const byDate = React.useMemo(() => {
    const m = new Map<string, ApiDay>();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  // UTC-safe grid (maandag-start)
  const first = new Date(`${monthISO}-01T00:00:00Z`);
  const Y = first.getUTCFullYear();
  const M = first.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate();
  const startWeekday = (first.getUTCDay() + 6) % 7; // 0=ma .. 6=zo

  const cells: Cell[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({});
  for (let d = 1; d <= daysInMonth; d++) {
    const dateISO = `${monthISO}-${String(d).padStart(2, "0")}`;
    cells.push({ dateISO, day: d, data: byDate.get(dateISO) });
  }
  while (cells.length % 7 !== 0) cells.push({});

  function deriveCounts(d?: ApiDay) {
    const cap = Math.max(0, d?.capacityPerDay ?? baseCap ?? 12);
    const G = Math.max(0, d?.publishedCount ?? 0);
    const P = Math.max(0, d?.bookedCount ?? 0);
    const O = Math.max(0, d?.draftCount ?? (cap - (G + P)));
    return { O, G, P, cap };
  }

  const Dot = ({ className }: { className: string }) => (
    <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${className}`} />
  );

  return (
    <div>
      {/* weekkop */}
      <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-stone-500">
        {nlDays.map((d) => <div key={d}>{d}</div>)}
      </div>

      {/* maandraster */}
      <div className="grid grid-cols-7 gap-2">
        {cells.map((c, i) => {
          if (!c.dateISO) return <div key={i} className="invisible h-24 rounded-2xl border" />;
          const isSelected = c.dateISO === selectedDay;
          const isPast = c.dateISO < todayISO; // ✅ nieuw
          const { O, G, P, cap } = deriveCounts(c.data);

          return (
            <button
              key={c.dateISO}
              onClick={() => { if (!isPast) onSelectDay(c.dateISO!); }} // ✅ geen effect op verleden
              disabled={isPast}                                         // ✅ blokkeer interactie
              aria-label={
                isPast
                  ? `Dag ${c.dateISO} (verleden, niet selecteerbaar).`
                  : `Selecteer ${c.dateISO}. Oranje ${O} van ${cap}, groen ${G}, paars ${P}.`
              }
              className={[
                "relative h-24 rounded-2xl p-2 text-left border bg-white",
                "border-stone-200 shadow-sm transition",
                isPast
                  ? "opacity-50 text-stone-400 cursor-default pointer-events-none" // ✅ lichter + geen hover
                  : "cursor-pointer hover:bg-stone-50 hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-safe:transition-transform",
                isSelected && !isPast ? "ring-2 ring-pink-500 ring-offset-2" : "",
              ].join(" ")}
            >
              <div className="absolute right-2 top-2 text-sm font-extrabold text-stone-600">
                {c.day}
              </div>

              <div className="absolute left-2 bottom-2 flex flex-col items-start gap-1 text-[11px] leading-none text-stone-700 tabular-nums">
                <div title={`Oranje (beschikbaar, basis ${cap}): ${O}`} className="flex items-center gap-1">
                  <Dot className="bg-orange-500" />
                  <span>{O}</span>
                </div>
                <div title={`Groen (gepubliceerd): ${G}`} className="flex items-center gap-1">
                  <Dot className="bg-emerald-600" />
                  <span>{G}</span>
                </div>
                <div title={`Paars (geboekt): ${P}`} className="flex items-center gap-1">
                  <Dot className="bg-purple-600" />
                  <span>{P}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {loading && <p className="mt-2 text-xs text-stone-500">Agenda laden…</p>}

      {/* legenda */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-stone-700">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" /> Oranje (beschikbaar, basis {baseCap})
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-600" /> Groen (boekbaar)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-purple-600" /> Paars (geboekt)
        </span>
      </div>
    </div>
  );
}


/* ================================
   SeriesForm — reeks toevoegen
   ================================ */
function SeriesFormInline({
  partnerSlug, onDone,
}: { partnerSlug: string; onDone?: () => void }) {
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [msgKind, setMsgKind] = React.useState<"success"|"error"|"info">("info");

  const NL_DAYS = ["ma","di","wo","do","vr","za","zo"] as const;
  const jsDayOrder = [1,2,3,4,5,6,0];
  const [weekdays, setWeekdays] = React.useState<Set<number>>(new Set());

  const TIMES_12 = [
    "09:00","10:00","11:00","12:00",
    "13:00","14:00","15:00","16:00",
    "17:00","18:00","19:00","20:00",
  ] as const;

  const [selectedTimes, setSelectedTimes] = React.useState<Set<string>>(new Set());
  function toggleSelect(time: string) {
    setSelectedTimes(prev => {
      const next = new Set(prev);
      next.has(time) ? next.delete(time) : next.add(time);
      return next;
    });
  }

  function toYMD(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  React.useEffect(() => {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStart(toYMD(now));
    setEnd(toYMD(last));
  }, []);

  function toggleWeekday(jsDay: number) {
    setWeekdays(p => { const n = new Set(p); n.has(jsDay) ? n.delete(jsDay) : n.add(jsDay); return n; });
  }

  async function submit() {
    if (!partnerSlug) { setMsgKind("error"); setMsg("Geen partner geselecteerd."); return; }
    if (!start || !end) { setMsgKind("error"); setMsg("Kies een start- en einddatum."); return; }
    if (new Date(start) > new Date(end)) { setMsgKind("error"); setMsg("Einddatum moet na startdatum liggen."); return; }
    if (weekdays.size === 0) { setMsgKind("error"); setMsg("Kies minimaal één weekdag."); return; }
    if (selectedTimes.size === 0) { setMsgKind("error"); setMsg("Kies minimaal één tijd."); return; }

    setLoading(true); setMsg(null);
    try {
      const r = await fetch(`/api/slots/${encodeURIComponent(partnerSlug)}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          startDate: start,
          endDate: end,
          publish: true,
          weekdays: Array.from(weekdays),
          times: Array.from(selectedTimes),
        }),
      });

      let data: any = null;
      let rawText = "";
      const isJson = r.headers.get("content-type")?.includes("application/json");
      try { data = isJson ? await r.json() : null; } catch { try { rawText = await r.text(); } catch {} }

      if (!r.ok) {
        const errStr = (data?.error || data?.message || rawText || "").toLowerCase();
        if (r.status === 409 ||
            errStr.includes("duplicate") ||
            errStr.includes("unique") ||
            errStr.includes("p2002") ||
            errStr.includes("already exists") ||
            errStr.includes("bestaat al")) {
          setMsgKind("error");
          setMsg("Dubbele tijdsloten gevonden, kan de rest niet toevoegen.");
        } else {
          setMsgKind("error");
          setMsg(data?.error || data?.message || rawText || "Fout bij aanmaken reeks.");
        }
        setLoading(false);
        return;
      }

      if (data && (typeof data.skippedDuplicates === "number")) {
        const created = typeof data.created === "number" ? data.created : undefined;
        const skipped = data.skippedDuplicates as number;
        if (skipped > 0) {
          setMsgKind("info");
          setMsg(`Deels gepubliceerd: ${created ?? "een deel"} aangemaakt, ${skipped} overgeslagen (bestonden al).`);
          setLoading(false);
          onDone?.();
          return;
        }
      }

      setMsgKind("success");
      setMsg("Reeks gepubliceerd ✔️");
      setLoading(false);
      onDone?.();
    } catch (e: any) {
      setLoading(false);
      setMsgKind("error");
      setMsg(e?.message || "Onbekende fout.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Periode */}
      <div>
        <label className="block text-sm font-semibold text-stone-800">Periode</label>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <span className="block text-xs text-stone-700">Startdatum</span>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
              value={start}
              onChange={(e)=>setStart(e.target.value)}
            />
          </div>
          <div>
            <span className="block text-xs text-stone-700">Einddatum</span>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
              value={end}
              onChange={(e)=>setEnd(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Weekdagen */}
      <div>
        <label className="block text-sm font-semibold text-stone-800">Dagen van de week</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {NL_DAYS.map((label, i) => {
            const jsDay = jsDayOrder[i];
            const active = weekdays.has(jsDay);
            return (
              <button
                key={label}
                type="button"
                onClick={()=>toggleWeekday(jsDay)}
                className={[
                  "rounded-2xl px-3 py-1.5 text-sm font-medium border transition focus:outline-none focus:ring-2",
                  active
                    ? "border-green-600 bg-green-600 text-white shadow focus:ring-green-500"
                    : "border-stone-300 bg-white text-stone-900 hover:bg-stone-50 focus:ring-stone-400",
                ].join(" ")}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tijden */}
      <div>
        <label className="block text-sm font-semibold text-stone-800">Tijden (60 min)</label>
        <div className="mt-3 grid grid-cols-6 gap-2">
          {TIMES_12.map(t => {
            const isSelected = selectedTimes.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleSelect(t)}
                aria-pressed={isSelected}
                className={[
                  "flex items-center justify-between rounded-xl border px-2 py-1 text-xs font-medium transition",
                  "focus:outline-none focus:ring-2",
                  isSelected
                    ? "border-green-600 bg-green-50 text-stone-900 focus:ring-green-500"
                    : "border-stone-300 bg-white text-stone-900 hover:bg-stone-50 focus:ring-stone-400",
                ].join(" ")}
              >
                <span>{t}</span>
                {isSelected && (
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-white"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 10l3 3 7-7" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit + melding */}
      <div className="pt-2">
        <button
          onClick={submit}
          disabled={loading}
          className="rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700 disabled:opacity-60"
        >
          {loading ? "Bezig…" : "Reeks toevoegen (publiceren)"}
        </button>

        {msg && (
          <p
            className={[
              "mt-2 text-sm",
              msgKind === "success" ? "text-green-700" :
              msgKind === "error"   ? "text-red-700"   :
                                      "text-stone-700",
            ].join(" ")}
            role="status"
            aria-live="polite"
          >
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}

/* ================================
   DayLists — links DRAFT, rechts PUBLISHED/BOOKED
   ================================ */
type DayItem = {
  id: string | null; // null = virtueel (DRAFT)
  status: "DRAFT" | "PUBLISHED" | "BOOKED";
  startTime: string;        // ISO
  endTime?: string;         // ISO
  virtual?: boolean;        // alleen bij DRAFT
  capacity?: number;
  maxPlayers?: number;
};

function DayListsInline({
  partnerSlug,
  dayISO,
  onChanged,
}: {
  partnerSlug: string;
  dayISO: string;
  onChanged: () => void;
}) {
  const [items, setItems] = React.useState<DayItem[]>([]);
  const [counts, setCounts] = React.useState<{ DRAFT: number; PUBLISHED: number; BOOKED: number }>({ DRAFT: 0, PUBLISHED: 0, BOOKED: 0 });
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  function dateFromISOLocal(iso: string) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function fmtSelectedDayNL(iso: string) {
    const d = dateFromISOLocal(iso);
    const days = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
    const monthsShort = ["jan","feb","mrt","apr","mei","jun","jul","aug","sept","okt","nov","dec"];
    return `${days[d.getDay()]} ${d.getDate()} ${monthsShort[d.getMonth()]}`;
  }
  function fmtTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  }

  async function load() {
    if (!partnerSlug) {
      setItems([]); setCounts({ DRAFT: 0, PUBLISHED: 0, BOOKED: 0 });
      setMsg("Kies eerst een partner om de daglijst te zien.");
      return;
    }
    setMsg(null);

    const u = `/api/slots/${encodeURIComponent(partnerSlug)}/list?scope=day&day=${encodeURIComponent(dayISO)}`;
    setLoading(true);
    try {
      const r = await fetch(u, { cache: "no-store", credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();

      // 1) j.slots → virtuele DRAFTs + real zonder BOOKED
      const fromSlots: DayItem[] = Array.isArray(j.slots)
        ? j.slots
            .filter(Boolean)
            .map((s: any) => ({
              id: s?.id ?? null,
              startTime:
                typeof s?.startTime === "string"
                  ? s.startTime
                  : s?.startTime
                    ? new Date(s.startTime).toISOString()
                    : "",
              endTime:
                typeof s?.endTime === "string"
                  ? s.endTime
                  : s?.endTime
                    ? new Date(s.endTime).toISOString()
                    : undefined,
              status: (s?.status as DayItem["status"]) ?? "DRAFT",
              virtual: Boolean(s?.virtual) || s?.id == null,
              capacity: s?.capacity,
              maxPlayers: s?.maxPlayers,
            }))
        : [];

      // 2) j.items → alle real incl. BOOKED: overschrijft/aanvult
      const fromItems: DayItem[] = Array.isArray(j.items)
        ? j.items
            .filter(Boolean)
            .map((s: any) => ({
              id: s?.id ?? null,
              startTime:
                typeof s?.startTime === "string"
                  ? s.startTime
                  : s?.startTime
                    ? new Date(s.startTime).toISOString()
                    : "",
              status: (s?.status as DayItem["status"]) ?? "DRAFT",
              virtual: false,
            }))
        : [];

      // 3) Merge op startTime (items > slots)
      const byKey = new Map<string, DayItem>();
      for (const it of fromSlots) {
        if (!it.startTime) continue;
        byKey.set(it.startTime, it);
      }
      for (const it of fromItems) {
        if (!it.startTime) continue;
        byKey.set(it.startTime, { ...byKey.get(it.startTime), ...it, virtual: false });
      }

      const merged = Array.from(byKey.values()).filter(it => !!it.startTime);
      merged.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

      // 4) Counts — gebruik server counts indien aanwezig
      const computed = j?.counts
        ? j.counts
        : {
            DRAFT: merged.filter(x => x.status === "DRAFT").length,
            PUBLISHED: merged.filter(x => x.status === "PUBLISHED").length,
            BOOKED: merged.filter(x => x.status === "BOOKED").length,
          };

      setItems(merged);
      setCounts(computed);
    } catch (e) {
      console.error("DayLists load error:", e);
      setItems([]);
      setCounts({ DRAFT: 0, PUBLISHED: 0, BOOKED: 0 });
      setMsg("Kon de tijdsloten niet laden.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerSlug, dayISO]);

  const drafts    = items.filter((i) => i.status === "DRAFT");
  const published = items.filter((i) => i.status === "PUBLISHED");
  const booked    = items.filter((i) => i.status === "BOOKED");

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

  return (
    <>
      {/* Links: DRAFTS (oranje) */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <h3 className="text-lg font-extrabold leading-tight">
          ✅ Beschikbare tijdsloten — {fmtSelectedDayNL(dayISO)}
        </h3>
        <p className="mb-3 mt-0.5 text-xs text-stone-600">
          <span className="font-medium">Eén klik = toevoegen</span> (publiceren). Oranje = nog beschikbaar.
        </p>

        {msg && <p className="mb-2 text-sm text-stone-600">{msg}</p>}

        {loading ? (
          <p className="text-sm text-stone-500">Laden…</p>
        ) : counts.DRAFT === 0 ? (
          <p className="text-sm text-stone-500">Gefeliciteerd, alles is gepubliceerd.</p>
        ) : (
          <div className="grid grid-cols-6 gap-2">
            {drafts.map((s) => (
              <button
                key={`d-${s.startTime}`}
                type="button"
                onClick={() => publishSingle(s)}
                disabled={loading}
                title="Publiceer dit tijdslot"
                aria-label={`Publiceer tijdslot ${fmtTime(s.startTime)}`}
                aria-disabled={loading}
                className={[
                  "group flex items-center justify-between rounded-xl border px-2 py-1 text-xs font-medium transition",
                  "border-orange-300 bg-orange-50 text-stone-900",
                  "hover:border-orange-400 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-300",
                  loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
              >
                <span className="truncate">{fmtTime(s.startTime)}</span>
                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4 shrink-0 text-green-600"
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
      </div>

      {/* Rechts: PUBLISHED + BOOKED */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <h3 className="text-lg font-extrabold leading-tight">
          📌 Boekbare &amp; Geboekte tijdsloten — {fmtSelectedDayNL(dayISO)}
        </h3>
        <p className="mb-3 mt-0.5 text-xs text-stone-600">
          <span className="font-medium">Eén klik = verwijderen</span> (depublish). Groen = boekbaar. Paars = geboekt.
        </p>

        {loading && <p className="text-sm text-stone-500">Laden…</p>}

        {/* Boekbare — 6 kolommen pill-tiles */}
        {published.length > 0 ? (
          <div className="mb-4 grid grid-cols-6 gap-2">
            {published.map((s) => (
              <button
                key={s.id!}
                type="button"
                onClick={() => unpublishSingle(s.id!)}
                disabled={loading}
                title="Verwijder dit tijdslot (depublish)"
                aria-label={`Verwijder tijdslot ${fmtTime(s.startTime)}`}
                aria-disabled={loading}
                className={[
                  "group flex items-center justify-between rounded-xl border px-2 py-1 text-xs font-medium transition",
                  "border-emerald-200 bg-emerald-50 text-stone-900",
                  "hover:border-emerald-400 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300",
                  loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
              >
                <span className="truncate">{fmtTime(s.startTime)}</span>
                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4 shrink-0 text-red-600"
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
          !loading && <p className="mb-4 text-sm text-stone-500">Je hebt nog geen tijdsloten gepubliceerd.</p>
        )}

        {/* Geboekte — 6 kolommen pill-tiles */}
        <div className="grid grid-cols-6 gap-2">
          {booked.map((s) => (
            <div
              key={`b-${s.id ?? s.startTime}`}
              className={[
                "flex items-center justify-between rounded-xl border px-2 py-1 text-xs font-medium",
                "border-purple-200 bg-purple-50 text-stone-900",
                "opacity-90 select-none",
              ].join(" ")}
              title="Geboekt"
              aria-label={`Geboekt: ${fmtTime(s.startTime)}`}
            >
              <span className="truncate">{fmtTime(s.startTime)}</span>
              <span aria-hidden className="sr-only">Geboekt</span>
            </div>
          ))}
          {!loading && booked.length === 0 && (
            <div className="col-span-6 text-sm text-stone-500">Nog geen boekingen op deze dag.</div>
          )}
        </div>
      </div>
    </>
  );
}

/* ================================
   Tijdsloten beheren — PUBLISHED met filters
   ================================ */
function BulkPublishedInline({
  partnerSlug,
  monthISO,
  onChanged,
}: {
  partnerSlug: string;
  monthISO: string;
  onChanged: () => void;
}) {
  type Row = { id: string; startTime: string; dayISO: string };

  const [rows, setRows] = React.useState<Row[]>([]);
  const [sel, setSel] = React.useState<string[]>([]);
  const [selHistory, setSelHistory] = React.useState<string[][]>([]);

  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  const NL_DAYS = ["zo","ma","di","wo","do","vr","za"] as const;

  const [days, setDays] = React.useState<Set<number>>(new Set<number>());
  const daysKey = React.useMemo(() => Array.from(days).sort((x,y)=>x-y).join(","), [days]);

  function parseISODate(s: string) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y as number, (m as number) - 1, d as number);
  }
  function fmtDate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  function fmtMonthISO(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  function getMonthsBetweenInclusive(fromISO: string, toISO: string) {
    const start = parseISODate(fromISO);
    const end = parseISODate(toISO);
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
    const d = parseISODate(dayISO);
    if (fromISO && d < parseISODate(fromISO)) return false;
    if (toISO && d > parseISODate(toISO)) return false;
    return true;
  }
  function matchDayFilter(dayISO: string) {
    if (days.size === 0) return true;
    const dow = parseISODate(dayISO).getDay();
    return days.has(dow);
  }
  function fmtSlotNL(_dayISO: string, startISO: string) {
    const d = new Date(startISO);
    const parts = new Intl.DateTimeFormat("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(d);
    const get = (type: string) => parts.find(p => p.type === type)?.value || "";
    const weekday = (get("weekday") || "").toLowerCase();
    const day = get("day");
    const month = (get("month") || "").toLowerCase();
    const hour = get("hour");
    const minute = get("minute");
    return `${weekday} ${day} ${month} ${hour}:${minute}`;
  }

  React.useEffect(() => {
    const today = new Date();
    const eoy = new Date(today.getFullYear(), 11, 31);
    setFromDate(prev => prev || fmtDate(today));
    setToDate(prev => prev || fmtDate(eoy));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const url = `/api/slots/${encodeURIComponent(partnerSlug)}/list?scope=month&month=${encodeURIComponent(mi)}`;
        const r = await fetch(url, { cache: "no-store", credentials: "include" });
        if (!r.ok) continue;
        const j = await r.json();

        let daysAgg: Array<{ date: string; publishedCount: number }> = [];
        if (Array.isArray(j.publishedDays)) {
          daysAgg = j.publishedDays;
        } else if (Array.isArray(j.days)) {
          daysAgg = j.days.map((d: any) => {
            const date = d.day ?? d.date;
            const publishedCount =
              typeof d.PUBLISHED === "number" ? d.PUBLISHED :
              typeof d.publishedCount === "number" ? d.publishedCount : 0;
            return { date, publishedCount };
          });
        }

        for (const d of daysAgg) {
          if (!d?.date) continue;
          if (d.publishedCount > 0 && isWithinRange(d.date, fromDate, toDate)) {
            if (matchDayFilter(d.date)) dayCandidates.add(d.date);
          }
        }
      }

      const collected: Row[] = [];
      for (const dayISO of dayCandidates) {
        const du = `/api/slots/${encodeURIComponent(partnerSlug)}/list?scope=day&day=${encodeURIComponent(dayISO)}`;
        const rd = await fetch(du, { cache: "no-store", credentials: "include" });
        if (!rd.ok) continue;
        const dj = await rd.json();

        // Zelfde merge als in DayLists: combineer items + slots
        const fromSlots: Array<{ id: string | null; startTime: string; status: "DRAFT" | "PUBLISHED" | "BOOKED" }> =
          Array.isArray(dj.slots)
            ? dj.slots.map((s: any) => ({
                id: s?.id ?? null,
                startTime: typeof s?.startTime === "string"
                  ? s.startTime
                  : s?.startTime ? new Date(s.startTime).toISOString() : "",
                status: (s?.status as any) ?? "DRAFT",
              }))
            : [];

        const fromItems: Array<{ id: string | null; startTime: string; status: "DRAFT" | "PUBLISHED" | "BOOKED" }> =
          Array.isArray(dj.items)
            ? dj.items.map((s: any) => ({
                id: s?.id ?? null,
                startTime: typeof s?.startTime === "string"
                  ? s.startTime
                  : s?.startTime ? new Date(s.startTime).toISOString() : "",
                status: (s?.status as any) ?? "DRAFT",
              }))
            : [];

        const byKey = new Map<string, any>();
        for (const it of fromSlots) if (it.startTime) byKey.set(it.startTime, it);
        for (const it of fromItems) if (it.startTime) byKey.set(it.startTime, { ...byKey.get(it.startTime), ...it });

        for (const it of Array.from(byKey.values())) {
          if (it && it.status === "PUBLISHED" && it.id && it.startTime) {
            collected.push({ id: it.id, startTime: it.startTime, dayISO });
          }
        }
      }

      if (!cancelled) {
        collected.sort((a, b) => (a.dayISO + a.startTime).localeCompare(b.dayISO + b.startTime));
        setRows(collected);
        setSel([]);
        setSelHistory([]);
      }
    }

    loadByRange();
    return () => { cancelled = true; };
  }, [partnerSlug, fromDate, toDate, daysKey]);

  function pushHistory(prev: string[]) { setSelHistory(h => [...h.slice(-19), prev]); }
  function setChecked(id: string, checked: boolean) {
    setSel(prev => {
      const next = checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter(x => x !== id);
      if (next !== prev) pushHistory(prev);
      return next;
    });
  }

  const filtered = React.useMemo(
    () =>
      rows
        .filter(r => isWithinRange(r.dayISO, fromDate, toDate))
        .filter(r => matchDayFilter(r.dayISO)),
    [rows, fromDate, toDate, daysKey]
  );
  const filteredIds = React.useMemo(() => filtered.map(r => r.id), [filtered]);
  const allVisibleSelected = filteredIds.length > 0 && filteredIds.every(id => sel.includes(id));
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
      setSel([]);
      setSelHistory([]);
      onChanged();
      setFromDate(v => v);
      setToDate(v => v);
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
      setRows(prev => prev.filter(x => x.id !== id));
      setSel(prev => prev.filter(x => x !== id));
      onChanged();
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
      {/* Header + bulk-acties */}
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
            onClick={() => { if (!hasSelection) return; setSelHistory(h => [...h, sel]); setSel([]); }}
            disabled={!hasSelection}
            className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
          >
            Wis selectie
          </button>
          <button
            onClick={() => setSelHistory(h => {
              if (h.length === 0) return h;
              const prev = h[h.length - 1];
              setSel(prev);
              return h.slice(0, -1);
            })}
            disabled={!canUndo}
            className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
            title="Maak selectie ongedaan"
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

      {/* Compacte filterbalk */}
      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 p-2">
          <div className="mb-1 text-xs font-semibold text-stone-700">Agenda van–tot</div>
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
          <p className="mt-1 text-[11px] leading-4 text-stone-500">Standaard: vandaag t/m eind van dit jaar.</p>
        </div>

        <div className="rounded-lg border border-stone-200 p-2">
          <div className="mb-1 text-xs font-semibold text-stone-700">Dagen</div>
          <div className="grid grid-cols-7 gap-1.5">
            {NL_DAYS.map((lbl, dow) => {
              const active = days.has(dow);
              const cls = active
                ? "bg-emerald-50 ring-emerald-300 text-stone-900 font-semibold"
                : "bg-white ring-stone-300 text-stone-700";
              return (
                <label
                  key={dow}
                  className={`cursor-pointer rounded-md px-2 py-1 text-center text-sm ring-1 transition ${cls}`}
                  title={active ? "Aan" : "Uit"}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={active}
                    onChange={(e) => {
                      setDays(prev => {
                        const n = new Set(prev);
                        if (e.target.checked) n.add(dow);
                        else n.delete(dow);
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
              onClick={() => setDays(new Set<number>())}
              className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
              title="Toon alle dagen (geen specifieke selectie)"
            >
              Alles tonen
            </button>
          </div>
        </div>

        <div className="hidden md:block" />
      </div>

      {/* Lijst */}
      <ul className="space-y-2">
        {filtered.length > 0 && (
          <li className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
            <input
              type="checkbox"
              aria-label="Selecteer alle zichtbare tijdsloten"
              className="h-4 w-4 rounded border-stone-300"
              checked={filteredIds.length > 0 && filteredIds.every(id => sel.includes(id))}
              onChange={(e) => {
                if (e.target.checked) setSel(filteredIds);
                else { setSelHistory(h => [...h, sel]); setSel([]); }
              }}
            />
            <span className="text-sm text-stone-800">
              {filteredIds.length > 0 && filteredIds.every(id => sel.includes(id))
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
              <span className="font-medium text-stone-900">{fmtSlotNL(r.dayISO, r.startTime)}</span>
            </div>

            <button
              onClick={() => removeOne(r.id)}
              className="
                rounded-lg
                border border-red-300
                bg-red-100
                px-2 py-1
                text-xs font-medium text-red-700
                hover:bg-red-200
                focus:outline-none focus:ring-2 focus:ring-red-300
                disabled:opacity-50
              "
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
    </div>
  );
}
