// PATH: src/app/admin/(protected)/revenue/page.tsx
"use client";

import * as React from "react";

/* ================================
   Types — conform /api/revenue & /api/partners/list & /api/revenue/metrics
================================ */
type PartnerRow = { id: string; name: string; slug: string; city: string | null };

type RevenueItem = {
  id: string;
  date: string | null;              // ISO (slot.startTime)
  partnerName: string | null;
  partnerSlug: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED" | string;
  currency: string;
  totalAmountCents: number;
  platformFeeCents: number;         // aanbetaling (platform)
  partnerFeeCents: number;          // on-site netto
  discountCents: number;            // korting (totaal)
};

type SummaryBlock = {
  totalTurnoverCents: number;
  totalPlatformFeeCents: number;
  totalPartnerFeeCents: number;
  totalDiscountsCents: number;
  currency: string;
  count: number;
};

type RevenueResp = {
  ok: boolean;
  filters: {
    partnerSlug: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    status: "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";
    timeField: "slot" | "created";
  };
  summary: SummaryBlock;                               // gefilterd op gekozen status
  items: RevenueItem[];                                // idem
  summaryAll: SummaryBlock;                            // alle statussen
  summaryByStatus: Record<"PENDING"|"CONFIRMED"|"CANCELLED"|"REFUNDED", Omit<SummaryBlock, "currency">>;
  cancellationsCount: number;                          // alle statussen
  refundsTotalCents: number;                           // alle statussen (som platformFeeCents)
  currency: string;                                    // top-level currency (backup)
};

type SlotMetricsResp = {
  ok: boolean;
  metrics: { slotsPublished: number; slotsBooked: number; occupancyRate: number };
};

/* ================================
   Helpers (datum/geld/fetch)
================================ */
const euro = (n?: number | null, ccy = "EUR") =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: ccy }).format(((n ?? 0) as number) / 100);

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const firstOfMonthISO = (d = new Date()) => toYMD(new Date(d.getFullYear(), d.getMonth(), 1));

const addMonths = (isoYYYYMMDD: string, delta: number) => {
  const [y, m] = isoYYYYMMDD.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() + delta, 1);
  return toYMD(d);
};
const monthRangeFromPivot = (pivotFirstISO: string) => {
  const [y, m] = pivotFirstISO.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1); // exclusief
  return {
    dateFrom: toYMD(start),
    dateTo: toYMD(end),
    label: start.toLocaleDateString("nl-NL", { month: "long", year: "numeric" }),
  };
};

const quarterOf = (d: Date) => Math.floor(d.getMonth() / 3) + 1;
const quarterRange = (year: number, q: 1 | 2 | 3 | 4) => {
  const startMonth = (q - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 1); // exclusief
  return { dateFrom: toYMD(start), dateTo: toYMD(end), label: `Q${q} ${year}` };
};
const currentQuarterRange = () => {
  const now = new Date();
  const q = quarterOf(now) as 1 | 2 | 3 | 4;
  return quarterRange(now.getFullYear(), q);
};

async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`);
  return r.json();
}

/* ================================
   Page — Admin Revenue
================================ */
type PeriodMode = "MONTH" | "QUARTER" | "CUSTOM";
type TimeField = "slot" | "created";
const ALL = "__ALL__";

export default function AdminRevenuePage() {
  // === Querystring (init) ===
  const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const urlPartner = sp?.get("partner");
  const urlStatus = (sp?.get("status") || "").toUpperCase();
  const urlMode = (sp?.get("mode") || "").toUpperCase() as PeriodMode | "";
  const urlPivot = sp?.get("pivot") || "";
  const urlFrom = sp?.get("dateFrom") || "";
  const urlTo = sp?.get("dateTo") || "";
  const urlTimeField = (sp?.get("timeField") || "slot").toLowerCase() as TimeField;

  // === Partner ===
  const [partners, setPartners] = React.useState<PartnerRow[]>([]);
  const [partnerSlug, setPartnerSlug] = React.useState<string>(urlPartner ?? ALL); // default = ALL

  // === Periode & status ===
  const [mode, setMode] = React.useState<PeriodMode>(urlMode || "MONTH");
  const [pivotMonthISO, setPivotMonthISO] = React.useState<string>(urlPivot || firstOfMonthISO());
  const [dateFrom, setDateFrom] = React.useState<string>(urlFrom);
  const [dateTo, setDateTo] = React.useState<string>(urlTo);
  const [status, setStatus] = React.useState<string>(
    urlStatus === "PENDING" || urlStatus === "CANCELLED" || urlStatus === "ALL" || urlStatus === "REFUNDED"
      ? urlStatus
      : "CONFIRMED"
  );

  // === Keuze datumveld ===
  const [timeField, setTimeField] = React.useState<TimeField>(urlTimeField === "created" ? "created" : "slot");

  // === Data ===
  const [revenue, setRevenue] = React.useState<RevenueResp | null>(null);
  const [metrics, setMetrics] = React.useState<SlotMetricsResp["metrics"] | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // sticky-bar shadow
  const [stuck, setStuck] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Partnerlijst
  React.useEffect(() => {
    (async () => {
      try {
        const rows = await fetchJSON<PartnerRow[]>("/api/partners/list");
        setPartners(rows ?? []);
      } catch {/* ignore */}
    })();
  }, []);

  // Periode-afleiding
  const effectiveRange = React.useMemo(() => {
    if (mode === "MONTH") return monthRangeFromPivot(pivotMonthISO);
    if (mode === "QUARTER") return currentQuarterRange();
    return {
      dateFrom: dateFrom || "",
      dateTo: dateTo || "",
      label:
        dateFrom && dateTo
          ? `${new Date(dateFrom).toLocaleDateString("nl-NL")} t/m ${new Date(dateTo).toLocaleDateString("nl-NL")}`
          : "Aangepaste periode",
    };
  }, [mode, pivotMonthISO, dateFrom, dateTo]);

  // Querystring sync — bij ALL geen partner-param schrijven
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const usp = new URLSearchParams(window.location.search);

    // partner
    if (partnerSlug && partnerSlug !== ALL) usp.set("partner", partnerSlug);
    else usp.delete("partner");

    // mode/period
    usp.set("mode", mode);
    if (mode === "MONTH") {
      usp.set("pivot", pivotMonthISO);
      usp.delete("dateFrom"); usp.delete("dateTo");
    } else if (mode === "QUARTER") {
      usp.delete("pivot"); usp.delete("dateFrom"); usp.delete("dateTo");
    } else {
      dateFrom ? usp.set("dateFrom", dateFrom) : usp.delete("dateFrom");
      dateTo ? usp.set("dateTo", dateTo) : usp.delete("dateTo");
      usp.delete("pivot");
    }

    // status
    if (status && status !== "CONFIRMED") usp.set("status", status); else usp.delete("status");

    // timeField (alleen tonen als niet default)
    if (timeField !== "slot") usp.set("timeField", timeField); else usp.delete("timeField");

    const newUrl = `${window.location.pathname}?${usp.toString()}`;
    window.history.replaceState(null, "", newUrl.endsWith("?") ? newUrl.slice(0, -1) : newUrl);
  }, [partnerSlug, mode, pivotMonthISO, dateFrom, dateTo, status, timeField]);

  // Data laden
  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      if (partnerSlug && partnerSlug !== ALL) p.set("partnerSlug", partnerSlug);
      p.set("status", status || "CONFIRMED");
      const range = effectiveRange;
      if (range.dateFrom) p.set("dateFrom", range.dateFrom);
      if (range.dateTo) p.set("dateTo", range.dateTo);
      if (timeField) p.set("timeField", timeField);

      const [rev, met] = await Promise.all([
        fetchJSON<RevenueResp>(`/api/revenue?${p.toString()}`),
        fetchJSON<SlotMetricsResp>(`/api/revenue/metrics?${p.toString()}`), // metrics mogen op zelfde params
      ]);

      setRevenue(rev);
      setMetrics(met.metrics);
    } catch (e: any) {
      setError(e?.message || "Fout bij laden van omzet/metrics.");
      setRevenue(null);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [partnerSlug, status, effectiveRange, timeField]);

  React.useEffect(() => { load(); }, [load]);

  // Navigatie helpers
  function prevMonth() { setMode("MONTH"); setPivotMonthISO((iso) => addMonths(iso, -1)); }
  function nextMonth() { setMode("MONTH"); setPivotMonthISO((iso) => addMonths(iso, +1)); }
  function thisMonth() { setMode("MONTH"); setPivotMonthISO(firstOfMonthISO()); }

  function setQuarter(q: 1 | 2 | 3 | 4) {
    setMode("QUARTER");
    const now = new Date();
    const { dateFrom, dateTo } = quarterRange(now.getFullYear(), q);
    setDateFrom(dateFrom); setDateTo(dateTo);
  }
  function prevQuarter() {
    setMode("QUARTER");
    const now = new Date();
    const q = quarterOf(now);
    const yearAdj = q === 1 ? now.getFullYear() - 1 : now.getFullYear();
    const qAdj = (q === 1 ? 4 : (q - 1)) as 1 | 2 | 3 | 4;
    const { dateFrom, dateTo } = quarterRange(yearAdj, qAdj);
    setDateFrom(dateFrom); setDateTo(dateTo);
  }
  function nextQuarter() {
    setMode("QUARTER");
    const now = new Date();
    const q = quarterOf(now);
    const yearAdj = q === 4 ? now.getFullYear() + 1 : now.getFullYear();
    const qAdj = (q === 4 ? 1 : (q + 1)) as 1 | 2 | 3 | 4;
    const { dateFrom, dateTo } = quarterRange(yearAdj, qAdj);
    setDateFrom(dateFrom); setDateTo(dateTo);
  }
  function thisQuarter() {
    setMode("QUARTER");
    const { dateFrom, dateTo } = currentQuarterRange();
    setDateFrom(dateFrom); setDateTo(dateTo);
  }

  function onExportPDF() {
    const p = new URLSearchParams();
    if (partnerSlug && partnerSlug !== ALL) p.set("partnerSlug", partnerSlug);
    p.set("status", status);
    const range = effectiveRange;
    if (range.dateFrom) p.set("dateFrom", range.dateFrom);
    if (range.dateTo) p.set("dateTo", range.dateTo);
    if (timeField) p.set("timeField", timeField);
    window.open(`/admin/(protected)/revenue/print?${p.toString()}`, "_blank");
  }

  const partnerTitle = React.useMemo(() => {
    if (partnerSlug === ALL) return "Alle hondenscholen";
    const p = partners.find((x) => x.slug === partnerSlug);
    return p?.name ?? partnerSlug ?? "—";
  }, [partners, partnerSlug]);

  const periodLabel = effectiveRange.label;

  // === Slots KPI (definitie: gepubliceerd = open(PUBLISHED) + geboekt(BOOKED)) ===
  const openPublished = Number(metrics?.slotsPublished) || 0; // PUBLISHED (open)
  const booked = Number(metrics?.slotsBooked) || 0;           // BOOKED (confirmed)
  const publishedTotal = openPublished + booked;              // gepubliceerd = open + confirmed
  const occupancyPct = publishedTotal > 0 ? Math.round((booked / publishedTotal) * 100) : 0;

  // === KPI’s (gebruik nieuwe API velden voor status-onafhankelijk) ===
  const cancellationsCount = revenue?.cancellationsCount ?? 0;
  const refundsTotalCents = revenue?.refundsTotalCents ?? 0;
  const ccy = revenue?.currency || revenue?.summary.currency || "EUR";

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-400" />
                Omzet — <span className="text-stone-700">{partnerTitle}</span>
              </span>
            </h1>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportPDF}
                className="h-8 rounded-lg border border-stone-900 bg-stone-900 px-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
              >
                Exporteer als PDF
              </button>
            </div>
          </div>
        </div>

        {/* Sticky filterbar */}
        <div
          className={[
            "sticky top-2 z-20 rounded-2xl border bg-white px-3 py-2 transition-shadow",
            stuck ? "border-stone-200 shadow-md" : "border-stone-200 shadow-sm",
          ].join(" ")}
          role="region"
          aria-label="Filters en periode"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* Links: partner + status + datumkeuze */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Partner-selectie incl. 'Alle hondenscholen' (default) */}
              <select
                aria-label="Kies partner"
                className="h-8 rounded-lg border border-stone-300 bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                value={partnerSlug}
                onChange={(e) => { setPartnerSlug(e.target.value); }}
              >
                <option value={ALL}>Alle hondenscholen</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name}{p.city ? ` — ${p.city}` : ""}
                  </option>
                ))}
              </select>

              {/* Status */}
              <ChipGroup label="Status">
                {["CONFIRMED","PENDING","CANCELLED","REFUNDED","ALL"].map(s => (
                  <Chip key={s} active={status===s} onClick={() => setStatus(s)}>
                    {s === "CONFIRMED" ? "Bevestigd"
                      : s === "PENDING" ? "In afwachting"
                      : s === "CANCELLED" ? "Geannuleerd"
                      : s === "REFUNDED" ? "Refunded"
                      : "Alles"}
                  </Chip>
                ))}
              </ChipGroup>

              {/* Datumkeuze */}
              <ChipGroup label="Datum">
                <Chip active={timeField==="slot"} onClick={()=>setTimeField("slot")}>Speeldatum</Chip>
                <Chip active={timeField==="created"} onClick={()=>setTimeField("created")}>Boekingsdatum</Chip>
              </ChipGroup>
            </div>

            {/* Rechts: periode-navigatie */}
            <div className="flex flex-wrap items-center gap-2">
              <ChipGroup label="Periode">
                <Chip active={mode==="MONTH"} onClick={()=>setMode("MONTH")}>Maand</Chip>
                <Chip active={mode==="QUARTER"} onClick={()=>setMode("QUARTER")}>Kwartaal</Chip>
                <Chip active={mode==="CUSTOM"} onClick={()=>setMode("CUSTOM")}>Aangepast</Chip>
              </ChipGroup>

              {mode === "MONTH" && (
                <div className="inline-flex gap-1">
                  <NavBtn onClick={prevMonth}>Vorige maand</NavBtn>
                  <NavBtn onClick={thisMonth}>Deze maand</NavBtn>
                  <NavBtn onClick={nextMonth}>Volgende maand</NavBtn>
                </div>
              )}
              {mode === "QUARTER" && (
                <>
                  <div className="inline-flex gap-1">
                    <NavBtn onClick={prevQuarter}>Vorig kwartaal</NavBtn>
                    <NavBtn onClick={thisQuarter}>Dit kwartaal</NavBtn>
                    <NavBtn onClick={nextQuarter}>Volgend kwartaal</NavBtn>
                  </div>
                  <div className="inline-flex gap-1">
                    {[1,2,3,4].map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuarter(q as 1|2|3|4)}
                        className="h-8 rounded-lg border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-900 shadow-sm transition hover:bg-stone-100"
                      >
                        Q{q}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {mode === "CUSTOM" && (
                <>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-8 rounded-lg border border-stone-300 bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    aria-label="Datum vanaf"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-8 rounded-lg border border-stone-300 bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    aria-label="Datum t/m"
                  />
                </>
              )}
            </div>
          </div>

          {/* Periode badge */}
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-lg bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-700 ring-1 ring-stone-200">
              🗓️ Periode: <span className="text-stone-900">{periodLabel}</span>
              <span className="ml-1 text-[11px] text-stone-500">• op {timeField === "slot" ? "speeldatum" : "boekingsdatum"}</span>
            </span>
            {loading && <span className="text-[11px] text-stone-500">Laden…</span>}
            {error && <span className="text-[11px] text-red-700">{error}</span>}
          </div>
        </div>

        {/* KPI’s — financieel (gefilterd op gekozen status) */}
        <section className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          <KPI icon="💶" label="Totaal omzet" value={euro(revenue?.summary.totalTurnoverCents, revenue?.summary.currency)} />
          <KPI icon="🏷️" label="Fee D-EscapeRoom" value={euro(revenue?.summary.totalPlatformFeeCents, revenue?.summary.currency)} />
          <KPI icon="🐾" label="Fee hondenschool" value={euro(revenue?.summary.totalPartnerFeeCents, revenue?.summary.currency)} />
          <KPI icon="🎁" label="Kortingen" value={euro(revenue?.summary.totalDiscountsCents, revenue?.summary.currency)} />
        </section>

        {/* KPI’s — exact 3 naast elkaar: Boekingen (gefilterd) • Annuleringen (all) • Refund totaal (all) */}
        <section className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <KPI icon="🧾" label="Boekingen" value={(revenue?.summary.count ?? 0).toString()} />
          <KPI icon="🚫" label="Annuleringen" value={String(cancellationsCount)} />
          <KPI icon="↩️" label="Refund totaal" value={euro(refundsTotalCents, ccy)} />
        </section>

        {/* KPI’s — slots / bezetting */}
        <section className="grid grid-cols-2 gap-2 md:grid-cols-2">
          <KPI icon="📣" label="Slots gepubliceerd" value={String(publishedTotal)} />
          <KPI icon="✅" label="Slots geboekt" value={String(booked)}>
            <Progress pct={occupancyPct} label={`${occupancyPct}% bezetting`} />
          </KPI>
        </section>

        {/* Tabel */}
        <section className="rounded-2xl bg-white p-0 shadow-sm ring-1 ring-stone-200 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2">
            <h2 className="text-lg font-extrabold">📊 Overzicht</h2>
            <span className="text-[11px] text-stone-500">
              {revenue?.items?.length ?? 0} regel(s)
            </span>
          </div>

          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-stone-50 text-stone-600 shadow-sm">
                <tr>
                  <Th>Datum</Th>
                  <Th>Partner</Th>
                  <Th className="text-right">Totaal</Th>
                  <Th className="text-right">Aanbetaling</Th>
                  <Th className="text-right">On-site</Th>
                  <Th className="text-right">Korting</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {loading && <SkeletonRows cols={7} rows={6} />}
                {!loading && revenue?.items?.length
                  ? revenue.items.map((it) => (
                      <tr key={it.id} className="border-t hover:bg-stone-50/80">
                        <Td>{it.date ? new Date(it.date).toLocaleDateString("nl-NL") : "-"}</Td>
                        <Td className="max-w-[220px] truncate">{it.partnerName ?? "-"}</Td>
                        <Td className="text-right">{euro(it.totalAmountCents, it.currency)}</Td>
                        <Td className="text-right">{euro(it.platformFeeCents, it.currency)}</Td>
                        <Td className="text-right">{euro(it.partnerFeeCents, it.currency)}</Td>
                        <Td className="text-right">{euro(it.discountCents, it.currency)}</Td>
                        <Td>
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px]">{it.status}</span>
                        </Td>
                      </tr>
                    ))
                  : !loading && (
                    <tr>
                      <td colSpan={7} className="p-8">
                        <EmptyState onReset={thisMonth} title="Geen resultaten in deze periode">
                          Pas je filters aan of ga naar <b>Deze maand</b>.
                        </EmptyState>
                      </td>
                    </tr>
                  )
                }
              </tbody>
              {!loading && revenue?.items?.length ? (
                <tfoot className="bg-stone-50/60 text-stone-700">
                  <tr>
                    <Td className="font-semibold">Totaal</Td>
                    <Td />
                    <Td className="text-right font-semibold">{euro(revenue.summary.totalTurnoverCents, revenue.summary.currency)}</Td>
                    <Td className="text-right font-semibold">{euro(revenue.summary.totalPlatformFeeCents, revenue.summary.currency)}</Td>
                    <Td className="text-right font-semibold">{euro(revenue.summary.totalPartnerFeeCents, revenue.summary.currency)}</Td>
                    <Td className="text-right font-semibold">{euro(revenue.summary.totalDiscountsCents, revenue.summary.currency)}</Td>
                    <Td />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ================================
   Presentational helpers
================================ */
function KPI({
  icon,
  label,
  value,
  children,
}: {
  icon: string;
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="text-2xl" aria-hidden>{icon}</div>
        <span className="h-1 w-12 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 opacity-60" />
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-0.5 text-lg font-extrabold tracking-tight">{value ?? "–"}</div>
      {children}
    </div>
  );
}

/** SVG-progressbar (geen inline style → CSP-proof) */
function Progress({ pct, label }: { pct: number | string; label?: string }) {
  const num = typeof pct === "string" ? parseFloat(pct) : pct;
  const v = Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : 0;
  const gid = React.useId(); // unieke gradient-id per render
  return (
    <div className="mt-2">
      <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-2 w-full">
        <defs>
          <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="8" rx="4" fill="#e5e5e5" />
        <rect x="0" y="0" width={v} height="8" rx="4" fill={`url(#${gid})`} />
      </svg>
      <div className="mt-1 text-[10px] text-stone-600">{label ?? `${v}%`}</div>
    </div>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white p-0.5 shadow-sm" role="tablist" aria-label={label}>
      {children}
    </div>
  );
}
function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-md px-2.5 py-1 text-xs font-semibold transition",
        active ? "bg-pink-600 text-white" : "text-stone-900 hover:bg-stone-100"
      ].join(" ")}
      aria-pressed={!!active}
      role="tab"
      type="button"
    >
      {children}
    </button>
  );
}
function NavBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-8 rounded-lg border border-pink-500 bg-white px-2 text-xs font-semibold text-stone-900 shadow-sm transition hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
      type="button"
    >
      {children}
    </button>
  );
}

function Th({ children, className = "" }: any) {
  return <th className={`px-3 py-2 text-left text-xs font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: any) {
  return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}

function SkeletonRows({ rows = 6, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-3 py-2">
              <div className="h-3 w-full animate-pulse rounded bg-stone-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyState({
  title,
  children,
  onReset,
}: {
  title: string;
  children?: React.ReactNode;
  onReset?: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="mx-auto mb-2 h-10 w-10 rounded-2xl bg-stone-100 p-2">📭</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-stone-600">{children}</p>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-3 inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-900 shadow-sm hover:bg-stone-100"
          type="button"
        >
          Deze maand
        </button>
      )}
    </div>
  );
}
