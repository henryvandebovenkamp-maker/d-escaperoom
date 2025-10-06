"use client";

import * as React from "react";

type BaselineMode = "all" | "future" | "none";

type Props = {
  partnerSlug: string;
  monthISO: string;      // YYYY-MM
  selectedDay: string;   // YYYY-MM-DD
  onSelectDay(dayISO: string): void;
  capacityPerDay?: number; // default 12
  baseline?: BaselineMode; // default "all"
};

type ApiDay = {
  date: string;               // YYYY-MM-DD
  hasDraft: boolean;
  hasPublished: boolean;
  hasBooked: boolean;
  draftCount: number;
  publishedCount: number;
  bookedCount: number;
  capacityPerDay: number | undefined;
};
type ApiResp = { days: ApiDay[] };

const nlDays = ["ma","di","wo","do","vr","za","zo"];

/** YYYY-MM-DD (UTC-safe) */
function todayISO(): string {
  const now = new Date();
  // Normaliseer naar UTC-datumcomponent
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0,10);
}

/** Probeert uiteenlopende API-shapes te normaliseren naar ApiDay */
function normalizeDay(input: any, fallbackCap: number): ApiDay | null {
  const date =
    input?.date ??
    input?.day ??
    input?.dateISO ??
    null;
  if (!date || typeof date !== "string") return null;

  const draftCount =
    (typeof input?.draftCount === "number" && input.draftCount) ??
    (typeof input?.drafts === "number" && input.drawfts) ?? // typo catch
    (typeof input?.drafts === "number" && input.drafts) ??
    0;

  const publishedCount =
    (typeof input?.publishedCount === "number" && input.publishedCount) ??
    (typeof input?.published === "number" && input.published) ??
    0;

  const bookedCount =
    (typeof input?.bookedCount === "number" && input.bookedCount) ??
    (typeof input?.booked === "number" && input.booked) ??
    0;

  const hasDraft = !!(input?.hasDraft ?? draftCount > 0);
  const hasPublished = !!(input?.hasPublished ?? publishedCount > 0);
  const hasBooked = !!(input?.hasBooked ?? bookedCount > 0);

  const capacityPerDay =
    (typeof input?.capacityPerDay === "number" && input.capacityPerDay) ??
    fallbackCap;

  return {
    date,
    hasDraft,
    hasPublished,
    hasBooked,
    draftCount,
    publishedCount,
    bookedCount,
    capacityPerDay,
  };
}

export default function AgendaCalendarV3({
  partnerSlug, monthISO, selectedDay, onSelectDay,
  capacityPerDay = 12,
  baseline = "all",
}: Props) {
  const [data, setData] = React.useState<ApiResp>({ days: [] });
  const [status, setStatus] = React.useState<{url:string; ok:boolean; code?:number; text?:string} | null>(null);
  const [raw, setRaw] = React.useState<string>("");

  const url = React.useMemo(
    () =>
      `/api/slots/month?partner=${encodeURIComponent(partnerSlug)}&month=${monthISO}` +
      `&capacityPerDay=${capacityPerDay}&baseline=${baseline}`,
    [partnerSlug, monthISO, capacityPerDay, baseline]
  );

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!partnerSlug || !monthISO) { setData({ days: [] }); setStatus(null); setRaw(""); return; }
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      if (!alive) return;
      setStatus({ url, ok: res.ok, code: res.status, text: res.statusText });
      setRaw(text);

      try {
        const json = JSON.parse(text);
        const arr: any[] = Array.isArray(json?.days) ? json.days : [];
        const normalized: ApiDay[] = arr
          .map((d) => normalizeDay(d, capacityPerDay))
          .filter((x): x is ApiDay => !!x);
        setData({ days: normalized });
      } catch {
        setData({ days: [] });
      }
    })();
    return () => { alive = false; };
  }, [url, partnerSlug, monthISO, capacityPerDay]);

  const byDate = React.useMemo(() => {
    const m = new Map<string, ApiDay>();
    for (const d of data.days) m.set(d.date, d);
    return m;
  }, [data]);

  // Kalendergrid (UTC, maandag-start)
  const first = new Date(`${monthISO}-01T00:00:00Z`);
  const Y = first.getUTCFullYear();
  const M = first.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate();
  const startWeekday = (first.getUTCDay() + 6) % 7;

  const cells: Array<{ dateISO?: string; day?: number }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({});
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateISO: `${monthISO}-${String(d).padStart(2, "0")}`, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({});
  const rows: Array<typeof cells> = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const today = todayISO();

  return (
    <div className="cal-wrap w-full">
      {/* Proof-of-life + API status */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-pink-300 bg-pink-50 px-2 py-0.5 text-[10px] font-semibold text-pink-700">
            AgendaCalendar v3
          </span>
          <span className="text-xs text-stone-500">
            cap/dag <b className="text-stone-700">{capacityPerDay}</b> • baseline <b className="text-stone-700">{baseline}</b>
          </span>
        </div>
        {status ? (
          <div className={`text-[11px] ${status.ok ? "text-green-600" : "text-red-600"}`}>
            {status.ok ? "API OK" : "API ERROR"} {status.code ?? ""} — {status.text ?? ""}
          </div>
        ) : null}
      </div>

      {/* Debug-URL + aantal dagen + raw JSON */}
      <details className="mb-3 rounded-lg border border-stone-200 bg-stone-50 p-2 text-[11px] text-stone-700">
        <summary className="cursor-pointer select-none text-stone-900">Debug</summary>
        <div className="truncate"><b>GET</b> <code className="text-stone-900">{status?.url ?? "(n/a)"}</code></div>
        <div>days: <b>{data.days?.length ?? 0}</b></div>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 text-[10px]">{raw || "(no body)"}</pre>
      </details>

      <table className="w-full">
        <thead>
          <tr className="text-center text-xs font-semibold uppercase text-stone-500">
            {nlDays.map((d) => <th key={d} className="pb-1">{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((c, cIdx) => {
                if (!c.dateISO) return <td key={cIdx}><div className="h-24 rounded-2xl" /></td>;
                const d = byDate.get(c.dateISO);

                // Gevraagd gedrag:
                // Groen = publishedCount
                // Paars = bookedCount (subset van groen, maar als echte teller)
                // Oranje:
                //   - baseline="all": capacity - published
                //   - baseline="future": idem, maar alleen voor vandaag/toekomst; verleden = 0
                //   - baseline="none": gebruik draftCount
                const published = d?.publishedCount ?? 0;
                const booked = d?.bookedCount ?? 0;

                let orange = 0;
                if (baseline === "all") {
                  orange = Math.max(0, (d?.capacityPerDay ?? capacityPerDay) - published);
                } else if (baseline === "future") {
                  orange = c.dateISO >= today
                    ? Math.max(0, (d?.capacityPerDay ?? capacityPerDay) - published)
                    : 0;
                } else { // "none"
                  orange = d?.draftCount ?? 0;
                }

                const O = orange;        // Oranje
                const G = published;     // Groen
                const P = booked;        // Paars

                const isSelected = c.dateISO === selectedDay;

                const indClass = "h-3 rounded";
                const offClass = "bg-stone-300";
                const onOrange = "bg-orange-500";
                const onGreen  = "bg-green-600";
                const onPurple = "bg-purple-600";

                const title = `${c.dateISO} — O:${O} • G:${G} • P:${P}`;

                return (
                  <td key={cIdx} className="align-top">
                    <button
                      type="button"
                      onClick={() => onSelectDay(c.dateISO!)}
                      title={title}
                      aria-label={title}
                      className={[
                        "h-24 w-full rounded-2xl border border-stone-300 bg-white p-2 text-left shadow-sm transition",
                        isSelected ? "ring-2 ring-pink-500 ring-offset-2" : "hover:shadow-md",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between">
                        <div className="text-sm font-extrabold text-stone-900">{c.day}</div>
                        <div className="space-x-2 text-[11px] text-stone-600 tabular-nums">
                          <span>O:{O}</span>
                          <span>G:{G}</span>
                          <span>P:{P}</span>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden="true">
                        <div className={`${indClass} ${O>0 ? onOrange : offClass}`} />
                        <div className={`${indClass} ${G>0 ? onGreen  : offClass}`} />
                        <div className={`${indClass} ${P>0 ? onPurple : offClass}`} />
                      </div>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-stone-600">
        <span className="flex items-center gap-2"><span className="inline-block h-2 w-4 rounded bg-orange-500" /> Oranje: baseline resterend</span>
        <span className="flex items-center gap-2"><span className="inline-block h-2 w-4 rounded bg-green-600" /> Groen: gepubliceerd</span>
        <span className="flex items-center gap-2"><span className="inline-block h-2 w-4 rounded bg-purple-600" /> Paars: geboekt</span>
      </div>

      <style jsx>{`
        .cal-wrap :where(table) {
          display: table !important;
          table-layout: fixed !important;
          border-collapse: separate !important;
          border-spacing: 0.5rem !important;
          width: 100% !important;
        }
        .cal-wrap :where(thead) { display: table-header-group !important; }
        .cal-wrap :where(tbody) { display: table-row-group !important; }
        .cal-wrap :where(tr)    { display: table-row !important; }
        .cal-wrap :where(th), .cal-wrap :where(td) { display: table-cell !important; vertical-align: top !important; }
      `}</style>
    </div>
  );
}
