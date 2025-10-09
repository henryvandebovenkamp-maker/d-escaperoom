// PATH: src/app/admin/(protected)/revenue/page.tsx
"use client";

import * as React from "react";

/* =========================================================
   Admin • Revenue (omzet)
   - Alleen de HEADER is sticky
   - Partnerselector: VERBORGEN (wel via URL ?partner=…)
   - Geen datumtype-keuze (altijd speeldatum)
   - Default status = CONFIRMED
   - Export-knoppen onderaan bij "Overzicht"
   - Status UI in NL (data/API blijft EN)
   ======================================================= */

/* ================================
   Types — conform API's
================================ */
type PartnerRow = { id: string; name: string; slug: string; city: string | null };

type RevenueItem = {
  id: string;
  date: string | null;              // ISO (slot.startTime)
  partnerName: string | null;
  partnerSlug: string | null;
  customerName?: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED" | string;
  currency: string;
  totalAmountCents: number;
  platformFeeCents: number;         // aanbetaling (platform)
  partnerFeeCents: number;          // on-site netto
  discountCents: number;            // korting (totaal)
  refundedAmountCents?: number | null;
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
  summary: SummaryBlock;
  items: RevenueItem[];
  summaryAll: SummaryBlock;
  summaryByStatus: Record<"PENDING"|"CONFIRMED"|"CANCELLED"|"REFUNDED", Omit<SummaryBlock, "currency">>;
  cancellationsCount: number;
  refundsTotalCents: number;
  currency: string;
};

// Metrics-API kan in 2 smaken voorkomen
type RevenueMetricsRespA = { ok?: boolean; counts?: Record<string, number> };
type RevenueMetricsRespB = { ok?: boolean; metrics?: { slotsPublished: number; slotsBooked: number; occupancyRate?: number } };

/* ================================
   Helpers
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
   UI translations (status)
================================ */
function nlStatus(status?: string) {
  switch ((status || "").toUpperCase()) {
    case "CONFIRMED": return "BEVESTIGD";
    case "CANCELLED": return "GEANNULEERD";
    case "REFUNDED":  return "TERUGGEBOEKT";
    case "PENDING":   return "IN AFWACHTING";
    default:          return status || "—";
  }
}

/* ================================
   Page — Admin Revenue
================================ */
type PeriodMode = "MONTH" | "QUARTER" | "CUSTOM";
type TimeField = "slot" | "created";
const ALL = "__ALL__";

type SortKey = "date" | "customerName" | "total" | "platform" | "partner" | "discount" | "status" | "refund";
type SortDir = "asc" | "desc";

export default function AdminRevenuePage() {
  // State — filters (defaults)
  const [partners, setPartners] = React.useState<PartnerRow[]>([]);
  const [partnerSlug, setPartnerSlug] = React.useState<string>(ALL);
  const [mode, setMode] = React.useState<PeriodMode>("MONTH");
  const [pivotMonthISO, setPivotMonthISO] = React.useState<string>(firstOfMonthISO());
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");

  // ✅ Default = CONFIRMED (betaald)
  const [status, setStatus] = React.useState<string>("CONFIRMED");

  // ✅ Altijd speeldatum
  const timeField: TimeField = "slot";

  // Data
  const [revenue, setRevenue] = React.useState<RevenueResp | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // (Niet zichtbaar, maar code blijft intact)
  const [cancelledItems, setCancelledItems] = React.useState<RevenueItem[]>([]);
  const [refundedItems, setRefundedItems] = React.useState<RevenueItem[]>([]);
  const [loadingCancelled, setLoadingCancelled] = React.useState<boolean>(false);
  const [errorCancelled, setErrorCancelled] = React.useState<string | null>(null);

  // Sorting
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [sortKeyCX, setSortKeyCX] = React.useState<SortKey>("date");
  const [sortDirCX, setSortDirCX] = React.useState<SortDir>("desc");

  // Metrics
  const [slotsPublished, setSlotsPublished] = React.useState<number>(0);
  const [slotsBooked, setSlotsBooked] = React.useState<number>(0);

  // Init uit URL (client-only)
  React.useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const urlPartner = sp.get("partner");
    const urlStatus = (sp.get("status") || "").toUpperCase();
    const urlMode = (sp.get("mode") || "").toUpperCase() as PeriodMode | "";
    const urlPivot = (sp.get("pivot") || "");
    const urlFrom = (sp.get("dateFrom") || "");
    const urlTo = (sp.get("dateTo") || "");

    if (urlPartner) setPartnerSlug(urlPartner);
    if (urlStatus === "ALL" || urlStatus === "PENDING" || urlStatus === "CANCELLED" || urlStatus === "REFUNDED" || urlStatus === "CONFIRMED") {
      setStatus(urlStatus || "CONFIRMED");
    }
    if (urlMode === "MONTH" || urlMode === "QUARTER" || urlMode === "CUSTOM") setMode(urlMode);
    if (urlPivot) setPivotMonthISO(urlPivot);
    if (urlFrom) setDateFrom(urlFrom);
    if (urlTo) setDateTo(urlTo);
  }, []);

  // Partner list (blijft opgehaald; nodig voor titel)
  React.useEffect(() => {
    (async () => {
      try {
        const rows = await fetchJSON<PartnerRow[]>("/api/partners/list");
        setPartners(rows ?? []);
      } catch {/* ignore */}
    })();
  }, []);

  // Effective period
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

  // URL Sync
  React.useEffect(() => {
    const usp = new URLSearchParams(window.location.search);

    if (partnerSlug && partnerSlug !== ALL) usp.set("partner", partnerSlug); else usp.delete("partner");
    usp.set("mode", mode);
    if (mode === "MONTH") { usp.set("pivot", pivotMonthISO); usp.delete("dateFrom"); usp.delete("dateTo"); }
    else if (mode === "QUARTER") { usp.delete("pivot"); usp.delete("dateFrom"); usp.delete("dateTo"); }
    else {
      dateFrom ? usp.set("dateFrom", dateFrom) : usp.delete("dateFrom");
      dateTo ? usp.set("dateTo", dateTo) : usp.delete("dateTo");
      usp.delete("pivot");
    }
    if (status && status !== "CONFIRMED") usp.set("status", status); else usp.delete("status");

    const newUrl = `${window.location.pathname}?${usp.toString()}`;
    window.history.replaceState(null, "", newUrl.endsWith("?") ? newUrl.slice(0, -1) : newUrl);
  }, [partnerSlug, mode, pivotMonthISO, dateFrom, dateTo, status]);

  // Load hoofd-data + metrics
  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      if (partnerSlug && partnerSlug !== ALL) p.set("partnerSlug", partnerSlug);
      p.set("status", status || "CONFIRMED");
      const range = effectiveRange;
      if (range.dateFrom) p.set("dateFrom", range.dateFrom);
      if (range.dateTo) p.set("dateTo", range.dateTo);
      p.set("timeField", "slot");

      const [rev, metRaw] = await Promise.all([
        fetchJSON<RevenueResp>(`/api/revenue?${p.toString()}`),
        fetchJSON<RevenueMetricsRespA | RevenueMetricsRespB>(`/api/revenue/metrics?${p.toString()}`),
      ]);

      setRevenue(rev);

      let published = 0, booked = 0;
      if ("counts" in metRaw && metRaw.counts) {
        published = Number(metRaw.counts.PUBLISHED ?? 0);
        booked = Number(metRaw.counts.BOOKED ?? 0);
      } else if ("metrics" in metRaw && metRaw.metrics) {
        published = Number(metRaw.metrics.slotsPublished ?? 0);
        booked = Number(metRaw.metrics.slotsBooked ?? 0);
      }
      setSlotsPublished(published);
      setSlotsBooked(booked);
    } catch (e: any) {
      setError(e?.message || "Fout bij laden van omzet/metrics.");
      setRevenue(null);
      setSlotsPublished(0);
      setSlotsBooked(0);
    } finally {
      setLoading(false);
    }
  }, [partnerSlug, status, effectiveRange]);

  React.useEffect(() => { load(); }, [load]);

  // Geannuleerd/refunded (niet zichtbaar)
  const loadCancelledRefunds = React.useCallback(async () => {
    setLoadingCancelled(true); setErrorCancelled(null);
    try {
      const common = new URLSearchParams();
      if (partnerSlug && partnerSlug !== ALL) common.set("partnerSlug", partnerSlug);
      const range = effectiveRange;
      if (range.dateFrom) common.set("dateFrom", range.dateFrom);
      if (range.dateTo) common.set("dateTo", range.dateTo);
      common.set("timeField", "slot");

      const [cx, rf] = await Promise.all([
        fetchJSON<RevenueResp>(`/api/revenue?${new URLSearchParams({ ...Object.fromEntries(common), status: "CANCELLED" }).toString()}`),
        fetchJSON<RevenueResp>(`/api/revenue?${new URLSearchParams({ ...Object.fromEntries(common), status: "REFUNDED" }).toString()}`),
      ]);

      setCancelledItems(cx.items ?? []);
      setRefundedItems(rf.items ?? []);
    } catch (e: any) {
      setErrorCancelled(e?.message || "Fout bij laden van geannuleerde/refunded boekingen.");
      setCancelledItems([]);
      setRefundedItems([]);
    } finally {
      setLoadingCancelled(false);
    }
  }, [partnerSlug, effectiveRange]);

  React.useEffect(() => { loadCancelledRefunds(); }, [loadCancelledRefunds]);

  // Labels
  const partnerTitle = React.useMemo(() => {
    if (partnerSlug === ALL) return "Alle hondenscholen";
    const p = partners.find((x) => x.slug === partnerSlug);
    return p?.name ?? partnerSlug ?? "—";
  }, [partners, partnerSlug]);

  const periodLabel = effectiveRange.label;

  // Insights
  const openPublished = Number(slotsPublished) || 0;
  const booked = Number(slotsBooked) || 0;
  const publishedTotal = openPublished + booked;
  const occupancyPct = publishedTotal > 0 ? Math.round((booked / publishedTotal) * 100) : 0;

  const cancellationsCount = revenue?.cancellationsCount ?? 0;
  const refundsTotalCents = revenue?.refundsTotalCents ?? 0;
  const ccy = revenue?.currency ?? revenue?.summary?.currency ?? "EUR";

  // Refund helper
  const refundedOf = (it: RevenueItem) =>
    it.status === "REFUNDED" ? (it.refundedAmountCents ?? it.platformFeeCents) : 0;

  // Sorting
  const viewedItems = React.useMemo(() => {
    const arr = [...(revenue?.items ?? [])];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "date":         return dir * ((new Date(a.date||0).getTime()) - (new Date(b.date||0).getTime()));
        case "customerName": return dir * ((a.customerName||"").localeCompare(b.customerName||""));
        case "total":        return dir * (a.totalAmountCents - b.totalAmountCents);
        case "platform":     return dir * (a.platformFeeCents - b.platformFeeCents);
        case "partner":      return dir * (a.partnerFeeCents - b.partnerFeeCents);
        case "discount":     return dir * (a.discountCents - b.discountCents);
        case "status":       return dir * ((a.status||"").localeCompare(b.status||""));
        case "refund":       return dir * (refundedOf(a) - refundedOf(b));
        default:             return 0;
      }
    });
    return arr;
  }, [revenue?.items, sortKey, sortDir]);

  function setSort(next: SortKey) {
    setSortDir(prev => (sortKey === next ? (prev === "asc" ? "desc" : "asc") : "asc"));
    setSortKey(next);
  }
  function setSortCX(next: SortKey) {
    setSortDirCX(prev => (sortKeyCX === next ? (prev === "asc" ? "desc" : "asc") : "asc"));
    setSortKeyCX(next);
  }

  const tableRefundsTotalCents = React.useMemo(
    () => viewedItems.reduce((s, it) => s + refundedOf(it), 0),
    [viewedItems]
  );

  // CSV export
  function exportMainCSV() {
    const items = (viewedItems ?? []);
    const rows = [
      ["Datum","Partner","Naam klant","Status","Totaal","€ fee","jouw omzet","Korting","Teruggestort","Valuta"].join(";"),
      ...items.map(it => [
        it.date ? new Date(it.date).toLocaleDateString("nl-NL") : "-",
        (it.partnerName ?? "-").replaceAll(";", ","),
        (it.customerName ?? "-").replaceAll(";", ","),
        it.status,
        (it.totalAmountCents/100).toFixed(2),
        (it.platformFeeCents/100).toFixed(2),
        (it.partnerFeeCents/100).toFixed(2),
        (it.discountCents/100).toFixed(2),
        (refundedOf(it)/100).toFixed(2),
        it.currency || "EUR",
      ].join(";"))
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `revenue-${periodLabel.replace(/\s+/g,"_")}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-4">

        {/* ✅ Alleen HEADER sticky */}
        <section className="sticky top-2 z-20 rounded-2xl border border-stone-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-400" />
                  Omzetcijfers
                </span>
              </h1>
              <div className="mt-0.5 text-xs sm:text-sm text-stone-600">
                Periode: <b className="text-stone-900">{periodLabel}</b>
              </div>
            </div>
            {/* partner selector blijft onzichtbaar */}
          </div>
        </section>

        {/* 🔽 Alles hieronder NIET sticky 🔽 */}

        {/* Filters (status / periode / custom pickers) */}
        <section className="rounded-2xl border border-stone-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2">
            {/* Status */}
            <div className="lg:col-span-5">
              <ChipGroup label="Status">
                <Chip active={status==="CONFIRMED"} onClick={()=>setStatus("CONFIRMED")}>Bevestigd</Chip>
                <Chip active={status==="CANCELLED"} onClick={()=>setStatus("CANCELLED")}>Geannuleerd</Chip>
                <Chip active={status==="REFUNDED"}  onClick={()=>setStatus("REFUNDED")}>Terugboekt</Chip>
                <Chip active={status==="ALL"}       onClick={()=>setStatus("ALL")}>Alle</Chip>
              </ChipGroup>
            </div>

            {/* Periode + navigatie */}
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                <ChipGroup label="Periode">
                  <Chip active={mode==="MONTH"} onClick={()=>setMode("MONTH")}>Maand</Chip>
                  <Chip active={mode==="QUARTER"} onClick={()=>setMode("QUARTER")}>Kwartaal</Chip>
                  <Chip active={mode==="CUSTOM"} onClick={()=>setMode("CUSTOM")}>Aangepast</Chip>
                </ChipGroup>
                {mode === "MONTH" && (
                  <div className="inline-flex gap-1">
                    <NavBtn onClick={()=>setPivotMonthISO((iso) => addMonths(iso, -1))} ariaLabel="Vorige maand">◀</NavBtn>
                    <NavBtn onClick={()=>setPivotMonthISO(firstOfMonthISO())}>Deze maand</NavBtn>
                    <NavBtn onClick={()=>setPivotMonthISO((iso) => addMonths(iso, +1))} ariaLabel="Volgende maand">▶</NavBtn>
                  </div>
                )}
              </div>
            </div>

            {/* Custom datepickers */}
            {mode === "CUSTOM" && (
              <div className="lg:col-span-12 flex flex-wrap gap-2">
                <label className="sr-only" htmlFor="dateFrom">Datum vanaf</label>
                <input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 rounded-lg border border-stone-300 bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <label className="sr-only" htmlFor="dateTo">Datum t/m</label>
                <input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 rounded-lg border border-stone-300 bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            )}
          </div>

          {/* micro-pills onder de filters */}
          <div className="mt-3 flex flex-wrap items-center gap-1">
            <PillMini>Boekingen: <b className="ml-1">{revenue?.summary.count ?? 0}</b></PillMini>
            <PillMini>Bezetting: <b className="ml-1">{occupancyPct}%</b></PillMini>
            <PillMini>Annuleringen: <b className="ml-1">{cancellationsCount}</b></PillMini>
            <PillMini>Terugboekt: <b className="ml-1">{euro(refundsTotalCents, ccy)}</b></PillMini>
          </div>
        </section>

        {/* KPI’s — financieel (primair) */}
        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <KPI icon="💶" label="TOTAAL" value={euro(revenue?.summary.totalTurnoverCents, revenue?.summary.currency)} />
          <KPI icon="🏷️" label="€ FEE " value={euro(revenue?.summary.totalPlatformFeeCents, revenue?.summary.currency)} />
          <KPI icon="🐾" label=" € JULLIE OMZET" value={euro(revenue?.summary.totalPartnerFeeCents, revenue?.summary.currency)} />
          <KPI icon="🎁" label="GEGEVEN KORTING" value={euro(revenue?.summary.totalDiscountsCents, revenue?.summary.currency)} />
        </section>

        {/* Tabel — hoofdoverzicht */}
        <section className="rounded-2xl bg-white p-0 shadow-sm ring-1 ring-stone-200 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <h2 className="text-lg font-extrabold">📊 Overzicht</h2>
            <span className="text-[11px] text-stone-500">{revenue?.items?.length ?? 0} regel(s)</span>
          </div>

          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm">
              {/* Tabel header blijft sticky zoals elders in admin */}
              <thead className="sticky top-0 z-10 bg-stone-50 text-stone-600 shadow-sm">
                <tr>
                  <Th sortable onSort={() => setSort("date")}          active={sortKey==="date"}          dir={sortDir}>Datum</Th>
                  <Th sortable onSort={() => setSort("customerName")}   active={sortKey==="customerName"}  dir={sortDir}>Naam klant</Th>
                  <Th className="text-right" sortable onSort={() => setSort("total")}     active={sortKey==="total"}     dir={sortDir}>Totaal</Th>
                  <Th className="text-right" sortable onSort={() => setSort("platform")}  active={sortKey==="platform"}  dir={sortDir}>€ fee</Th>
                  <Th className="text-right" sortable onSort={() => setSort("partner")}   active={sortKey==="partner"}   dir={sortDir}>jouw omzet</Th>
                  <Th className="text-right" sortable onSort={() => setSort("discount")}  active={sortKey==="discount"}  dir={sortDir}>Korting</Th>
                  <Th sortable onSort={() => setSort("status")}         active={sortKey==="status"}        dir={sortDir}>Status</Th>
                  <Th className="text-right" sortable onSort={() => setSort("refund")}    active={sortKey==="refund"}     dir={sortDir}>Terugboekt</Th>
                </tr>
              </thead>
              <tbody>
                {loading && <SkeletonRows cols={8} rows={6} />}
                {!loading && (revenue?.items?.length ?? 0) > 0
                  ? viewedItems.map((it) => {
                      const refundedCents = refundedOf(it);
                      return (
                        <tr key={it.id} className="border-t hover:bg-stone-50/80">
                          <Td>{it.date ? new Date(it.date).toLocaleDateString("nl-NL") : "-"}</Td>
                          <Td className="max-w-[260px] truncate" title={(it.customerName ?? "-")}>
                            {it.customerName ?? "-"}
                          </Td>
                          <Td className="text-right font-medium">{euro(it.totalAmountCents, it.currency)}</Td>
                          <Td className="text-right">{euro(it.platformFeeCents, it.currency)}</Td>
                          <Td className="text-right">{euro(it.partnerFeeCents, it.currency)}</Td>
                          <Td className="text-right">{euro(it.discountCents, it.currency)}</Td>
                          <Td>
                            <span
                              className={[
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                it.status === "CONFIRMED" ? "bg-green-100 text-green-800" :
                                it.status === "PENDING"   ? "bg-amber-100 text-amber-800" :
                                it.status === "CANCELLED" ? "bg-purple-100 text-purple-800" :
                                it.status === "REFUNDED"  ? "bg-rose-100 text-rose-800" :
                                "bg-stone-100 text-stone-800"
                              ].join(" ")}
                            >
                              {nlStatus(it.status)}
                            </span>
                          </Td>
                          <Td className="text-right">
                            {refundedCents > 0 ? euro(refundedCents, it.currency) : <span className="text-stone-500">—</span>}
                          </Td>
                        </tr>
                      );
                    })
                  : !loading && (
                    <tr>
                      <td colSpan={8} className="p-8">
                        <EmptyState onReset={() => setMode("MONTH")} title="Geen resultaten in deze periode">
                          Pas je filters aan of ga naar <b>Deze maand</b>.
                        </EmptyState>
                      </td>
                    </tr>
                  )
                }
              </tbody>
              {!loading && (revenue?.items?.length ?? 0) > 0 ? (
                <tfoot className="bg-stone-50/60 text-stone-700">
                  <tr>
                    <Td className="font-semibold">Totaal</Td>
                    <Td />
                    <Td className="text-right font-semibold">{euro(revenue!.summary.totalTurnoverCents, revenue!.summary.currency)}</Td>
                    <Td className="text-right font-semibold">{euro(revenue!.summary.totalPlatformFeeCents, revenue!.summary.currency)}</Td>
                    <Td className="text-right font-semibold">{euro(revenue!.summary.totalPartnerFeeCents, revenue!.summary.currency)}</Td>
                    <Td className="text-right font-semibold">{euro(revenue!.summary.totalDiscountsCents, revenue!.summary.currency)}</Td>
                    <Td />
                    <Td className="text-right font-semibold">
                      {euro(tableRefundsTotalCents, ccy)}
                    </Td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          {/* ✅ Export-acties onderaan bij Overzicht */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 px-3 py-2">
            <button
              type="button"
              onClick={exportMainCSV}
              className="h-8 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
            >
              Exporteer CSV
            </button>
            <button
              type="button"
              onClick={()=>{
                const p = new URLSearchParams();
                if (partnerSlug && partnerSlug !== ALL) p.set("partnerSlug", partnerSlug);
                p.set("status", status || "CONFIRMED");
                const range = effectiveRange;
                if (range.dateFrom) p.set("dateFrom", range.dateFrom);
                if (range.dateTo) p.set("dateTo", range.dateTo);
                p.set("timeField", "slot");
                window.open(`/admin/revenue/print?${p.toString()}`, "_blank");
              }}
              className="h-8 rounded-lg border border-stone-900 bg-stone-900 px-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
            >
              Exporteer PDF
            </button>
          </div>

          {error && (
            <div className="px-3 py-2 text-sm text-rose-700 bg-rose-50 border-t border-rose-200">
              {error}
            </div>
          )}
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

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-stone-300 bg-white p-0.5 shadow-sm" role="tablist" aria-label={label}>
      {children}
    </div>
  );
}
function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-md px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/40",
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
function NavBtn({ children, onClick, ariaLabel }: { children: React.ReactNode; onClick: () => void; ariaLabel?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="h-8 rounded-lg border border-pink-500 bg-white px-2 text-xs font-semibold text-stone-900 shadow-sm transition hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
      type="button"
    >
      {children}
    </button>
  );
}

function Th({
  children,
  className = "",
  sortable,
  onSort,
  active,
  dir,
}: {
  children: React.ReactNode;
  className?: string;
  sortable?: boolean;
  onSort?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
}) {
  const base = "px-3 py-2 text-left text-xs font-semibold";
  if (!sortable) return <th className={`${base} ${className}`}>{children}</th>;
  return (
    <th className={`${base} ${className}`}>
      <button
        type="button"
        onClick={onSort}
        className={[
          "inline-flex items-center gap-1 rounded px-0.5 py-0.5 hover:bg-stone-100",
          active ? "text-stone-900" : "text-stone-600"
        ].join(" ")}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{children}</span>
        <span className="text-[11px]" aria-hidden>
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}
function Td({ children, className = "" }: any) {
  return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}

function SkeletonRows({ rows = 6, cols = 8 }: { rows?: number; cols?: number }) {
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

/* --- Micro pill (10px) for ultra-compact insights --- */
function PillMini({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-700 ring-1 ring-stone-200">
      {children}
    </span>
  );
}
