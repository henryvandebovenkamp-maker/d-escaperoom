// PATH: src/app/admin/(protected)/agenda/page.tsx
"use client";

import * as React from "react";

/* =============================================================
   Admin/Partner Agenda — v4
   - Alleen GEBOEKTE slots (client-side filter isBooked)
   - Views: Day / Week / Month
   - Western/stone UI + WCAG AA
   - Annuleren: POST /api/booking/cancel (≥24u restitutie indicatie)
   - BookingCard inhoud gespiegeld aan booking detail pagina
   ============================================================= */

/* ================================
   Types — conform /api/agenda (uitgebreid + backwards-compatible)
   ================================ */
type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

type AgendaItem = {
  /* basis */
  id: string;
  status?: BookingStatus | null;

  /* partner */
  partnerSlug: string | null;
  partnerName: string | null;
  partnerAddressLine1?: string | null;
  partnerPostalCode?: string | null;
  partnerCity?: string | null;
  partnerGoogleMapsUrl?: string | null;

  /* tijd */
  startTime: string;      // ISO
  endTime: string | null;

  /* klant/hond */
  playerCount: number | null; // (aka playersCount)
  playersCount?: number | null;
  customerName: string | null;
  customerEmail?: string | null;
  dogName: string | null;
  dogAllergies?: string | null; // (aka allergies)
  dogFears?: string | null;
  dogTrackingLevel?: "NONE" | "BEGINNER" | "AMATEUR" | "PRO" | string | null;
  allergies?: string | null; // legacy

  /* prijs (zowel EUR als cents mogelijk; we normaliseren in helpers) */
  currency: string; // "EUR"
  totalAmount?: number | null;            // EUR (legacy)
  depositPaidAmount?: number | null;      // EUR (legacy: wat betaald is)
  totalAmountCents?: number | null;       // cents (nieuw)
  depositAmountCents?: number | null;     // cents (nieuw: afgesproken aanbetaling)
  depositPaidAmountCents?: number | null; // cents (nieuw: daadwerkelijk betaald)
  discountCode?: string | null;
  discountAmountCents?: number | null;    // cents
};

/* partner lijst */
type PartnerRow = { id: string; name: string; slug: string; city: string | null };
type AgendaScope = "day" | "week" | "month";

/* ================================
   Helpers (tijd/datum & geld)
   ================================ */
const nlDaysShort = ["MA","DI","WO","DO","VR","ZA","ZO"] as const;
const nlDaysLong  = ["maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag","zondag"] as const;
const nlMonths    = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"] as const;

const today = () => new Date();
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayISO = () => toYMD(today());
const addDaysISO = (iso: string, days: number) => {
  const [y,m,dd] = iso.split("-").map(Number);
  const d = new Date(y, m-1, dd);
  d.setDate(d.getDate()+days);
  return toYMD(d);
};
const startOfWeekISO = (d: Date) => {
  const day = d.getDay(); // 0=zo..6=za
  const diff = (day === 0 ? -6 : 1 - day); // maandag-start
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  return toYMD(start);
};
const monthTitle = (iso: string) => {
  const d = new Date(iso);
  return `${nlMonths[d.getMonth()]} ${d.getFullYear()}`;
};
const fmtTimeNL = (iso: string) =>
  new Date(iso).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"});
const fmtDateNL = (iso: string) => {
  const [y,m,d] = iso.split("-").map(Number);
  const date = new Date(y, m-1, d);
  return `${nlDaysLong[(date.getDay()+6)%7]} ${date.getDate()} ${nlMonths[date.getMonth()]}`;
};
const dayKeyFromISO = (iso: string) =>
  iso.includes("T") ? iso.slice(0, iso.indexOf("T")) : toYMD(new Date(iso));
const isBeforeToday = (iso: string) => {
  const a = new Date(iso); a.setHours(0,0,0,0);
  const b = new Date();    b.setHours(0,0,0,0);
  return a.getTime() < b.getTime();
};

/* ====== Geld helpers (normalize naar cents) ====== */
function toCents(v?: number | null): number {
  if (typeof v !== "number" || isNaN(v)) return 0;
  // Als API EUR levert (bv. 63.92) → naar cents
  // Als API al cents levert (bv. 6392) en > 1000, laten we staan (edge-cases op lage bedragen vangen we met floor)
  return v > 1000 ? Math.round(v) : Math.round(v * 100);
}
function eur(cents: number, ccy = "EUR") {
  return (Number(cents || 0) / 100).toLocaleString("nl-NL", { style: "currency", currency: ccy });
}

/* ====== Row helpers uit detailpagina ====== */
function mapTracking(level?: string | null) {
  switch ((level || "NONE").toUpperCase()) {
    case "BEGINNER": return "Beginner";
    case "AMATEUR":  return "Amateur";
    case "PRO":      return "Pro";
    default:         return "Nee / Onbekend";
  }
}

/* ====== Annuleren helpers (≥ 24u restitutie) ====== */
const hoursUntil = (iso: string) => (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60);
const eligibleForRefund = (iso: string) => hoursUntil(iso) >= 24;
const hasStarted = (iso: string) => hoursUntil(iso) <= 0;

/* ================================
   Data fetch helpers
   ================================ */
async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { cache: "no-store", credentials: "include", ...init });
  if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`);
  return r.json();
}

/* Alleen geboekte tijdsloten tonen → filter client-side op signalen van een bevestigde boeking */
function isBooked(it: AgendaItem): boolean {
  const players = typeof it.playersCount === "number" ? it.playersCount : it.playerCount;
  const paidEUR  = typeof it.depositPaidAmount === "number" ? it.depositPaidAmount : undefined;
  const paidCts  = typeof it.depositPaidAmountCents === "number" ? it.depositPaidAmountCents : undefined;
  const hasPaid  = (paidEUR && paidEUR > 0) || (paidCts && paidCts > 0);
  return Boolean(
    (it.customerName && it.customerName.trim() !== "") ||
    (typeof players === "number" && players > 0) ||
    hasPaid
  );
}

async function fetchAgenda(scope: AgendaScope, pivotISO: string, partnerSlug?: string) {
  const p = new URLSearchParams({ scope, date: pivotISO });
  if (partnerSlug) p.set("partner", partnerSlug);
  const j = await fetchJSON<{ items: AgendaItem[] }>(`/api/agenda?${p.toString()}`);
  const rows = (j.items ?? []).slice().sort((a,b)=> (a.startTime || "").localeCompare(b.startTime || ""));
  return rows.filter(isBooked);
}

async function cancelBooking(bookingId: string, refundEligible: boolean) {
  return fetchJSON<{ ok: true }>(`/api/booking/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId, refundEligible }),
  });
}

/* ================================
   Page — Admin/Partner agenda (GEBOEKTE slots only)
   ================================ */
export default function AgendaPage() {
  const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const urlPartner = sp?.get("partner") ?? "";

  const [partners, setPartners] = React.useState<PartnerRow[]>([]);
  const [partnerSlug, setPartnerSlug] = React.useState<string>(urlPartner);

  const [scope, setScope] = React.useState<AgendaScope>("day");
  const [pivotISO, setPivotISO] = React.useState<string>(todayISO());

  const [items, setItems] = React.useState<AgendaItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Admin vs Partner autodetect (dropdown verbergen buiten /admin/)
  const isAdmin = typeof window !== "undefined" ? window.location.pathname.startsWith("/admin/") : true;

  // partners ophalen
  React.useEffect(() => {
    (async () => {
      try {
        if (!isAdmin) return; // partner: geen lijst nodig
        const rows = await fetchJSON<PartnerRow[]>("/api/partners/list");
        setPartners(rows ?? []);
        if (!partnerSlug && rows[0]?.slug) setPartnerSlug(rows[0].slug);
      } catch {/* ignore */}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // querystring sync
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (partnerSlug) sp.set("partner", partnerSlug); else sp.delete("partner");
    const newUrl = `${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState(null, "", newUrl.endsWith("?") ? newUrl.slice(0, -1) : newUrl);
  }, [partnerSlug]);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setItems(await fetchAgenda(scope, pivotISO, partnerSlug || undefined));
    } catch (e: any) {
      setError(e?.message || "Fout bij laden van agenda.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [scope, pivotISO, partnerSlug]);
  React.useEffect(() => { load(); }, [load]);

  function goPrev() {
    if (scope === "day") setPivotISO(addDaysISO(pivotISO, -1));
    else if (scope === "week") setPivotISO(addDaysISO(pivotISO, -7));
    else { const d = new Date(pivotISO); d.setMonth(d.getMonth()-1, 1); setPivotISO(toYMD(d)); }
  }
  function goNext() {
    if (scope === "day") setPivotISO(addDaysISO(pivotISO, 1));
    else if (scope === "week") setPivotISO(addDaysISO(pivotISO, 7));
    else { const d = new Date(pivotISO); d.setMonth(d.getMonth()+1, 1); setPivotISO(toYMD(d)); }
  }

  // pijltoetsen voor sneller bladeren
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT","TEXTAREA","SELECT"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "ArrowRight"){ e.preventDefault(); goNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scope, pivotISO]);

  const title = React.useMemo(() => {
    if (scope === "day") return `Agenda — ${fmtDateNL(pivotISO)}`;
    if (scope === "week") {
      const start = startOfWeekISO(new Date(pivotISO));
      const end = addDaysISO(start, 6);
      return `Agenda — Week ${start} t/m ${end}`;
    }
    return `Agenda — ${monthTitle(pivotISO)}`;
  }, [scope, pivotISO]);

  const totalCount = items.length;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Planning</div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">{title}</h1>
            <div className="mt-1 text-xs text-stone-600">{totalCount} geboekte item{totalCount===1?"":"s"}</div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-600">
            <LegendDot className="bg-emerald-600" label="Boekingen aanwezig" />
            <LegendDot className="bg-stone-400" label="Geen boekingen" />
            <LegendDot className="bg-stone-900" label="Vandaag" />
          </div>
        </div>

        {/* Controls */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/95 border-y border-stone-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap items-end gap-2">
              {/* Tabs */}
              <div className="inline-flex rounded-xl border border-stone-300 bg-white p-0.5 shadow-sm" role="tablist" aria-label="Weergave">
                {[{k:"day",lbl:"Dag"},{k:"week",lbl:"Week"},{k:"month",lbl:"Maand"}].map(t => (
                  <button
                    key={t.k}
                    onClick={() => setScope(t.k as AgendaScope)}
                    className={[
                      "h-9 rounded-lg px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-stone-900",
                      scope===t.k ? "bg-stone-900 text-white" : "text-stone-900 hover:bg-stone-100"
                    ].join(" ")}
                    aria-pressed={scope===t.k}
                    role="tab"
                  >{t.lbl}</button>
                ))}
              </div>

              {/* Datum */}
              <label className="sr-only" htmlFor="agenda-date">Kies datum</label>
              <input
                id="agenda-date"
                type="date"
                value={pivotISO}
                onChange={(e)=>setPivotISO(e.target.value)}
                className="h-10 sm:h-9 rounded-xl border border-stone-300 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />

              {/* Prev/Next */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={goPrev} className="h-10 sm:h-9 rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-900">Vorige</button>
                <button onClick={goNext} className="h-10 sm:h-9 rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-900">Volgende</button>
              </div>

              {/* Partner (alleen admin) */}
              {isAdmin && (
                partners.length > 0 ? (
                  <select
                    aria-label="Kies partner"
                    className="h-10 sm:h-9 rounded-xl border border-stone-300 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900 min-w-48"
                    value={partnerSlug}
                    onChange={(e) => { setPartnerSlug(e.target.value); setPivotISO(todayISO()); }}
                  >
                    {partners.map((p) => (
                      <option key={p.id} value={p.slug}>{p.name}{p.city ? ` — ${p.city}` : ""}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    placeholder="partner-slug"
                    value={partnerSlug}
                    onChange={(e) => setPartnerSlug(e.target.value)}
                    className="h-10 sm:h-9 rounded-xl border border-stone-300 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900 w-44"
                  />
                )
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={()=>window.print()}
                className="h-10 sm:h-9 rounded-xl bg-stone-900 px-3 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900"
              >Print</button>
            </div>
          </div>
        </div>

        {/* Views */}
        {scope === "day"   && <DayView  items={items} loading={loading} error={error} onChanged={load} />}
        {scope === "week"  && <WeekView items={items} loading={loading} pivotISO={pivotISO} onChanged={load} />}
        {scope === "month" && <MonthView items={items} loading={loading} pivotISO={pivotISO} onChanged={load} />}
      </div>
    </div>
  );
}

/* ================================
   Legend helpers
   ================================ */
function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${className}`} /><span>{label}</span></span>
  );
}

/* ================================
   SHARED — UI atoms (zelfde look als detailpagina)
   ================================ */
function StatusBadge({ status }: { status: BookingStatus | undefined | null }) {
  const map: Record<string, { cls: string; label: string }> = {
    PENDING:   { cls: "border-amber-300 bg-amber-100 text-amber-800", label: "In afwachting" },
    CONFIRMED: { cls: "border-emerald-300 bg-emerald-100 text-emerald-800", label: "Bevestigd" },
    CANCELLED: { cls: "border-rose-300 bg-rose-100 text-rose-800", label: "Geannuleerd" },
  };
  const s = (status && map[status]) || map.PENDING;
  return <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold shadow-sm ${s.cls}`}>{s.label}</span>;
}

function Row({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border border-stone-100 px-2 sm:px-3 py-1.5 ${
        emphasize ? "bg-stone-50" : "bg-stone-50/60"
      }`}
    >
      <span className="text-[11px] text-stone-700">{label}</span>
      <strong className={`text-[11px] ${emphasize ? "text-stone-900" : "text-stone-800"}`}>{value}</strong>
    </div>
  );
}

/* ================================
   SHARED — Volledige BookingCard (detailpagina 1-op-1)
   ================================ */
function BookingCard({ b, onChanged }: { b: AgendaItem; onChanged?: () => void }) {
  const started = hasStarted(b.startTime);
  const isRefund = eligibleForRefund(b.startTime);
  const players = (typeof b.playersCount === "number" ? b.playersCount : b.playerCount) || 1;

  /* bedragen normaliseren naar cents */
  const totalCts   = (typeof b.totalAmountCents === "number")   ? b.totalAmountCents!   : toCents(b.totalAmount);
  const depositCts = (typeof b.depositAmountCents === "number") ? b.depositAmountCents! : 0;
  const paidCts    = (typeof b.depositPaidAmountCents === "number")
                      ? b.depositPaidAmountCents!
                      : toCents(b.depositPaidAmount);
  const discountCts = b.discountAmountCents ?? 0;
  const restCts    = Math.max(0, totalCts - Math.max(depositCts || paidCts, 0));
  const depositLabel = depositCts > 0
    ? `Aanbetaling${paidCts >= depositCts ? " (betaald)" : ""}`
    : "Aanbetaling";

  const addressParts = [b.partnerAddressLine1, b.partnerPostalCode, b.partnerCity].filter(Boolean);
  const address = addressParts.join(", ");

  const shortId = React.useMemo(
    () => (b.id.length > 8 ? `#${b.id.slice(-6).toUpperCase()}` : `#${b.id}`),
    [b.id]
  );

  const dateStr = React.useMemo(() => {
    const s = new Date(b.startTime);
    const e = b.endTime ? new Date(b.endTime) : null;
    const d = s.toLocaleDateString("nl-NL", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
    const t = e ? `${fmtTimeNL(b.startTime)}–${fmtTimeNL(b.endTime!)}` : `${fmtTimeNL(b.startTime)}–${new Date(s.getTime()+60*60*1000).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"})}`;
    return { d, t };
  }, [b.startTime, b.endTime]);

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function handleCancel() {
    setErr(null);
    if (started) return;
    const msg = isRefund
      ? `Weet je zeker dat je boeking ${shortId} wilt annuleren?

≥ 24u: aanbetaling wordt teruggestort.`
      : `Weet je zeker dat je boeking ${shortId} wilt annuleren?

< 24u: aanbetaling wordt niet teruggestort.`;
    if (!window.confirm(msg)) return;

    try {
      setBusy(true);
      await cancelBooking(b.id, isRefund);
      onChanged?.();
    } catch (e: any) {
      setErr(e?.message || "Annuleren mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="group rounded-2xl border border-stone-200 bg-white p-3 shadow-sm ring-1 ring-stone-200 transition hover:shadow-md">
      {/* Header — nummer + partner + status + tijd */}
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-800">
          <span className="inline-flex items-center gap-1">
            <span>🧾</span><span className="font-mono">{shortId}</span>
          </span>
          {b.partnerName && <span className="text-stone-500">• {b.partnerName}</span>}
          <StatusBadge status={b.status} />
        </div>
        <div className="text-left sm:text-right text-xs text-stone-700">
          <div className="flex items-center sm:justify-end gap-1"><span>⏰</span><span className="font-semibold">{dateStr.d}</span></div>
          <div className="text-[11px] text-stone-600">{dateStr.t}</div>
        </div>
      </div>

      {/* Overzicht — exact als detailpagina */}
      <section className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="px-2 sm:px-3 py-2 bg-stone-50 border-b border-stone-200">
          <h3 className="text-[13px] font-semibold">Overzicht</h3>
        </div>
        <div className="px-2 sm:px-3 py-2">
          <dl className="grid grid-cols-1 gap-y-2">
            <Row label="Hondenschool" value={b.partnerName || "—"} />
            <Row label="Datum & tijd" value={`${dateStr.d}, ${dateStr.t}`} />
            <Row label="Deelnemers" value={`${players} ${players === 1 ? "speler" : "spelers"}`} />
            {address && (
              <div className="rounded-lg border border-stone-100 bg-stone-50/60 px-2 sm:px-3 py-2">
                <div className="text-[11px] font-semibold text-stone-700">Adres</div>
                <div className="text-[11px]">{address}</div>
                {b.partnerGoogleMapsUrl && (
                  <a
                    href={b.partnerGoogleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-[11px] text-pink-700 underline"
                  >
                    Route in Google Maps openen
                  </a>
                )}
              </div>
            )}
          </dl>

          <div className="h-px bg-stone-200 my-3" />

          <dl className="grid grid-cols-1 gap-y-1.5">
            <Row label="Totaal" value={eur(totalCts, b.currency)} emphasize />
            <Row label={depositLabel} value={eur(depositCts || paidCts, b.currency)} />
            <Row label="Rest op locatie" value={eur(restCts, b.currency)} />
            {b.discountCode && (discountCts > 0) && (
              <Row label={`Korting (${b.discountCode})`} value={`- ${eur(discountCts, b.currency)}`} />
            )}
          </dl>
        </div>
      </section>

      {/* Hond-gegevens — exact als detailpagina */}
      <section className="mt-2 rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="px-2 sm:px-3 py-2 bg-stone-50 border-b border-stone-200">
          <h3 className="text-[13px] font-semibold">Gegevens van je hond</h3>
        </div>
        <div className="px-2 sm:px-3 py-2 grid gap-1.5">
          <Row label="Naam" value={b.dogName || "—"} />
          <Row label="Ervaring speuren" value={mapTracking(b.dogTrackingLevel)} />
          <Row label="Allergieën" value={(b.dogAllergies ?? b.allergies ?? "—") || "—"} />
          <Row label="Bang voor" value={b.dogFears || "—"} />
        </div>
      </section>

      {/* Annuleren + policy */}
      <div className="mt-2 flex flex-col items-stretch sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-[11px] leading-snug text-stone-600">
          {hasStarted(b.startTime) ? (
            <span className="text-rose-700">❌ Starttijd verstreken; annuleren niet mogelijk.</span>
          ) : eligibleForRefund(b.startTime) ? (
            <>❌ Annuleren <strong>≥ 24u</strong>: aanbetaling wordt teruggestort.</>
          ) : (
            <>❌ Annuleren <strong>&lt; 24u</strong>: aanbetaling wordt <strong>niet</strong> teruggestort.</>
          )}
          {err && <div className="mt-1 text-rose-700">{err}</div>}
        </div>

        <button
          type="button"
          onClick={handleCancel}
          disabled={busy || hasStarted(b.startTime)}
          className={[
            "inline-flex h-9 sm:h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold",
            "transition border shadow-sm",
            busy || hasStarted(b.startTime)
              ? "cursor-not-allowed border-stone-300 bg-stone-100 text-stone-400"
              : "border-stone-900 bg-stone-900 text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-rose-400/40",
          ].join(" ")}
          aria-disabled={busy || hasStarted(b.startTime)}
        >
          {busy ? "Annuleren…" : "Annuleren"}
        </button>
      </div>
    </li>
  );
}

/* ================================
   MINI Booking row (compacte rij + Details toggle)
   ================================ */
function MiniBookingRow({ b, onOpenFull }:{ b:AgendaItem; onOpenFull:()=>void }) {
  const players = (typeof b.playersCount === "number" ? b.playersCount : b.playerCount) || 1;
  const totalCts   = (typeof b.totalAmountCents === "number")   ? b.totalAmountCents!   : toCents(b.totalAmount);
  const depositCts = (typeof b.depositAmountCents === "number") ? b.depositAmountCents! : 0;
  const paidCts    = (typeof b.depositPaidAmountCents === "number")
                      ? b.depositPaidAmountCents!
                      : toCents(b.depositPaidAmount);
  const restCts = Math.max(0, totalCts - Math.max(depositCts || paidCts, 0));

  return (
    <li className="group flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] leading-tight text-stone-800 hover:bg-stone-100">
      <div className="min-w-0 flex items-center gap-2">
        <span className="shrink-0">⏰ {fmtTimeNL(b.startTime)}</span>
        <span className="truncate">👤 {b.customerName ?? "—"}</span>
        {b.dogName && <span className="hidden sm:inline truncate">• 🐶 {b.dogName}</span>}
        <span className="hidden sm:inline">• 👥 {players}</span>
      </div>
      <div className="ml-2 flex items-center gap-2 shrink-0">
        <span className="font-semibold text-stone-900">💶 {eur(restCts, b.currency)}</span>
        <button
          type="button"
          onClick={onOpenFull}
          className="rounded-md border border-stone-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-800 transition hover:bg-stone-200"
        >
          Details
        </button>
      </div>
    </li>
  );
}

/* ================================
   DAY VIEW — compacte lijst + Details dropdown (alleen geboekt)
   ================================ */
function DayView({ items, loading, error, onChanged }:{
  items:AgendaItem[]; loading:boolean; error:string|null; onChanged?:() => void
}) {
  return (
    <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
      <h2 className="text-lg font-extrabold">📅 Vandaag</h2>
      <p className="mt-0.5 mb-2 text-[11px] text-stone-600">Overzicht van alle <strong>geboekte</strong> tijdsloten vandaag.</p>

      {loading && <p className="text-xs text-stone-500">Laden…</p>}
      {error && <p className="text-xs text-rose-700">{error}</p>}
      {!loading && !items.length && !error && (
        <p className="text-xs text-stone-500">Geen <strong>geboekte</strong> tijdsloten op deze dag.</p>
      )}

      {/* Mini rows + uitklapbare volledige kaarten */}
      <ul className="space-y-1.5">
        {items.map((b) => (
          <MiniBookingRow
            key={b.id}
            b={b}
            onOpenFull={()=>{
              const el = document.getElementById(`full-${b.id}`);
              if (el) el.classList.toggle("hidden");
            }}
          />
        ))}
      </ul>
      <div className="mt-2 space-y-2">
        {items.map((b) => (
          <div key={"full-" + b.id} id={`full-${b.id}`} className="hidden">
            <BookingCard b={b} onChanged={onChanged} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ================================
   WEEK VIEW — 7 kolommen + lijst met Details dropdown
   ================================ */
function WeekView({ items, loading, pivotISO, onChanged }:{
  items:AgendaItem[]; loading:boolean; pivotISO:string; onChanged?: () => void
}) {
  const startISO = startOfWeekISO(new Date(pivotISO));
  const days = Array.from({length:7},(_,i)=> addDaysISO(startISO, i));

  const byDay = React.useMemo(() => {
    const m = new Map<string, AgendaItem[]>();
    for (const d of days) m.set(d, []);
    for (const it of items) {
      const key = dayKeyFromISO(it.startTime);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(it);
    }
    for (const d of days) m.get(d)!.sort((a,b)=> (a.startTime||"").localeCompare(b.startTime||""));
    return m;
  }, [items, days]);

  const [selectedISO, setSelectedISO] = React.useState<string>(() => {
    const firstWithItems = days.find(d => (byDay.get(d)?.length ?? 0) > 0);
    return firstWithItems ?? days[0];
  });
  React.useEffect(() => {
    const firstWithItems = days.find(d => (byDay.get(d)?.length ?? 0) > 0);
    setSelectedISO(prev => days.includes(prev) ? prev : (firstWithItems ?? days[0]));
  }, [pivotISO, days, byDay]);

  const list = byDay.get(selectedISO) ?? [];
  const todayKey = todayISO();

  return (
    <>
      <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
        <h2 className="text-lg font-extrabold">🗓️ Deze week (geboekt)</h2>
        {loading && <p className="text-[11px] text-stone-500">Laden…</p>}

        <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
          {days.map((d, idx) => {
            const count = byDay.get(d)?.length ?? 0;
            const isSel = d === selectedISO;
            const isToday = d === todayKey;
            const booked = count > 0;

            const base = [
              "h-20 sm:h-24 rounded-xl border p-2 text-left text-xs transition focus:outline-none focus:ring-2",
              booked ? "bg-emerald-50 border-emerald-300" : "bg-stone-50 border-stone-200",
              "hover:bg-stone-100",
              isSel ? "ring-stone-900 ring-offset-2" : "ring-transparent",
              isToday ? "outline outline-1 outline-stone-900/60" : "",
              isBeforeToday(d) ? "opacity-75" : ""
            ].join(" ");

            return (
              <button
                key={d}
                onClick={()=>setSelectedISO(d)}
                className={base}
                aria-pressed={isSel}
                aria-label={`Selecteer ${d}, ${count} boekingen`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="font-extrabold text-stone-700">
                    {nlDaysShort[idx]} {Number(d.slice(-2))}
                  </div>
                  <span className={[
                    "inline-flex items-center justify-center rounded-full min-w-6 h-6 px-1 text-[10px] font-semibold",
                    booked ? "bg-emerald-600 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300"
                  ].join(" ")}>
                    {count}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500">{booked ? "Boekingen" : "—"}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
        <h3 className="text-base font-extrabold">📍 {fmtDateNL(selectedISO)}</h3>
        {list.length === 0 && <p className="mt-1 text-xs text-stone-500">Geen <strong>geboekte</strong> tijdsloten op deze dag.</p>}

        {/* Mini rows + uitklapbare volledige kaarten */}
        <ul className="mt-2 space-y-1.5">
          {list.map((b) => (
            <MiniBookingRow
              key={b.id}
              b={b}
              onOpenFull={()=>{
                const el = document.getElementById(`full-${b.id}`);
                if (el) el.classList.toggle("hidden");
              }}
            />
          ))}
        </ul>
        <div className="mt-2 space-y-2">
          {list.map((b) => (
            <div key={"full-" + b.id} id={`full-${b.id}`} className="hidden">
              <BookingCard b={b} onChanged={onChanged} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* ================================
   MONTH VIEW — dagnummer linksboven (vet) + cijfer rechts
   + rechterkolom met mini-rijen en Details dropdown
   ================================ */
function MonthView({ items, loading, pivotISO, onChanged }:{
  items:AgendaItem[]; loading:boolean; pivotISO:string; onChanged?: () => void
}) {
  const base = new Date(pivotISO); base.setDate(1);
  const Y = base.getFullYear(); const M = base.getMonth();
  const first = new Date(Y, M, 1);
  const last  = new Date(Y, M + 1, 0);
  const daysInMonth  = last.getDate();
  const startWeekday = (first.getDay() + 6) % 7;     // ma=0
  const endWeekday   = (last.getDay()  + 6) % 7;
  const prevOverflow = startWeekday;
  const nextOverflow = 6 - endWeekday;

  const [selectedISO, setSelectedISO] = React.useState<string>(toYMD(first));
  React.useEffect(() => { setSelectedISO(toYMD(new Date(Y, M, 1))); }, [pivotISO, Y, M]);

  const byDate = React.useMemo(() => {
    const m = new Map<string, AgendaItem[]>();
    for (const it of items) {
      const key = dayKeyFromISO(it.startTime);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(it);
    }
    for (const k of m.keys()) m.get(k)!.sort((a,b)=> (a.startTime||"").localeCompare(b.startTime||""));
    return m;
  }, [items]);

  type Cell = { dateISO: string; inMonth: boolean; dayNum: number; count: number };
  const cells: Cell[] = [];

  // voorafgaande dagen
  if (prevOverflow > 0) {
    const prevLast = new Date(Y, M, 0);
    const prevDays = prevLast.getDate();
    for (let i = prevOverflow - 1; i >= 0; i--) {
      const d = prevDays - i;
      const iso = toYMD(new Date(Y, M - 1, d));
      cells.push({ dateISO: iso, inMonth: false, dayNum: d, count: byDate.get(iso)?.length ?? 0 });
    }
  }
  // maanddagen
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toYMD(new Date(Y, M, d));
    cells.push({ dateISO: iso, inMonth: true, dayNum: d, count: byDate.get(iso)?.length ?? 0 });
  }
  // volgende maand overflow
  for (let d = 1; d <= nextOverflow; d++) {
    const iso = toYMD(new Date(Y, M + 1, d));
    cells.push({ dateISO: iso, inMonth: false, dayNum: d, count: byDate.get(iso)?.length ?? 0 });
  }

  const list = byDate.get(selectedISO) ?? [];
  const todayKey = todayISO();

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {/* Kalender */}
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-3 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-extrabold">📆 {nlMonths[M]} {Y} (geboekt)</h3>
          {loading && <p className="text-[11px] text-stone-500">Laden…</p>}
        </div>

        {/* Weekdagkop verbergen op mobiel */}
        <div className="mb-2 hidden sm:grid grid-cols-7 gap-2 text-center text-[10px] font-semibold text-stone-500">
          {nlDaysShort.map((d)=> <div key={d} className="py-1">{d}</div>)}
        </div>

        {/* Altijd 7 kolommen; compacte hoogte op mobiel */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {cells.map((c) => {
            const isSel   = c.dateISO === selectedISO;
            const isToday = c.dateISO === todayKey;
            const booked  = c.count > 0;

            const base = [
              "relative h-10 sm:h-16 rounded-xl border text-left text-[10px] sm:text-xs transition focus:outline-none focus:ring-2",
              booked
                ? "bg-emerald-50 border-emerald-300"
                : c.inMonth ? "bg-white border-stone-200" : "bg-stone-50 border-stone-200 text-stone-400",
              "hover:bg-stone-50",
              isSel ? "ring-stone-900 ring-offset-2" : "ring-transparent",
              isToday ? "outline outline-1 outline-stone-900/60" : "",
              isBeforeToday(c.dateISO) ? "opacity-80" : "",
              "px-1.5 py-1"
            ].join(" ");

            return (
              <button
                key={c.dateISO}
                onClick={() => setSelectedISO(c.dateISO)}
                className={base}
                aria-label={`Selecteer ${c.dateISO}, ${c.count} boekingen`}
                title={`${c.dateISO} — ${c.count} boekingen`}
              >
                <div className="flex items-center justify-between">
                  {/* Dagnummer vet linksboven */}
                  <span className={[
                    "font-extrabold",
                    booked ? "text-emerald-800" : c.inMonth ? "text-stone-700" : "text-stone-400"
                  ].join(" ")}>{c.dayNum}</span>

                  {/* Aantal boekingen rechts, plain nummer */}
                  <span className={booked ? "font-extrabold text-emerald-800" : "font-semibold text-stone-700"}>
                    {c.count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Rechter kolom — MINI lijst + Details dropdown */}
      <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
        <h3 className="text-base font-extrabold">📍 {fmtDateNL(selectedISO)}</h3>
        {list.length === 0 && <p className="mt-1 text-xs text-stone-500">Geen <strong>geboekte</strong> tijdsloten op deze dag.</p>}

        <ul className="mt-2 space-y-1.5">
          {list.map((b) => (
            <MiniBookingRow
              key={b.id}
              b={b}
              onOpenFull={()=>{
                const el = document.getElementById(`full-${b.id}`);
                if (el) el.classList.toggle("hidden");
              }}
            />
          ))}
        </ul>

        {/* Volledige kaarten (toggle via Details) */}
        <div className="mt-2 space-y-2">
          {list.map((b) => (
            <div key={"full-" + b.id} id={`full-${b.id}`} className="hidden">
              <BookingCard b={b} onChanged={onChanged} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
