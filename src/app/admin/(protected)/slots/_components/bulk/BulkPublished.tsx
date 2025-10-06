"use client";

import * as React from "react";

type Row = { id: string; startTime: string; dayISO: string };

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export default function BulkPublished({
  partnerSlug,
  monthISO,
  onChanged,
}: {
  partnerSlug: string;
  monthISO: string;
  onChanged(): void;
}) {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [sel, setSel] = React.useState<string[]>([]);
  const [filter, setFilter] = React.useState("");

  async function load() {
    const u = `/api/slots/published?partner=${encodeURIComponent(partnerSlug)}&month=${encodeURIComponent(monthISO)}`;
    const r = await fetch(u, { cache: "no-store" });
    if (r.ok) setRows(await r.json());
  }
  React.useEffect(() => { load(); setSel([]); }, [partnerSlug, monthISO]);

  async function depublishSelected() {
    if (sel.length === 0) return;
    await fetch(`/api/slots/update-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotIds: sel, status: "DRAFT" }),
    });
    await load();
    onChanged();
  }

  const filtered = rows.filter((x) => x.dayISO.includes(filter));

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-extrabold">📦 Alle boekbare slots (GROEN) — bulk beheren</h3>
        <div className="flex items-center gap-2">
          <input
            placeholder="Filter op datum (YYYY-MM-DD)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-stone-300 px-3 py-1.5 text-sm"
          />
          <button
            onClick={depublishSelected}
            className="rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700"
          >
            Depubliceer selectie (→ oranje)
          </button>
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sel.includes(r.id)}
                onChange={(e) =>
                  setSel((prev) => (e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id)))
                }
              />
              <span className="font-medium">{r.dayISO} — {fmtTime(r.startTime)}</span>
            </label>
            <span className="text-xs text-green-800">PUBLISHED</span>
          </li>
        ))}
        {filtered.length === 0 && <li className="text-sm text-stone-500">Geen resultaten.</li>}
      </ul>
    </div>
  );
}
