"use client";

import * as React from "react";

type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELED"
  | "REFUNDED";
type AgendaScope = "day" | "week" | "month";

type AgendaItem = {
  id: string;
  bookingId: string;
  slotId: string;
  partnerSlug: string;
  partnerName: string;
  partnerCity: string | null;
  startTime: string;
  endTime: string;
  bookingStatus: BookingStatus;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  playersCount: number;
  dogName: string | null;
  dogAllergies: string | null;
  dogFears: string | null;
  dogTrackingLevel: string | null;
  dogSocialWithPeople: boolean | null;
  currency: string;
  totalAmountCents: number;
  depositAmountCents: number;
  restAmountCents: number;
  discountAmountCents: number;
  giftCardAppliedCents: number | null;
  depositPaidAmountCents: number;
  depositPaidAt: string | null;
  latestDepositPaymentStatus: PaymentStatus | null;
  latestDepositPaymentMethod: string | null;
};

const APP_TIME_ZONE = "Europe/Amsterdam";

const nlDaysShort = ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"] as const;
const nlDaysLong = [
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
  "zondag",
] as const;
const nlMonths = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
] as const;

const pad2 = (value: number) => String(value).padStart(2, "0");

const parseYMDLocal = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const todayISO = () => toYMD(new Date());

const addDaysISO = (iso: string, days: number) => {
  const d = parseYMDLocal(iso);
  d.setDate(d.getDate() + days);
  return toYMD(d);
};

const startOfWeekISO = (iso: string) => {
  const d = parseYMDLocal(iso);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toYMD(d);
};

const monthTitle = (iso: string) => {
  const d = parseYMDLocal(iso);
  return `${nlMonths[d.getMonth()]} ${d.getFullYear()}`;
};

const dayKeyFromISO = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

const fmtTimeNL = (iso: string) =>
  new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));

const fmtFullDateNL = (iso: string) =>
  new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));

const fmtDateNL = (iso: string) => {
  const date = parseYMDLocal(iso);
  return `${nlDaysLong[(date.getDay() + 6) % 7]} ${date.getDate()} ${
    nlMonths[date.getMonth()]
  }`;
};

const euroCents = (cents?: number | null, currency = "EUR") =>
  new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(typeof cents === "number" ? cents / 100 : 0);

const isBeforeToday = (iso: string) => iso < todayISO();

const hoursUntil = (iso: string) =>
  (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60);

const eligibleForRefund = (iso: string) => hoursUntil(iso) >= 24;
const hasStarted = (iso: string) => hoursUntil(iso) <= 0;

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    ...init,
  });

  if (!response.ok) {
    throw new Error((await response.text()) || `HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchAgenda(scope: AgendaScope, pivotISO: string) {
  const params = new URLSearchParams({ scope, date: pivotISO });

  const response = await fetchJSON<{ ok?: boolean; items: AgendaItem[] }>(
    `/api/agenda?${params.toString()}`
  );

  return (response.items ?? [])
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

async function cancelBooking(bookingId: string, refundEligible: boolean) {
  return fetchJSON<{ ok: true }>("/api/booking/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId, refundEligible }),
  });
}

function socialLabel(value: boolean | null) {
  if (value === true) return "Ja";
  if (value === false) return "Nee / onzeker";
  return "Niet ingevuld";
}

export default function PartnerAgendaPage() {
  const [scope, setScope] = React.useState<AgendaScope>("day");
  const [pivotISO, setPivotISO] = React.useState(todayISO());
  const [items, setItems] = React.useState<AgendaItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await fetchAgenda(scope, pivotISO));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout bij laden van agenda.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [scope, pivotISO]);

  React.useEffect(() => {
    load();
  }, [load]);

  const goPrev = React.useCallback(() => {
    if (scope === "day") {
      setPivotISO((prev) => addDaysISO(prev, -1));
      return;
    }

    if (scope === "week") {
      setPivotISO((prev) => addDaysISO(prev, -7));
      return;
    }

    setPivotISO((prev) => {
      const d = parseYMDLocal(prev);
      d.setMonth(d.getMonth() - 1, 1);
      return toYMD(d);
    });
  }, [scope]);

  const goNext = React.useCallback(() => {
    if (scope === "day") {
      setPivotISO((prev) => addDaysISO(prev, 1));
      return;
    }

    if (scope === "week") {
      setPivotISO((prev) => addDaysISO(prev, 7));
      return;
    }

    setPivotISO((prev) => {
      const d = parseYMDLocal(prev);
      d.setMonth(d.getMonth() + 1, 1);
      return toYMD(d);
    });
  }, [scope]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tagName = (e.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const title = React.useMemo(() => {
    if (scope === "day") return `Agenda — ${fmtDateNL(pivotISO)}`;

    if (scope === "week") {
      const start = startOfWeekISO(pivotISO);
      const end = addDaysISO(start, 6);
      return `Agenda — week ${start} t/m ${end}`;
    }

    return `Agenda — ${monthTitle(pivotISO)}`;
  }, [scope, pivotISO]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              Partner planning
            </div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              {title}
            </h1>
            <div className="mt-1 text-xs text-stone-600">
              {items.length} bevestigde boeking{items.length === 1 ? "" : "en"}
            </div>
          </div>

          <div className="hidden items-center gap-2 text-[11px] text-stone-600 sm:flex">
            <LegendDot className="bg-emerald-600" label="Boekingen aanwezig" />
            <LegendDot className="bg-stone-400" label="Geen boekingen" />
            <LegendDot className="bg-stone-900" label="Vandaag" />
          </div>
        </div>

        <div className="sticky top-0 z-30 -mx-4 border-y border-stone-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap items-end gap-2">
              <div
                className="inline-flex rounded-xl border border-stone-300 bg-white p-0.5 shadow-sm"
                role="tablist"
                aria-label="Weergave"
              >
                {[
                  { key: "day", label: "Dag" },
                  { key: "week", label: "Week" },
                  { key: "month", label: "Maand" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setScope(tab.key as AgendaScope)}
                    className={[
                      "h-9 rounded-lg px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-stone-900",
                      scope === tab.key
                        ? "bg-stone-900 text-white"
                        : "text-stone-900 hover:bg-stone-100",
                    ].join(" ")}
                    aria-selected={scope === tab.key}
                    role="tab"
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <label className="sr-only" htmlFor="agenda-date">
                Kies datum
              </label>
              <input
                id="agenda-date"
                type="date"
                value={pivotISO}
                onChange={(e) => setPivotISO(e.target.value)}
                className="h-10 rounded-xl border border-stone-300 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900 sm:h-9"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  className="h-10 rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-900 sm:h-9"
                >
                  Vorige
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="h-10 rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-900 sm:h-9"
                >
                  Volgende
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="h-10 rounded-xl bg-stone-900 px-3 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900 sm:h-9"
            >
              Print
            </button>
          </div>
        </div>

        {scope === "day" && (
          <DayView
            items={items}
            loading={loading}
            error={error}
            onChanged={load}
          />
        )}

        {scope === "week" && (
          <WeekView
            items={items}
            loading={loading}
            pivotISO={pivotISO}
            onChanged={load}
          />
        )}

        {scope === "month" && (
          <MonthView
            items={items}
            loading={loading}
            pivotISO={pivotISO}
            onChanged={load}
          />
        )}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      <span>{label}</span>
    </span>
  );
}

function BookingCard({
  b,
  onChanged,
}: {
  b: AgendaItem;
  onChanged?: () => void;
}) {
  const started = hasStarted(b.startTime);
  const refundEligible = eligibleForRefund(b.startTime);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const shortId = React.useMemo(
    () =>
      b.bookingId.length > 8
        ? `#${b.bookingId.slice(-6).toUpperCase()}`
        : `#${b.bookingId}`,
    [b.bookingId]
  );

  const dateStr = React.useMemo(
    () => ({
      date: fmtFullDateNL(b.startTime),
      time: `${fmtTimeNL(b.startTime)}–${fmtTimeNL(b.endTime)}`,
    }),
    [b.startTime, b.endTime]
  );

  async function handleCancel() {
    setErr(null);
    if (started) return;

    const message = refundEligible
      ? `Weet je zeker dat je boeking ${shortId} wilt annuleren?\n\n≥ 24u: aanbetaling wordt teruggestort.`
      : `Weet je zeker dat je boeking ${shortId} wilt annuleren?\n\n< 24u: aanbetaling wordt niet teruggestort.`;

    if (!window.confirm(message)) return;

    try {
      setBusy(true);
      await cancelBooking(b.bookingId, refundEligible);
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Annuleren mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm ring-1 ring-stone-200 transition hover:shadow-md">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-800">
          <span className="inline-flex items-center gap-1">
            <span>🧾</span>
            <span className="font-mono">{shortId}</span>
          </span>
          <span className="text-stone-500">• {b.partnerName}</span>
          {b.partnerCity && (
            <span className="text-stone-500">• {b.partnerCity}</span>
          )}
        </div>

        <div className="text-left text-xs text-stone-700 sm:text-right">
          <div className="font-semibold">⏰ {dateStr.date}</div>
          <div className="text-[11px] text-stone-600">{dateStr.time}</div>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <InfoBlock label="Naam klant" icon="👤" value={b.customerName ?? "—"} />
        <InfoBlock label="E-mail" icon="✉️" value={b.customerEmail} />
        <InfoBlock label="Telefoon" icon="📞" value={b.customerPhone ?? "—"} />
        <InfoBlock
          label="Aantal spelers"
          icon="👥"
          value={String(b.playersCount)}
        />
        <InfoBlock label="Naam hond" icon="🐶" value={b.dogName ?? "—"} />
        <InfoBlock
          label="Speurniveau hond"
          icon="⭐"
          value={b.dogTrackingLevel ?? "—"}
        />
        <InfoBlock
          label="Sociaal met mensen"
          icon="🤝"
          value={socialLabel(b.dogSocialWithPeople)}
        />
        <InfoBlock
          label="Betaalmethode"
          icon="💳"
          value={b.latestDepositPaymentMethod ?? "—"}
        />
        <InfoBlock
          label="Allergieën"
          icon="⚠️"
          value={b.dogAllergies ?? "—"}
          wide
        />
        <InfoBlock
          label="Angsten / bijzonderheden"
          icon="💬"
          value={b.dogFears ?? "—"}
          wide
        />
      </dl>

      <div className="mt-3 grid gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2 sm:grid-cols-3">
        <MoneyBlock
          label="Totaal"
          value={euroCents(b.totalAmountCents, b.currency)}
        />
        <MoneyBlock
          label="Aanbetaling"
          value={euroCents(b.depositAmountCents, b.currency)}
          sub={`Betaald: ${euroCents(b.depositPaidAmountCents, b.currency)}`}
        />
        <MoneyBlock
          label="Rest op locatie"
          value={euroCents(b.restAmountCents, b.currency)}
          strong
        />

        {(b.discountAmountCents > 0 || (b.giftCardAppliedCents ?? 0) > 0) && (
          <div className="grid gap-2 sm:col-span-3 sm:grid-cols-2">
            {b.discountAmountCents > 0 && (
              <MoneyBlock
                label="Korting"
                value={`- ${euroCents(b.discountAmountCents, b.currency)}`}
              />
            )}
            {(b.giftCardAppliedCents ?? 0) > 0 && (
              <MoneyBlock
                label="Giftcard"
                value={`- ${euroCents(b.giftCardAppliedCents, b.currency)}`}
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[11px] leading-snug text-stone-600">
          {started ? (
            <span className="text-rose-700">
              ❌ Starttijd verstreken; annuleren niet mogelijk.
            </span>
          ) : refundEligible ? (
            <>
              ❌ Annuleren <strong>≥ 24u</strong>: aanbetaling wordt
              teruggestort.
            </>
          ) : (
            <>
              ❌ Annuleren <strong>&lt; 24u</strong>: aanbetaling wordt{" "}
              <strong>niet</strong> teruggestort.
            </>
          )}
          {err && <div className="mt-1 text-rose-700">{err}</div>}
        </div>

        <button
          type="button"
          onClick={handleCancel}
          disabled={busy || started}
          className={[
            "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold shadow-sm transition",
            busy || started
              ? "cursor-not-allowed border-stone-300 bg-stone-100 text-stone-400"
              : "border-stone-900 bg-stone-900 text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-rose-400/40",
          ].join(" ")}
        >
          {busy ? "Annuleren…" : "Annuleren"}
        </button>
      </div>
    </li>
  );
}

function InfoBlock({
  icon,
  label,
  value,
  wide,
}: {
  icon: string;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-md border border-stone-200 bg-stone-50 px-2 py-1.5",
        wide ? "sm:col-span-2" : "",
      ].join(" ")}
    >
      <dt className="flex items-center gap-1 font-medium text-stone-700">
        <span>{icon}</span>
        <span>{label}</span>
      </dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words font-semibold text-stone-900">
        {value}
      </dd>
    </div>
  );
}

function MoneyBlock({
  label,
  value,
  sub,
  strong,
}: {
  label: string;
  value: string;
  sub?: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
      <div className="text-[11px] font-semibold text-stone-600">{label}</div>
      <div
        className={[
          "mt-0.5 tracking-tight text-stone-900",
          strong ? "text-lg font-extrabold" : "text-sm font-bold",
        ].join(" ")}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-stone-500">{sub}</div>}
    </div>
  );
}

function MiniBookingRow({
  b,
  onOpenFull,
}: {
  b: AgendaItem;
  onOpenFull: () => void;
}) {
  return (
    <li className="group flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] leading-tight text-stone-800 hover:bg-stone-100">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0">⏰ {fmtTimeNL(b.startTime)}</span>
        <span className="truncate">👤 {b.customerName ?? "—"}</span>
        {b.dogName && (
          <span className="hidden truncate sm:inline">• 🐶 {b.dogName}</span>
        )}
        <span className="hidden sm:inline">• 👥 {b.playersCount}</span>
      </div>

      <div className="ml-2 flex shrink-0 items-center gap-2">
        <span className="font-semibold text-stone-900">
          💶 {euroCents(b.restAmountCents, b.currency)}
        </span>
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

function DayView({
  items,
  loading,
  error,
  onChanged,
}: {
  items: AgendaItem[];
  loading: boolean;
  error: string | null;
  onChanged?: () => void;
}) {
  const [openId, setOpenId] = React.useState<string | null>(null);

  return (
    <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
      <h2 className="text-lg font-extrabold">📅 Dagoverzicht</h2>
      <p className="mb-2 mt-0.5 text-[11px] text-stone-600">
        Overzicht van alle <strong>bevestigde boekingen</strong>.
      </p>
      {loading && <p className="text-xs text-stone-500">Laden…</p>}
      {error && <p className="text-xs text-rose-700">{error}</p>}
      {!loading && !items.length && !error && (
        <p className="text-xs text-stone-500">
          Geen <strong>bevestigde boekingen</strong> op deze dag.
        </p>
      )}

      <ul className="space-y-1.5">
        {items.map((b) => (
          <MiniBookingRow
            key={b.id}
            b={b}
            onOpenFull={() => setOpenId(openId === b.id ? null : b.id)}
          />
        ))}
      </ul>

      <div className="mt-2 space-y-2">
        {items.map((b) =>
          openId === b.id ? (
            <BookingCard key={`full-${b.id}`} b={b} onChanged={onChanged} />
          ) : null
        )}
      </div>
    </section>
  );
}

function WeekView({
  items,
  loading,
  pivotISO,
  onChanged,
}: {
  items: AgendaItem[];
  loading: boolean;
  pivotISO: string;
  onChanged?: () => void;
}) {
  const startISO = React.useMemo(() => startOfWeekISO(pivotISO), [pivotISO]);

  const days = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysISO(startISO, i)),
    [startISO]
  );

  const byDay = React.useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const d of days) map.set(d, []);

    for (const item of items) {
      const key = dayKeyFromISO(item.startTime);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }

    for (const d of days) {
      map.get(d)!.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    return map;
  }, [items, days]);

  const [selectedISO, setSelectedISO] = React.useState(days[0]);
  const [openId, setOpenId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const firstWithItems = days.find((d) => (byDay.get(d)?.length ?? 0) > 0);
    setSelectedISO(firstWithItems ?? days[0]);
    setOpenId(null);
  }, [pivotISO, days, byDay]);

  const list = byDay.get(selectedISO) ?? [];
  const todayKey = todayISO();

  return (
    <>
      <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
        <h2 className="text-lg font-extrabold">🗓️ Deze week</h2>
        {loading && <p className="text-[11px] text-stone-500">Laden…</p>}

        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-7">
          {days.map((d, idx) => {
            const count = byDay.get(d)?.length ?? 0;
            const isSelected = d === selectedISO;
            const isToday = d === todayKey;
            const hasBookings = count > 0;

            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setSelectedISO(d);
                  setOpenId(null);
                }}
                className={[
                  "h-20 rounded-xl border p-2 text-left text-xs transition focus:outline-none focus:ring-2 sm:h-24",
                  hasBookings
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-stone-200 bg-stone-50",
                  isSelected ? "ring-2 ring-stone-900 ring-offset-2" : "",
                  isToday ? "outline outline-1 outline-stone-900/60" : "",
                  isBeforeToday(d) ? "opacity-75" : "",
                ].join(" ")}
                aria-pressed={isSelected}
              >
                <div className="flex h-full flex-col justify-between">
                  <div className="text-lg font-extrabold leading-none text-stone-800">
                    {Number(d.slice(-2))}
                  </div>
                  <div className="flex items-end justify-between gap-1">
                    <span className="text-[10px] font-bold text-stone-500">
                      {nlDaysShort[idx]}
                    </span>
                    <span
                      className={[
                        "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none",
                        hasBookings
                          ? "bg-emerald-600 text-white"
                          : "bg-white text-stone-500 ring-1 ring-stone-300",
                      ].join(" ")}
                    >
                      ({count})
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
        <h3 className="text-base font-extrabold">📍 {fmtDateNL(selectedISO)}</h3>
        {list.length === 0 && (
          <p className="mt-1 text-xs text-stone-500">
            Geen <strong>bevestigde boekingen</strong> op deze dag.
          </p>
        )}

        <ul className="mt-2 space-y-1.5">
          {list.map((b) => (
            <MiniBookingRow
              key={b.id}
              b={b}
              onOpenFull={() => setOpenId(openId === b.id ? null : b.id)}
            />
          ))}
        </ul>

        <div className="mt-2 space-y-2">
          {list.map((b) =>
            openId === b.id ? (
              <BookingCard key={`full-${b.id}`} b={b} onChanged={onChanged} />
            ) : null
          )}
        </div>
      </section>
    </>
  );
}

function MonthView({
  items,
  loading,
  pivotISO,
  onChanged,
}: {
  items: AgendaItem[];
  loading: boolean;
  pivotISO: string;
  onChanged?: () => void;
}) {
  const base = React.useMemo(() => {
    const d = parseYMDLocal(pivotISO);
    d.setDate(1);
    return d;
  }, [pivotISO]);

  const year = base.getFullYear();
  const month = base.getMonth();

  const first = React.useMemo(() => new Date(year, month, 1), [year, month]);
  const last = React.useMemo(() => new Date(year, month + 1, 0), [year, month]);

  const daysInMonth = last.getDate();
  const startWeekday = (first.getDay() + 6) % 7;
  const endWeekday = (last.getDay() + 6) % 7;
  const prevOverflow = startWeekday;
  const nextOverflow = 6 - endWeekday;

  const byDate = React.useMemo(() => {
    const map = new Map<string, AgendaItem[]>();

    for (const item of items) {
      const key = dayKeyFromISO(item.startTime);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }

    for (const key of map.keys()) {
      map.get(key)!.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    return map;
  }, [items]);

  type Cell = {
    dateISO: string;
    inMonth: boolean;
    dayNum: number;
    count: number;
  };

  const cells = React.useMemo(() => {
    const nextCells: Cell[] = [];

    if (prevOverflow > 0) {
      const prevLast = new Date(year, month, 0);
      const prevDays = prevLast.getDate();

      for (let i = prevOverflow - 1; i >= 0; i--) {
        const day = prevDays - i;
        const iso = toYMD(new Date(year, month - 1, day));

        nextCells.push({
          dateISO: iso,
          inMonth: false,
          dayNum: day,
          count: byDate.get(iso)?.length ?? 0,
        });
      }
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = toYMD(new Date(year, month, day));

      nextCells.push({
        dateISO: iso,
        inMonth: true,
        dayNum: day,
        count: byDate.get(iso)?.length ?? 0,
      });
    }

    for (let day = 1; day <= nextOverflow; day++) {
      const iso = toYMD(new Date(year, month + 1, day));

      nextCells.push({
        dateISO: iso,
        inMonth: false,
        dayNum: day,
        count: byDate.get(iso)?.length ?? 0,
      });
    }

    return nextCells;
  }, [prevOverflow, nextOverflow, year, month, daysInMonth, byDate]);

  const [selectedISO, setSelectedISO] = React.useState(toYMD(first));
  const [openId, setOpenId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedISO(toYMD(first));
    setOpenId(null);
  }, [first]);

  const list = byDate.get(selectedISO) ?? [];
  const todayKey = todayISO();

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-extrabold">
            📆 {nlMonths[month]} {year}
          </h3>
          {loading && <p className="text-[11px] text-stone-500">Laden…</p>}
        </div>

        <div className="mb-2 hidden grid-cols-7 gap-2 text-center text-[10px] font-semibold text-stone-500 sm:grid">
          {nlDaysShort.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {cells.map((cell) => {
            const isSelected = cell.dateISO === selectedISO;
            const isToday = cell.dateISO === todayKey;
            const hasBookings = cell.count > 0;

            return (
              <button
                key={cell.dateISO}
                type="button"
                onClick={() => {
                  setSelectedISO(cell.dateISO);
                  setOpenId(null);
                }}
                className={[
                  "relative h-12 rounded-xl border px-1.5 py-1.5 text-left transition focus:outline-none focus:ring-2 sm:h-16",
                  hasBookings
                    ? "border-emerald-300 bg-emerald-50"
                    : cell.inMonth
                      ? "border-stone-200 bg-white"
                      : "border-stone-200 bg-stone-50 text-stone-400",
                  isSelected ? "ring-2 ring-stone-900 ring-offset-2" : "",
                  isToday ? "outline outline-1 outline-stone-900/60" : "",
                  isBeforeToday(cell.dateISO) ? "opacity-80" : "",
                ].join(" ")}
                aria-label={`Selecteer ${cell.dateISO}, ${cell.count} boekingen`}
              >
                <div className="flex h-full flex-col justify-between">
                  <div
                    className={[
                      "text-lg font-extrabold leading-none sm:text-2xl",
                      hasBookings
                        ? "text-emerald-800"
                        : cell.inMonth
                          ? "text-stone-800"
                          : "text-stone-400",
                    ].join(" ")}
                  >
                    {cell.dayNum}
                  </div>

                  <div className="flex justify-end">
                    <span
                      className={[
                        "rounded-full px-1.5 py-0.5 text-[9px] font-extrabold leading-none sm:text-[10px]",
                        hasBookings
                          ? "bg-emerald-600 text-white"
                          : "bg-stone-100 text-stone-500 ring-1 ring-stone-200",
                      ].join(" ")}
                    >
                      ({cell.count})
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
        <h3 className="text-base font-extrabold">📍 {fmtDateNL(selectedISO)}</h3>
        {list.length === 0 && (
          <p className="mt-1 text-xs text-stone-500">
            Geen <strong>bevestigde boekingen</strong> op deze dag.
          </p>
        )}

        <ul className="mt-2 space-y-1.5">
          {list.map((b) => (
            <MiniBookingRow
              key={b.id}
              b={b}
              onOpenFull={() => setOpenId(openId === b.id ? null : b.id)}
            />
          ))}
        </ul>

        <div className="mt-2 space-y-2">
          {list.map((b) =>
            openId === b.id ? (
              <BookingCard key={`full-${b.id}`} b={b} onChanged={onChanged} />
            ) : null
          )}
        </div>
      </section>
    </div>
  );
}