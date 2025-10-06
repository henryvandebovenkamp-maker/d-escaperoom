// PATH: src/app/(shared)/components/DayTimelineV3.tsx
"use client";

import * as React from "react";

type BaselineMode = "all" | "future" | "none";
type SlotStatus = "DRAFT" | "PUBLISHED" | "BOOKED";

type Props = {
  partnerSlug: string;
  dayISO: string;                 // YYYY-MM-DD
  capacityPerDay?: number;        // default 12
  baseline?: BaselineMode;        // default "all"
};

type ApiSlot = { id: string; startTime: string; endTime: string; status: SlotStatus };
type ApiResp = {
  date: string;
  counts: { orange: number; green: number; purple: number; totalFromDb: number; capacityPerDay: number };
  slots: ApiSlot[];
};

function hhmmUTC(dt: string) {
  const d = new Date(dt);
  const hh = String(d.getUTCHours()).padStart(2,"0");
  const mm = String(d.getUTCMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
}

export default function DayTimelineV3({
  partnerSlug,
  dayISO,
  capacityPerDay = 12,
  baseline = "all",
}: Props) {
  const [data, setData] = React.useState<ApiResp | null>(null);
  const [status, setStatus] = React.useState<{ url: string; ok: boolean; code?: number; text?: string } | null>(null);
  const [raw, setRaw] = React.useState("");

  const url = React.useMemo(() =>
    `/api/slots/day?partner=${encodeURIComponent(partnerSlug)}&date=${dayISO}&capacityPerDay=${capacityPerDay}&baseline=${baseline}`,
    [partnerSlug, dayISO, capacityPerDay, baseline]
  );

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!partnerSlug || !dayISO) { setData(null); setStatus(null); setRaw(""); return; }
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      if (!alive) return;
      setStatus({ url, ok: res.ok, code: res.status, text: res.statusText });
      setRaw(text);
      try {
        setData(JSON.parse(text));
      } catch {
        setData(null);
      }
    })();
    return () => { alive = false; };
  }, [url, partnerSlug, dayISO]);

  const published = data?.slots.filter(s => s.status === "PUBLISHED") ?? [];
  const booked    = data?.slots.filter(s => s.status === "BOOKED") ?? [];
  const drafts    = data?.slots.filter(s => s.status === "DRAFT") ?? [];

  return (
    <div className="w-full rounded-2xl border border-stone-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-stone-800">
          Dagoverzicht — <span className="tabular-nums">{dayISO}</span>
        </div>
        {status && (
          <div className={`text-[11px] ${status.ok ? "text-green-600" : "text-red-600"}`}>
            {status.ok ? "API OK" : "API ERROR"} {status.code ?? ""} — {status.text ?? ""}
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-2 py-1 text-orange-700">
          <span className="h-2 w-4 rounded bg-orange-500" />
          Oranje: <b>{data?.counts.orange ?? 0}</b>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-2 py-1 text-green-700">
          <span className="h-2 w-4 rounded bg-green-600" />
          Groen: <b>{published.length}</b>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-2 py-1 text-purple-700">
          <span className="h-2 w-4 rounded bg-purple-600" />
          Paars: <b>{booked.length}</b>
        </span>
        <span className="text-stone-500">cap/dag: <b className="text-stone-700">{data?.counts.capacityPerDay ?? capacityPerDay}</b></span>
      </div>

      <div className="space-y-2">
        {data?.slots.map((s) => {
          const t = `${hhmmUTC(s.startTime)}–${hhmmUTC(s.endTime)}`;
          const color =
            s.status === "BOOKED"    ? "bg-purple-600 text-white"
          : s.status === "PUBLISHED" ? "bg-green-600 text-white"
          :                            "bg-orange-500 text-white";
          return (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-stone-200 p-2">
              <div className="text-sm font-medium text-stone-800 tabular-nums">{t}</div>
              <span className={`rounded-full px-2 py-1 text-xs ${color}`}>{s.status}</span>
            </div>
          );
        })}

        {data && data.slots.length === 0 && (
          <div className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-stone-500">
            Geen slots gevonden voor deze dag.
          </div>
        )}
      </div>

      <details className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-2 text-[11px] text-stone-700">
        <summary className="cursor-pointer select-none text-stone-900">Debug</summary>
        <div className="truncate"><b>GET</b> <code className="text-stone-900">{status?.url ?? "(n/a)"}</code></div>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 text-[10px]">{raw || "(no body)"}</pre>
      </details>
    </div>
  );
}
