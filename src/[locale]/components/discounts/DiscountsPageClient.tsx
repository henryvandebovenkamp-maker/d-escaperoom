"use client";

import * as React from "react";

/* ================== Types ================== */
type Partner = { id: string; name: string; slug: string | null; city: string | null };
type Mode = "ADMIN" | "PARTNER";
type Item = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  percent: number | null;
  amountCents: number | null;
  validFrom: string | null;
  validUntil: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  active: boolean;
  partnerId: string | null;
  partner?: { id: string; name: string; slug: string | null };
  createdAt: string;
  updatedAt: string;
};
type InitialKpis = { total: number; active: number; percentCount: number; fixedCount: number };

/* ================== Utils ================== */
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function euro(cents?: number | null) {
  const n = (cents ?? 0) / 100;
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}
function daysLeft(iso?: string | null) {
  if (!iso) return null;
  const end = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((end.getTime() - startOfToday.getTime()) / 86400000);
}
function StatCard({
  title,
  value,
  hint,
  icon,
  accent = "from-pink-600/10 to-rose-600/10",
}: {
  title: string;
  value: React.ReactNode;
  hint?: string;
  icon: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`rounded-lg bg-gradient-to-r ${accent} px-2 py-1 text-base leading-none`}>{icon}</div>
        <h3 className="text-xs font-medium text-stone-600">{title}</h3>
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums leading-none">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-600">{hint}</p>}
    </div>
  );
}
function Badge({
  children,
  color = "stone",
}: {
  children: React.ReactNode;
  color?: "green" | "rose" | "stone" | "violet" | "orange";
}) {
  const map: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    stone: "bg-stone-50 text-stone-700 ring-stone-200",
    orange: "bg-orange-50 text-orange-700 ring-orange-200",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", map[color])}>
      {children}
    </span>
  );
}

/* ================== Component ================== */
export default function DiscountsPageClient({
  mode,
  partners,
  currentPartnerId,
  usageByCodeId,         // optioneel
  initialKpis,           // seed vanuit server voor snappy paint
}: {
  mode: Mode;
  partners: Partner[];
  currentPartnerId: string | null;
  usageByCodeId?: Record<string, number>;
  initialKpis?: InitialKpis;
}) {
  const [partnerId, setPartnerId] = React.useState<string | null>(currentPartnerId ?? null);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState<"all" | "true" | "false">("all");
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Create form
  const [form, setForm] = React.useState({
    code: "",
    type: "PERCENT" as "PERCENT" | "FIXED",
    percent: 10,
    amountCents: 0,
    validFrom: "",
    validUntil: "",
    maxRedemptions: "",
  });
  const [creating, setCreating] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, q, active]);

  /* ================== Data ================== */
  async function fetchList() {
    setLoading(true);
    const params = new URLSearchParams();
    if (partnerId) params.set("partnerId", partnerId);
    if (q) params.set("q", q);
    if (active !== "all") params.set("active", active);

    const res = await fetch(`/api/discounts/list?${params.toString()}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      const issuesMsg = Array.isArray(data?.issues) ? data.issues.map((i: any) => `${i.path}: ${i.message}`).join("\n") : null;
      alert(data?.error || issuesMsg || "Fout bij ophalen kortingen");
      return;
    }
    setItems(Array.isArray(data.items) ? data.items : []);
  }

  async function toggleActive(id: string, next: boolean) {
    const res = await fetch("/api/discounts/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "Activeren/deactiveren mislukt");
      return;
    }
    fetchList();
  }

  async function createCode(e: React.FormEvent) {
    e.preventDefault();
    if (form.type === "PERCENT" && (form.percent < 1 || form.percent > 20)) {
      alert("Percentage moet tussen 1 en 20% zijn.");
      return;
    }
    if (form.type === "FIXED" && (!form.amountCents || form.amountCents <= 0)) {
      alert("Vast bedrag moet groter dan 0 zijn.");
      return;
    }

    setCreating(true);

    const base: Record<string, any> = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
    };
    if (form.type === "PERCENT") base.percent = form.percent;
    if (form.type === "FIXED") base.amountCents = form.amountCents;
    if (form.validFrom) base.validFrom = new Date(form.validFrom).toISOString();
    if (form.validUntil) base.validUntil = new Date(form.validUntil).toISOString();
    if (form.maxRedemptions) {
      const n = Number(form.maxRedemptions);
      if (Number.isFinite(n)) base.maxRedemptions = n;
    }
    if (mode === "ADMIN" && partnerId) base.partnerId = partnerId;

    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(base)) {
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      payload[k] = v;
    }

    const res = await fetch("/api/discounts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    setCreating(false);

    if (!res.ok) {
      const issuesMsg = Array.isArray(data?.issues) ? data.issues.map((i: any) => `${i.path}: ${i.message}`).join("\n") : null;
      alert(data?.error || issuesMsg || "Aanmaken mislukt");
      return;
    }

    setForm({ code: "", type: "PERCENT", percent: 10, amountCents: 0, validFrom: "", validUntil: "", maxRedemptions: "" });
    fetchList();
  }

  /* ===== Derived (stats) ===== */
  const totalCount = items.length || initialKpis?.total || 0;
  const activeCount = (items.length ? items.filter(i => i.active).length : initialKpis?.active) ?? 0;
  const percentCodes = (items.length ? items.filter(i => i.type === "PERCENT").length : initialKpis?.percentCount) ?? 0;
  const fixedCodes = (items.length ? items.filter(i => i.type === "FIXED").length : initialKpis?.fixedCount) ?? 0;
  const inactiveCount = Math.max(0, totalCount - activeCount);

  /* ===== UI helpers ===== */
  function StatusBadge({ it }: { it: Item }) {
    const dl = daysLeft(it.validUntil);
    const isExpired = typeof dl === "number" && dl < 0;
    const almost = typeof dl === "number" && dl >= 0 && dl <= 7;

    if (!it.active) return <Badge color="stone">Uit</Badge>;
    if (isExpired) return <Badge color="rose">Verlopen</Badge>;
    if (almost) return <Badge color="orange">Loopt af ({dl}d)</Badge>;
    return <Badge color="green">Actief</Badge>;
  }

  /* ================================ Layout ================================ */
  return (
    <div className="space-y-6">
      {/* Stat grid — identiek aan dashboard style */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Totaal codes" value={totalCount} hint={`Actief: ${activeCount}`} icon="🏷️" />
        <StatCard title="Types" value={<span className="text-base"><Badge color="violet">{percentCodes}×%</Badge>{" "}<Badge color="rose">{fixedCodes}×€</Badge></span>} hint="Verdeling per type" icon="🧮" />
        <StatCard title="Niet actief" value={inactiveCount} hint="Uitgeschakeld of verlopen" icon="⏸️" accent="from-stone-400/10 to-stone-600/10" />
      </section>

      {/* Nieuwe code (zelfde kaartstijl) */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-tight">➕ Nieuwe kortingscode</h2>
          <p className="text-[11px] text-stone-500">Max <strong>20%</strong> bij percentage. Vast bedrag geldt niet op aanbetaling.</p>
        </div>

        <form onSubmit={createCode} className="mt-3 space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-stone-700">Code</label>
              <input
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="WELCOME10"
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm uppercase outline-none focus:ring-2 focus:ring-stone-900"
                aria-label="Code"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-stone-700">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-stone-900"
                aria-label="Type"
              >
                <option value="PERCENT">Percentage (max 20%)</option>
                <option value="FIXED">Vast bedrag (€)</option>
              </select>
            </div>

            {form.type === "PERCENT" ? (
              <div>
                <label className="text-sm font-medium text-stone-700">Percentage</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.percent}
                  onChange={(e) => setForm((f) => ({ ...f, percent: Number(e.target.value) }))}
                  className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-stone-900"
                  aria-label="Percentage"
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-stone-700">Vast bedrag</label>
                <div className="mt-1 flex items-center rounded-lg border border-stone-300 bg-white pl-2">
                  <span className="text-stone-500">€</span>
                  <input
                    type="number"
                    min={1}
                    value={Math.round((form.amountCents || 0) / 100)}
                    onChange={(e) => setForm((f) => ({ ...f, amountCents: Math.max(0, Number(e.target.value) * 100) }))}
                    className="h-10 w-full rounded-r-lg bg-transparent px-2 text-sm outline-none focus:ring-2 focus:ring-stone-900"
                    aria-label="Vast bedrag in euro"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-stone-700">Geldig vanaf</label>
              <input
                type="datetime-local"
                value={form.validFrom}
                onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-stone-900"
                aria-label="Geldig vanaf"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700">Geldig t/m</label>
              <input
                type="datetime-local"
                value={form.validUntil}
                onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-stone-900"
                aria-label="Geldig t/m"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700">Max. gebruik</label>
              <input
                type="number"
                min={1}
                placeholder="leeg = onbeperkt"
                value={form.maxRedemptions}
                onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-stone-900"
                aria-label="Maximaal aantal gebruik"
              />
            </div>
          </div>

          {mode === "ADMIN" ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-stone-700">Partner (optioneel)</label>
                <select
                  value={partnerId ?? ""}
                  onChange={(e) => setPartnerId(e.target.value || null)}
                  className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-stone-900"
                  aria-label="Partnerselectie"
                >
                  <option value="">— algemeen —</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.city ? ` — ${p.city}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end justify-end md:col-span-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="h-10 rounded-lg border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
                >
                  {creating ? "Aanmaken…" : "Aanmaken"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={creating}
                className="h-10 rounded-lg border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
              >
                {creating ? "Aanmaken…" : "Aanmaken"}
              </button>
            </div>
          )}
        </form>
      </section>

      {/* Filters + tabel (zelfde card-look als dashboard lijsten) */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="rounded-lg border border-stone-200 p-2">
            <span className="mb-1 block text-[11px] font-semibold text-stone-700">Zoeken</span>
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Code (bv. WELCOME10)"
                className="h-10 w-full rounded-md border border-stone-300 bg-white pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-stone-900"
                aria-label="Zoek op kortingscode"
              />
              <svg className="pointer-events-none absolute left-2.5 top-2.5 h-5 w-5 text-stone-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l3.385 3.385a1 1 0 01-1.414 1.414l-3.385-3.385zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
              </svg>
            </div>
          </label>

          <label className="rounded-lg border border-stone-200 p-2">
            <span className="mb-1 block text-[11px] font-semibold text-stone-700">Status</span>
            <div className="inline-flex w-full rounded-md border border-stone-300 bg-white p-0.5">
              {(["all", "true", "false"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setActive(v)}
                  className={cx("w-1/3 rounded px-2 py-1 text-sm", active === v ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-50")}
                  aria-pressed={active === v}
                >
                  {v === "all" ? "Alle" : v === "true" ? "Actief" : "Uit"}
                </button>
              ))}
            </div>
          </label>

          <div className="rounded-lg border border-stone-200 p-2">
            <div className="mb-1 text-[11px] font-semibold text-stone-700">Samenvatting</div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="stone">Totaal {loading ? "…" : totalCount}</Badge>
              <Badge color="green">{activeCount} aan</Badge>
              <Badge color="stone">{inactiveCount} uit</Badge>
              <Badge color="violet">{percentCodes}×%</Badge>
              <Badge color="rose">{fixedCodes}×€</Badge>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl ring-1 ring-stone-200">
          <div className="sticky top-0 z-[1] border-b bg-stone-50/90 px-3 py-2 text-sm text-stone-700 backdrop-blur">
            <span className="font-medium">Kortingscodes</span>
            <span className="ml-2 text-stone-500">{loading ? "laden…" : `${items.length} item${items.length === 1 ? "" : "s"}`}</span>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-stone-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Code</th>
                  <th className="px-3 py-2 text-left font-semibold">Type</th>
                  <th className="px-3 py-2 text-left font-semibold">Waarde</th>
                  <th className="px-3 py-2 text-left font-semibold">Geldigheid</th>
                  <th className="px-3 py-2 text-left font-semibold">Gebruik</th>
                  {mode === "ADMIN" && <th className="px-3 py-2 text-left font-semibold">Partner</th>}
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-left font-semibold">Acties</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="border-t">
                      {Array.from({ length: mode === "ADMIN" ? 8 : 7 }).map((__, j) => (
                        <td key={`sk-${i}-${j}`} className="px-3 py-2">
                          <div className="h-3 w-24 animate-pulse rounded bg-stone-200" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-stone-500" colSpan={mode === "ADMIN" ? 8 : 7}>
                      Geen kortingen gevonden.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => {
                    const value = it.type === "PERCENT" ? `${it.percent ?? 0}%` : euro(it.amountCents ?? 0);
                    const vf = it.validFrom ? new Date(it.validFrom).toLocaleString("nl-NL") : "—";
                    const vu = it.validUntil ? new Date(it.validUntil).toLocaleString("nl-NL") : "—";

                    const used = usageByCodeId?.[it.id] ?? it.redeemedCount ?? 0;
                    const usage =
                      typeof it.maxRedemptions === "number" && it.maxRedemptions > 0
                        ? `${used}/${it.maxRedemptions}`
                        : `${used}`;

                    return (
                      <tr key={it.id} className="border-t transition hover:bg-stone-50/60">
                        <td className="px-3 py-2 font-medium tracking-wide">
                          <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[0.8rem] text-stone-800">{it.code}</code>
                        </td>
                        <td className="px-3 py-2">
                          <Badge color={it.type === "PERCENT" ? "violet" : "rose"}>
                            {it.type === "PERCENT" ? "Percentage" : "Vast bedrag"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{value}</td>
                        <td className="px-3 py-2">
                          {vf} <span aria-hidden>→</span> {vu}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{usage}</td>
                        {mode === "ADMIN" && <td className="px-3 py-2">{it.partner?.name ?? <span className="text-stone-400">—</span>}</td>}
                        <td className="px-3 py-2"><StatusBadge it={it} /></td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard?.writeText(it.code);
                                setCopiedId(it.id);
                                setTimeout(() => setCopiedId(null), 1200);
                              }}
                              className="h-8 rounded-lg border border-stone-300 px-3 text-xs outline-none transition hover:bg-stone-50 focus:ring-2 focus:ring-stone-900"
                              aria-label={`Kopieer code ${it.code}`}
                              title="Kopieer code"
                            >
                              {copiedId === it.id ? "Gekopieerd!" : "Kopieer"}
                            </button>
                            <button
                              onClick={() => toggleActive(it.id, !it.active)}
                              className={cx(
                                "h-8 rounded-lg px-3 text-xs text-white outline-none transition hover:brightness-110 focus:ring-2 focus:ring-stone-900",
                                it.active ? "bg-stone-700" : "bg-stone-900"
                              )}
                              aria-label={it.active ? "Deactiveer code" : "Activeer code"}
                              title={it.active ? "Deactiveer" : "Activeer"}
                            >
                              {it.active ? "Deactiveren" : "Activeren"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live region voor kopieerfeedback (a11y) */}
        <div className="sr-only" role="status" aria-live="polite">
          {copiedId ? "Kortingscode gekopieerd naar klembord" : ""}
        </div>
      </section>
    </div>
  );
}
