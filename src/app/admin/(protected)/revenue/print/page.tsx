// PATH: src/app/admin/(protected)/revenue/print/page.tsx
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

/* ===== Types (matchen met /api/revenue) ===== */
type RevenueItem = {
  id: string;
  date: string | null;
  partnerName: string | null;
  customerName?: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED" | string;
  currency: string;
  totalAmountCents: number;
  platformFeeCents: number;
  partnerFeeCents: number;
  discountCents: number;
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
  summary: SummaryBlock;
  items: RevenueItem[];
  currency: string;
};

const euro = (n?: number | null, ccy = "EUR") =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: ccy }).format(((n ?? 0) as number) / 100);

export default function RevenuePrintPage() {
  const sp = useSearchParams();

  // Query-params overnemen (partnerSlug, status, dateFrom, dateTo, timeField=slot)
  const partnerSlug = sp.get("partnerSlug") || "";
  const status = (sp.get("status") || "CONFIRMED").toUpperCase();
  const dateFrom = sp.get("dateFrom") || "";
  const dateTo = sp.get("dateTo") || "";
  const timeField = "slot"; // geforceerd speeldatum

  const [data, setData] = React.useState<RevenueResp | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (partnerSlug) params.set("partnerSlug", partnerSlug);
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("timeField", timeField);

    (async () => {
      try {
        const r = await fetch(`/api/revenue?${params.toString()}`, { cache: "no-store", credentials: "include" });
        if (!r.ok) throw new Error(await r.text());
        const json = (await r.json()) as RevenueResp;
        setData(json);
        setTimeout(() => {
          // kleine delay zodat fonts/layout staan
          window.print();
        }, 200);
      } catch (e: any) {
        setErr(e?.message || "Fout bij laden");
      } finally {
        setLoading(false);
      }
    })();
  }, [partnerSlug, status, dateFrom, dateTo]);

  // opmaak helpers
  const periodLabel =
    dateFrom && dateTo
      ? `${new Date(dateFrom).toLocaleDateString("nl-NL")} t/m ${new Date(dateTo).toLocaleDateString("nl-NL")}`
      : "Periode";

  return (
    <div className="bg-white text-stone-900 p-6 print:p-0">
      {/* Kop */}
      <header className="mb-4 border-b border-stone-200 pb-3 print:mb-2 print:pb-2">
        <h1 className="text-2xl font-bold tracking-tight">Omzet — Overzicht</h1>
        <p className="text-sm text-stone-600">
          Status: <b>{status}</b> · Datumtype: <b>Speeldatum</b> · Periode: <b>{periodLabel}</b>
        </p>

        {/* Alleen zichtbaar op scherm, niet in PDF */}
        <div className="mt-3 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="h-9 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold shadow-sm hover:bg-stone-50"
          >
            Print / PDF opslaan
          </button>
          <button
            onClick={() => window.close()}
            className="h-9 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold shadow-sm hover:bg-stone-50"
          >
            Sluiten
          </button>
        </div>
      </header>

      {/* Lichaam */}
      {loading && <p className="text-sm text-stone-600">Laden…</p>}
      {err && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 print:border-0 print:bg-white">
          {err}
        </p>
      )}

      {!loading && !err && data && (
        <>
          {/* KPI's */}
          <section className="mb-4 grid grid-cols-2 gap-2 text-sm print:mb-3 print:gap-1 md:grid-cols-4">
            <KPI label="Totaal omzet" value={euro(data.summary.totalTurnoverCents, data.summary.currency)} />
            <KPI label="Fee D-EscapeRoom" value={euro(data.summary.totalPlatformFeeCents, data.summary.currency)} />
            <KPI label="Fee hondenschool" value={euro(data.summary.totalPartnerFeeCents, data.summary.currency)} />
            <KPI label="Kortingen" value={euro(data.summary.totalDiscountsCents, data.summary.currency)} />
          </section>

          {/* Tabel */}
          <section className="rounded-xl border border-stone-200 print:border-0">
            <table className="w-full border-collapse text-[12px] leading-5">
              <thead className="bg-stone-50 print:bg-white">
                <tr className="text-stone-600">
                  <Th>Datum</Th>
                  <Th>Partner</Th>
                  <Th>Naam klant</Th>
                  <Th className="text-right">Totaal</Th>
                  <Th className="text-right">€ fee</Th>
                  <Th className="text-right">jouw omzet</Th>
                  <Th className="text-right">Korting</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Teruggestort</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.id} className="border-t border-stone-200 print:border-stone-100">
                    <Td>{it.date ? new Date(it.date).toLocaleDateString("nl-NL") : "-"}</Td>
                    <Td>{it.partnerName ?? "-"}</Td>
                    <Td className="max-w-[240px] truncate">{it.customerName ?? "-"}</Td>
                    <Td className="text-right">{euro(it.totalAmountCents, it.currency)}</Td>
                    <Td className="text-right">{euro(it.platformFeeCents, it.currency)}</Td>
                    <Td className="text-right">{euro(it.partnerFeeCents, it.currency)}</Td>
                    <Td className="text-right">{euro(it.discountCents, it.currency)}</Td>
                    <Td>{it.status}</Td>
                    <Td className="text-right">
                      {it.status === "REFUNDED"
                        ? euro(it.refundedAmountCents ?? it.platformFeeCents, it.currency)
                        : "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-stone-50 font-semibold text-stone-800 print:bg-white">
                <tr>
                  <Td>Totaal</Td>
                  <Td />
                  <Td />
                  <Td className="text-right">{euro(data.summary.totalTurnoverCents, data.summary.currency)}</Td>
                  <Td className="text-right">{euro(data.summary.totalPlatformFeeCents, data.summary.currency)}</Td>
                  <Td className="text-right">{euro(data.summary.totalPartnerFeeCents, data.summary.currency)}</Td>
                  <Td className="text-right">{euro(data.summary.totalDiscountsCents, data.summary.currency)}</Td>
                  <Td />
                  <Td />
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Print styles */}
          <style jsx global>{`
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
            @media print {
              body { background: #fff; }
              table { page-break-inside: avoid; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}

/* --- kleine presentational helpers --- */
function KPI({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg border border-stone-200 p-3 print:p-2">
      <div className="text-[10px] uppercase tracking-wide text-stone-500">{label}</div>
      <div className="text-sm font-bold">{value ?? "–"}</div>
    </div>
  );
}
function Th({ children, className = "" }: any) {
  return <th className={`px-2 py-2 text-left text-[11px] font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: any) {
  return <td className={`px-2 py-2 align-top text-stone-900 ${className}`}>{children}</td>;
}
