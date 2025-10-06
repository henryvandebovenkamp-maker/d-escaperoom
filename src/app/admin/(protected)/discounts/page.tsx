"use client";

import * as React from "react";

/* ================================
   Types
================================ */
type Partner = { id: string; name: string; slug: string; city: string | null };
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

/* ================================
   Utils
================================ */
const STORAGE_KEY = "admin.partner.slug";

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

/* ================================
   Page
================================ */
export default function AdminDiscountsPage() {
  // ---- Partner selectie (zelfde patroon als admin/slots)
  const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const urlPartner = sp?.get("partner") ?? "";

  const [partners, setPartners] = React.useState<Partner[]>([]);
  const [partnerSlug, setPartnerSlug] = React.useState<string>(urlPartner);
  const [loadingPartners, setLoadingPartners] = React.useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingPartners(true);
        const r = await fetch("/api/partners/list", { cache: "no-store", credentials: "include" });
        const rows = r.ok ? ((await r.json()) as Partner[]) : [];
        if (cancelled) return;
        setPartners(rows);
        // Bepaal initiële selectie (URL -> localStorage -> eerste)
        const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) ?? "" : "";
        const fallback = rows[0]?.slug ?? "";
        const next = urlPartner || stored || fallback || "";
        setPartnerSlug(next);
        // sync in URL
        if (typeof window !== "undefined") {
          const usp = new URLSearchParams(window.location.search);
          if (next) usp.set("partner", next); else usp.delete("partner");
          const nextUrl = `${window.location.pathname}?${usp.toString()}`;
          window.history.replaceState(null, "", nextUrl);
        }
      } catch {
        setPartners([]);
      } finally {
        setLoadingPartners(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setPartnerSlugAndUrl(slug: string) {
    setPartnerSlug(slug);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, slug);
      const usp = new URLSearchParams(window.location.search);
      if (slug) usp.set("partner", slug); else usp.delete("partner");
      window.history.replaceState(null, "", `${window.location.pathname}?${usp.toString()}`);
    }
  }

  // Huidige partner-id (mag null zijn = alle partners)
  const currentPartner = React.useMemo(
    () => partners.find((p) => p.slug === partnerSlug) ?? null,
    [partners, partnerSlug]
  );
  const currentPartnerId = currentPartner?.id ?? null;

  // ---- Filters + lijst
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState<"all" | "true" | "false">("all");
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(false);

  // ---- Create form
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
  }, [currentPartnerId, q, active]);

  async function fetchList() {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentPartnerId) params.set("partnerId", currentPartnerId);
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
      credentials: "include",
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
    // Belangrijk: ADMIN kan partner kiezen; als er een huidige partner is, defaulten we daarop
    if (currentPartnerId) base.partnerId = currentPartnerId;

    // strip leegtes
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(base)) {
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      payload[k] = v;
    }

    const res = await fetch("/api/discounts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
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

  // Stats
  const totalCount = items.length;
  const activeCount = items.filter((i) => i.active).length;
  const percentCodes = items.filter((i) => i.type === "PERCENT").length;
  const fixedCodes = items.filter((i) => i.type === "FIXED").length;
  const inactiveCount = Math.max(0, totalCount - activeCount);

  // Subcomponents (klein, in-file)
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
  function StatusBadge({ it }: { it: Item }) {
    const dl = daysLeft(it.validUntil);
    const isExpired = typeof dl === "number" && dl < 0;
    const almost = typeof dl === "number" && dl >= 0 && dl <= 7;

    if (!it.active) return <Badge color="stone">Uit</Badge>;
    if (isExpired) return <Badge color="rose">Verlopen</Badge>;
    if (almost) return <Badge color="orange">Loopt af ({dl}d)</Badge>;
    return <Badge color="green">Actief</Badge>;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-400" />
              Kortingscodes (Admin)
            </span>
          </h1>

          <div className="flex items-center gap-2">
            {/* Partner selector met slots-logica (URL + localStorage) */}
            <div className="flex items-center gap-2">
              {loadingPartners ? (
                <div className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm">Partners laden…</div>
              ) : partners.length > 0 ? (
                <select
                  className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  value={partnerSlug}
                  onChange={(e) => setPartnerSlugAndUrl(e.target.value)}
                  aria-label="Kies partner"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.name} {p.city ? `— ${p.city}` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700">Geen partners</div>
              )}
            </div>

            <a
              href="/admin"
              className="hidden sm:inline-flex rounded-xl border border-pink-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-pink-50 hover:text-pink-700"
            >
              Dashboard
            </a>
          </div>
        </div>

        {/* KPI's */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard title="Totaal codes" value={totalCount} hint={`Actief: ${activeCount}`} icon="🏷️" />
          <StatCard
            title="Types"
            value={
              <span className="text-base">
                <Badge color="violet">{percentCodes}×%</Badge>{" "}
                <Badge color="rose">{fixedCodes}×€</Badge>
              </span>
            }
            hint="Verdeling per type"
            icon="🧮"
          />
          <StatCard
            title="Niet actief"
            value={inactiveCount}
            hint="Uitgeschakeld of verlopen"
            icon="⏸️"
            accent="from-stone-400/10 to-stone-600/10"
          />
        </section>

        {/* Aanmaken */}
        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight">➕ Nieuwe kortingscode</h2>
            <p className="text-[11px] text-stone-500">
              Max <strong>20%</strong> bij percentage. Vast bedrag geldt niet op aanbetaling.
            </p>
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

            {/* Admin: partner is de selectie in de header; geen aparte dropdown nodig.
                Wil je “algemeen” (zonder partner) kunnen maken? Selecteer bovenin geen partner (of verwijder ?partner uit URL). */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={creating}
                className="h-10 rounded-lg border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
              >
                {creating ? "Aanmaken…" : "Aanmaken"}
              </button>
            </div>
          </form>
        </section>

        {/* Filters + tabel */}
        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
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
                    className={cx(
                      "w-1/3 rounded px-2 py-1 text-sm",
                      active === v ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-50"
                    )}
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
                    <th className="px-3 py-2 text-left font-semibold">Partner</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`sk-${i}`} className="border-t">
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={`sk-${i}-${j}`} className="px-3 py-2">
                            <div className="h-3 w-24 animate-pulse rounded bg-stone-200" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td className="px-3 py-8 text-center text-stone-500" colSpan={8}>
                        Geen kortingen gevonden.
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => {
                      const value = it.type === "PERCENT" ? `${it.percent ?? 0}%` : euro(it.amountCents ?? 0);
                      const vf = it.validFrom ? new Date(it.validFrom).toLocaleString("nl-NL") : "—";
                      const vu = it.validUntil ? new Date(it.validUntil).toLocaleString("nl-NL") : "—";
                      const used = it.redeemedCount ?? 0;
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
                          <td className="px-3 py-2">{it.partner?.name ?? <span className="text-stone-400">—</span>}</td>
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

          {/* Live region voor kopie-feedback (a11y) */}
          <div className="sr-only" role="status" aria-live="polite">
            {copiedId ? "Kortingscode gekopieerd naar klembord" : ""}
          </div>
        </section>
      </div>
    </div>
  );
}
