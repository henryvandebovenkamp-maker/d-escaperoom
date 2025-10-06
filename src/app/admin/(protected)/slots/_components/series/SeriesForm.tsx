"use client";

import * as React from "react";

export type Props = {
  partnerSlug: string;
  /** Optioneel: callback na succesvol aanmaken reeks */
  onDone?: () => void;
};

export default function SeriesForm({ partnerSlug, onDone }: Props) {
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [publish, setPublish] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function submit() {
    if (!partnerSlug) { setMsg("Geen partner geselecteerd."); return; }
    if (!start || !end) { setMsg("Kies een start- én einddatum."); return; }

    setLoading(true); setMsg(null);
    const res = await fetch("/api/slots/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerSlug, startDate: start, endDate: end, publish }),
    });
    setLoading(false);

    if (res.ok) {
      setMsg("Reeks aangemaakt ✔️");
      onDone?.(); // <- callback aanroepen als aanwezig
    } else {
      const t = await res.text().catch(()=>null);
      setMsg(`Fout bij aanmaken reeks${t ? `: ${t}` : ""}`);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-stone-700">Startdatum</label>
        <input
          type="date"
          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700">Einddatum</label>
        <input
          type="date"
          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
        Slots direct boekbaar maken (groen)
      </label>

      <div className="pt-2">
        <button
          onClick={submit}
          disabled={loading}
          className="rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700"
        >
          {loading ? "Bezig…" : "Reeks toevoegen"}
        </button>
        {msg && <p className="mt-2 text-sm text-stone-600">{msg}</p>}
      </div>

      <p className="text-xs text-stone-500">
        Per geselecteerde dag worden 12 tijdsloten aangemaakt: 09:00 t/m 20:00 (duur 60 min).
      </p>
    </div>
  );
}
