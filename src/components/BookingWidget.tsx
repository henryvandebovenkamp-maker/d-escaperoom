// PATH: src/components/BookingWidget.tsx
"use client";

import * as React from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

/* ===================== Abort helper (nieuw) ===================== */
function isAbortError(err: unknown): boolean {
  return (
    (err as any)?.name === "AbortError" ||
    (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError")
  );
}

/* ===================== Types ===================== */
type SlotItem = {
  id: string;
  startTime: string; // ISO
  status: "DRAFT" | "PUBLISHED" | "BOOKED";
};

type DayCounts = { published: number; booked: number; total: number };

type PartnerOption = { id: string; slug: string; name: string; city: string | null };

type PriceInfo = { total: number; deposit: number; rest: number; feePercent: number };

/* ===================== Zod schema ===================== */
const FormSchema = z.object({
  partnerSlug: z.string().min(1, "Kies een hondenschool"),
  dayISO: z.string().min(1, "Kies een datum"),
  slotId: z.string().min(1, "Kies een tijdslot"),
  players: z.number().min(1).max(3),
  dogName: z.string().min(2, "Vul de hondennaam in"),
  fullName: z.string().min(2, "Vul je naam in"),
  email: z.string().email("Vul een geldig e-mailadres in"),
});

/* ===================== Date helpers (NL) ===================== */
const NL_DAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"] as const;

function toDayISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function toMonthISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function monthLabel(d: Date) {
  return d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function startOfCalendarGrid(d: Date) {
  const first = startOfMonth(d);
  const js = first.getDay(); // 0=zo..6=za
  const offset = js === 0 ? -6 : 1 - js; // maandagstart
  const start = new Date(first);
  start.setDate(first.getDate() + offset);
  return start;
}
function buildCalendarDays(d: Date) {
  const start = startOfCalendarGrid(d);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    days.push(x);
  }
  return days;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isPastDay(d: Date) {
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return d0 < t0;
}
function isToday(d: Date) {
  const today = new Date();
  return isSameDay(d, today);
}
function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

/* ===================== Fetch helpers ===================== */
async function postJSON<T>(url: string, body: any, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

function usePreviewMode() {
  const [preview, setPreview] = React.useState(false);
  React.useEffect(() => {
    const sp = new URLSearchParams(location.search);
    setPreview(sp.get("preview") === "1");
  }, []);
  return preview;
}

async function fetchPartners(preview = false, signal?: AbortSignal): Promise<PartnerOption[]> {
  const endpoint = preview ? "/api/partners/list?all=1" : "/api/public/partners";
  const opts: RequestInit = preview ? { cache: "no-store", credentials: "include", signal } : { cache: "no-store", signal };
  const r = await fetch(endpoint, opts);
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  const rows: any[] = Array.isArray(data) ? data : data?.items ?? [];
  return rows
    .filter((p) => p && p.slug && p.name)
    .map((p) => ({ id: p.id, slug: p.slug, name: p.name, city: p.city ?? null }));
}

async function fetchCalendarCounts(
  partnerSlug: string,
  gridStart: Date,
  gridEnd: Date,
  preview = false,
  signal?: AbortSignal
): Promise<Record<string, DayCounts>> {
  if (!preview) {
    const startISO = toDayISO(gridStart);
    const endISO = toDayISO(new Date(gridEnd.getFullYear(), gridEnd.getMonth(), gridEnd.getDate()));
    const r = await fetch(
      `/api/public/slots/${encodeURIComponent(partnerSlug)}/calendar?start=${startISO}&end=${endISO}`,
      { cache: "no-store", signal }
    );
    if (r.ok) {
      const data = await r.json();
      const items = Array.isArray(data) ? data : data?.items ?? [];
      const out: Record<string, DayCounts> = {};
      for (const row of items) {
        const dayISO: string | undefined = row?.dayISO ?? row?.day ?? row?.dateISO;
        if (!dayISO) continue;
        const c = row?.counts ?? {};
        const pub = Number(c.published ?? row?.published ?? 0);
        const boo = Number(c.booked ?? row?.booked ?? 0);
        const tot = Number(c.total ?? pub + boo);
        out[dayISO] = { published: pub, booked: boo, total: tot };
      }
      return out;
    }
  }

  // preview fallback
  const months: string[] = [];
  const d = new Date(gridStart);
  d.setDate(1);
  const end = new Date(gridEnd.getFullYear(), gridEnd.getMonth(), 1);
  while (d <= end) {
    months.push(toMonthISO(d));
    d.setMonth(d.getMonth() + 1);
  }

  const out: Record<string, DayCounts> = {};
  for (const mi of months) {
    const r = await fetch(
      `/api/slots/${encodeURIComponent(partnerSlug)}/list?scope=month&month=${encodeURIComponent(mi)}`,
      { cache: "no-store", credentials: "include", signal }
    );
    if (!r.ok) continue;
    const j = await r.json();
    if (Array.isArray(j.days)) {
      for (const row of j.days) {
        const dayISO = row.day ?? row.date;
        if (!dayISO) continue;
        const pub = Number(row.PUBLISHED ?? row.publishedCount ?? 0);
        const boo = Number(row.BOOKED ?? row.bookedCount ?? 0);
        out[dayISO] = { published: pub, booked: boo, total: pub + boo };
      }
    } else if (Array.isArray(j.publishedDays)) {
      for (const row of j.publishedDays) {
        const dayISO = row.date;
        const pub = Number(row.publishedCount ?? 0);
        out[dayISO] = { published: pub, booked: 0, total: pub };
      }
    }
  }
  return out;
}

/* === Daglijst: scope/mode varianten + strakke typing === */
type NormStatus = "PUBLISHED" | "BOOKED" | "DRAFT" | "UNKNOWN";

async function fetchDaySlots(
  partnerSlug: string,
  dayISO: string,
  signal?: AbortSignal
): Promise<{ published: SlotItem[]; bookedCount: number }> {
  const base = `/api/public/slots/${encodeURIComponent(partnerSlug)}/list`;
  const candidates = [
    `${base}?scope=day&day=${encodeURIComponent(dayISO)}`,
    `${base}?mode=day&day=${encodeURIComponent(dayISO)}`,
    `${base}?scope=day&date=${encodeURIComponent(dayISO)}`,
    `${base}?mode=day&date=${encodeURIComponent(dayISO)}`,
    `${base}?scope=day&dayISO=${encodeURIComponent(dayISO)}`,
    `${base}?mode=day&dayISO=${encodeURIComponent(dayISO)}`,
    `${base}?day=${encodeURIComponent(dayISO)}`,
    `${base}?date=${encodeURIComponent(dayISO)}`,
    `${base}?dayISO=${encodeURIComponent(dayISO)}`,
  ];

  let payload: any = null;
  let lastErr: any = null;
  for (const url of candidates) {
    try {
      const r = await fetch(url, { cache: "no-store", signal });
      if (!r.ok) {
        lastErr = await r.text().catch(() => `HTTP ${r.status}`);
        continue;
      }
      payload = await r.json();
      break;
    } catch (e) {
      // ⬇️ Belangrijk: als het een AbortError is, direct doorgeven (niet wrappen)
      if (isAbortError(e)) throw e;
      lastErr = e;
    }
  }

  if (!payload) {
    // ⬇️ Als de laatste fout een AbortError was, ook als AbortError opnieuw gooien
    if (isAbortError(lastErr) || signal?.aborted) {
      // gooi een AbortError-achtige error zodat bovenliggende catch 'm stil houdt
      const err: any = lastErr instanceof Error ? lastErr : new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
    throw new Error(String(lastErr ?? "Kon tijdsloten niet laden"));
  }

  const items: any[] = Array.isArray(payload) ? payload : payload.items ?? payload.slots ?? payload.published ?? [];

  function normalizeStatus(row: any): NormStatus {
    const raw = row?.status ?? row?.state ?? row?.availability ?? row?.booked;
    if (typeof raw === "boolean") return raw ? "BOOKED" : "PUBLISHED";
    const s = String(raw ?? "").toUpperCase();
    if (["PUBLISHED", "AVAILABLE", "OPEN"].includes(s)) return "PUBLISHED";
    if (["BOOKED", "RESERVED", "FULL"].includes(s)) return "BOOKED";
    if (s === "DRAFT") return "DRAFT";
    return "UNKNOWN";
  }

  function normalizeStartISO(row: any): string | null {
    const raw =
      row?.startTime ??
      row?.startAt ??
      row?.start ??
      row?.startISO ??
      row?.start_time ??
      row?.start_at ??
      row?.time ??
      null;

    if (!raw) return null;

    if (raw instanceof Date) return raw.toISOString();

    if (typeof raw === "string") {
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
        const [hh, mm, ss] = raw.split(":");
        const [y, m, d] = dayISO.split("-").map(Number);
        const dt = new Date(y, (m as number) - 1, d as number, Number(hh), Number(mm), Number(ss ?? 0));
        return dt.toISOString();
      }
      const dt = new Date(raw);
      if (!isNaN(dt.getTime())) return dt.toISOString();
    }
    return null;
  }

  function normalizeId(row: any): string {
    const id = row?.id ?? row?.slotId ?? row?.slot_id ?? row?.uuid ?? "";
    return id !== undefined && id !== null ? String(id) : "";
  }

  const normalized = items
    .map((row) => {
      const status = normalizeStatus(row);
      const startISO = normalizeStartISO(row);
      const id = normalizeId(row);
      return { id, startISO, status } as { id: string; startISO: string | null; status: NormStatus };
    })
    .filter((r) => r.id && r.startISO);

  const published: SlotItem[] = normalized
    .filter((r) => r.status === "PUBLISHED" || r.status === "UNKNOWN")
    .map((r) => ({ id: r.id, startTime: r.startISO!, status: "PUBLISHED" as const }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const bookedCount = normalized.filter((r) => r.status === "BOOKED").length;

  return { published, bookedCount };
}

/* ===================== Helpers: verlopen slots filteren ===================== */
function filterFutureSlotsForDay(dayISO: string, slots: SlotItem[]): SlotItem[] {
  const d = parseISO(dayISO);
  if (isPastDay(d)) return []; // hele dag voorbij → niets
  if (!isToday(d)) return slots; // toekomst → alles tonen
  const now = Date.now() + 5 * 60 * 1000; // 5-min marge
  return slots.filter((s) => new Date(s.startTime).getTime() > now);
}

/* ===================== Component ===================== */
export default function BookingWidget({
  defaultPartnerSlug = "",
  fixedPartnerSlug,
}: {
  defaultPartnerSlug?: string;
  fixedPartnerSlug?: string;
}) {
  const router = useRouter();
  const preview = usePreviewMode();
  const locked = Boolean(fixedPartnerSlug);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const todayISO = toDayISO(new Date());

  // Partner state
  const [partners, setPartners] = React.useState<PartnerOption[]>([]);
  const [partnerSlug, setPartnerSlug] = React.useState<string>(fixedPartnerSlug ?? defaultPartnerSlug);

  // Calendar state
  const [viewMonth, setViewMonth] = React.useState<Date>(startOfMonth(new Date()));
  const [selectedDayISO, setSelectedDayISO] = React.useState<string>(todayISO);
  const [dayStats, setDayStats] = React.useState<Record<string, DayCounts>>({});
  const [loadingCalendar, setLoadingCalendar] = React.useState(false);

  // Day slots state
  const [slots, setSlots] = React.useState<SlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [slotId, setSlotId] = React.useState<string>("");

  // Form state
  const [players, setPlayers] = React.useState<number>(2);
  const [dogName, setDogName] = React.useState<string>("");
  const [fullName, setFullName] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [price, setPrice] = React.useState<PriceInfo | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const timesRef = React.useRef<HTMLDivElement>(null);

  const selectedPartner = React.useMemo(
    () => partners.find((p) => p.slug === partnerSlug) || null,
    [partners, partnerSlug]
  );

  /* ========= Marketing: events ========= */
  React.useEffect(() => {
    if (!mounted) return;
    trackEvent("view_booking");
  }, [mounted]);

  const bookingStartKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!partnerSlug || !selectedDayISO || !players) return;
    const key = `${partnerSlug}|${selectedDayISO}|${players}`;
    if (bookingStartKeyRef.current === key) return;
    trackEvent("booking_start", { partner: partnerSlug, day: selectedDayISO, players });
    bookingStartKeyRef.current = key;
  }, [partnerSlug, selectedDayISO, players]);

  /* Load partners */
  React.useEffect(() => {
    setMsg(null);
    const ac = new AbortController();
    (async () => {
      try {
        const list = await fetchPartners(preview, ac.signal);
        setPartners(list);

        if (locked && fixedPartnerSlug) {
          setPartnerSlug(fixedPartnerSlug);
          return;
        }

        if (defaultPartnerSlug && list.find((p) => p.slug === defaultPartnerSlug)) {
          setPartnerSlug(defaultPartnerSlug);
        } else if (!list.find((p) => p.slug === partnerSlug)) {
          setPartnerSlug(list[0]?.slug ?? "");
        }
      } catch (err: any) {
        if (!isAbortError(err)) setMsg(err?.message || "Kon hondenscholen niet laden");
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, locked, fixedPartnerSlug]);

  // Sync partnerSlug wanneer fixed verandert
  React.useEffect(() => {
    if (locked && fixedPartnerSlug && partnerSlug !== fixedPartnerSlug) {
      setPartnerSlug(fixedPartnerSlug);
    }
  }, [locked, fixedPartnerSlug, partnerSlug]);

  /* Calendar counts */
  React.useEffect(() => {
    setDayStats({});
    if (!partnerSlug) return;
    setLoadingCalendar(true);
    const ac = new AbortController();
    const gridStart = startOfCalendarGrid(viewMonth);
    const gridEnd = new Date(gridStart);
    gridEnd.setDate(gridStart.getDate() + 41);

    (async () => {
      try {
        const agg = await fetchCalendarCounts(partnerSlug, gridStart, gridEnd, preview, ac.signal);
        setDayStats(agg);
      } catch {
        setDayStats({});
      } finally {
        setLoadingCalendar(false);
      }
    })();

    return () => ac.abort();
  }, [partnerSlug, viewMonth, preview]);

  /* Slots voor geselecteerde dag */
  React.useEffect(() => {
    setSlotId("");
    setPrice(null);
    setMsg(null);
    if (!partnerSlug || !selectedDayISO) return;

    setLoadingSlots(true);
    const ac = new AbortController();

    fetchDaySlots(partnerSlug, selectedDayISO, ac.signal)
      .then(({ published, bookedCount }) => {
        // 🔧 filter verlopen slots
        const filtered = filterFutureSlotsForDay(selectedDayISO, published);
        setSlots(filtered);

        // Schrijf de gefilterde aantallen terug in de dagstatistieken
        const pub = filtered.length;
        const boo = bookedCount;
        setDayStats((prev) => ({ ...prev, [selectedDayISO]: { published: pub, booked: boo, total: pub + boo } }));
      })
      .catch((err) => {
        if (!isAbortError(err)) setMsg((err as any)?.message || "Kon tijdsloten niet laden");
      })
      .finally(() => setLoadingSlots(false));

    return () => ac.abort();
  }, [partnerSlug, selectedDayISO]);

  /* Prijs preview (optioneel) */
  React.useEffect(() => {
    setPrice(null);
    if (!partnerSlug || !slotId) return;

    const partnerId = selectedPartner?.id;
    const slot = slots.find((s) => s.id === slotId);
    const startTimeISO = slot?.startTime;
    if (!partnerId || !startTimeISO) return;

    const ac = new AbortController();

    postJSON<any>(`/api/booking/price`, { partnerId, startTimeISO, playersCount: players }, ac.signal)
      .then((data) => {
        if (!data?.ok) return;
        const feePercent = data.partner?.feePercent ?? 0;
        const total = (data.pricing?.totalCents ?? 0) / 100;
        const deposit = (data.pricing?.depositCents ?? 0) / 100;
        const rest = (data.pricing?.restCents ?? 0) / 100;
        setPrice({ total, deposit, rest, feePercent });
      })
      .catch(() => {});
    return () => ac.abort();
  }, [partnerSlug, slotId, players, slots, selectedPartner]);

  /* Reserve → internal checkout */
  async function onReserve(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const parsed = FormSchema.safeParse({
      partnerSlug,
      dayISO: selectedDayISO,
      slotId,
      players,
      dogName: dogName.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
    });
    if (!parsed.success) {
      setMsg(parsed.error.issues[0]?.message || "Controleer je invoer");
      return;
    }

    try {
      setSubmitting(true);

      const partnerId = selectedPartner?.id;
      const slot = slots.find((s) => s.id === slotId);
      const startTimeISO = slot?.startTime;

      if (!partnerId || !startTimeISO) throw new Error("Kan partner/slot niet bepalen. Probeer opnieuw.");

      const slotIdNum = Number.isFinite(Number(slotId)) ? Number(slotId) : undefined;

      const payload = {
        partnerId,
        partnerSlug,
        slotId: slotIdNum ?? slotId,
        startTimeISO,
        playersCount: players,
        dogName: dogName.trim(),
        customer: { email: email.trim(), name: fullName.trim(), locale: "nl" },
      };

      const createResp = await postJSON<{ ok: boolean; bookingId: string }>(`/api/booking/create`, payload);

      if (createResp?.ok && createResp.bookingId) {
        router.push(`/checkout/${createResp.bookingId}`);
      } else {
        setMsg("Boeking aangemaakt, maar geen bookingId ontvangen.");
      }
    } catch (err: any) {
      if (!isAbortError(err)) setMsg(err?.message || "Er ging iets mis bij reserveren");
    } finally {
      setSubmitting(false);
    }
  }

  const calendarDays = React.useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);
  const selectedDate = parseISO(selectedDayISO);

  // NB: slots-state is al gefilterd op verlopen tijden; dit is puur nog voor badge/logica
  const filteredSlots = React.useMemo(() => filterFutureSlotsForDay(selectedDayISO, slots), [slots, selectedDayISO]);

  const availableCount = filteredSlots.length;
  const availabilityBadge =
    availableCount > 3
      ? { cls: "bg-emerald-100 text-emerald-800 border-emerald-300", label: "Groen — meer dan 3 boekbaar" }
      : availableCount === 1
      ? { cls: "bg-orange-100 text-orange-800 border-orange-300", label: "Oranje — nog maar 1 boekbaar" }
      : availableCount === 0
      ? { cls: "bg-stone-100 text-stone-700 border-stone-300", label: "Grijs — geen tijdsloten beschikbaar" }
      : null;

  function dotClassForDay(
    counts?: DayCounts,
    d?: Date
  ): { cls: string; label: string; hideDot?: boolean } {
    if (d && isPastDay(d)) return { cls: "bg-transparent", label: "", hideDot: true };
    const c = counts;
    if (!c || c.total === 0) return { cls: "bg-stone-500", label: "Geen tijdsloten (grijs)" };
    if (c.published === 1) return { cls: "bg-orange-500", label: "Nog 1 tijdslot (oranje)" };
    if (c.published >= 2) return { cls: "bg-emerald-600", label: "Beschikbaar (groen)" };
    return { cls: "bg-stone-500", label: "Geen tijdsloten (grijs)" };
  }
  function dayTintForDay(counts?: DayCounts, d?: Date) {
    if (d && isPastDay(d)) return { bg: "bg-stone-50", border: "border-stone-200" };
    const c = counts;
    if (!c || c.total === 0) return { bg: "bg-stone-50", border: "border-stone-300" };
    if (c.published === 1) return { bg: "bg-orange-50", border: "border-orange-200" };
    if (c.published >= 2) return { bg: "bg-emerald-50", border: "border-emerald-200" };
    return { bg: "bg-stone-50", border: "border-stone-300" };
  }

  /* ========== SKELETON vóór mount ========== */
  if (!mounted) {
    return (
      <section aria-label="Boekingswidget" className="space-y-4 rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-md backdrop-blur-sm">
        <div className="relative overflow-hidden rounded-2xl border border-stone-200">
          <div className="h-40 w-full animate-pulse bg-stone-100" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
            <div className="mb-3 h-5 w-28 animate-pulse rounded bg-stone-100" />
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-stone-100" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-md bg-stone-100" />
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded-md bg-stone-100" />
              <div className="h-10 animate-pulse rounded-md bg-stone-100" />
              <div className="h-10 animate-pulse rounded-md bg-stone-100" />
              <div className="h-10 animate-pulse rounded-md bg-stone-100" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ========== VOLLEDIGE UI na mount ========== */
  return (
    <section aria-label="Boekingswidget" className="space-y-4 rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-md backdrop-blur-sm">
      {/* ======= COMPACTE HEADER ======= */}
      <div className="relative overflow-visible rounded-2xl border border-stone-200">
        <img
          src="/images/header-foto.png"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl object-cover opacity-80"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-50/60 via-pink-50/50 to-stone-50/60" />
        <div className="relative z-10 grid items-center gap-3 p-3 md:grid-cols-12">
          {/* Zo boek je */}
          <div className="md:col-span-3">
            <div className="rounded-xl border border-stone-200/80 bg-white/80 p-2.5 shadow-sm backdrop-blur">
              <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-700">Zo boek je</div>
              <ol className="space-y-0.5 text-[11px] text-stone-800">
                <li><strong>1:</strong> Selecteer locatie</li>
                <li><strong>2:</strong> Datum &amp; tijd prikken</li>
                <li><strong>3:</strong> Reserveren</li>
              </ol>
            </div>
          </div>

          {/* Compacte titel */}
          <div className="md:col-span-6 text-center">
            <h2 className="text-lg font-extrabold leading-tight tracking-tight text-stone-900 md:text-xl"></h2>
          </div>

          {/* Partner select / lock */}
          <div className="relative z-20 md:col-span-3">
            <label className="mb-1 block text-[11px] font-medium text-stone-700">
              Locatie
            </label>

            {locked ? (
              <div className="h-9 w-full select-none rounded-lg border border-stone-300 bg-stone-50 px-2 text-xs text-stone-700">
                <div className="flex h-full items-center justify-between">
                  <span className="truncate">
                    {selectedPartner?.name ?? partnerSlug}
                    {selectedPartner?.city ? ` — ${selectedPartner.city}` : ""}
                  </span>
                </div>
              </div>
            ) : (
              <select
                value={partnerSlug}
                onChange={(e) => setPartnerSlug(e.target.value)}
                className="h-9 w-full rounded-lg border border-stone-300 bg-white px-2 text-xs outline-none transition focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
                aria-label="Kies locatie"
              >
                {partners.length === 0 ? (
                  <option value="">{msg ? "Kon niet laden" : "Laden…"}</option>
                ) : (
                  <>
                    <option value="">Kies locatie</option>
                    {partners.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}{p.city ? ` — ${p.city}` : ""}
                      </option>
                    ))}
                  </>
                )}
              </select>
            )}
          </div>
        </div>
      </div>
      {/* ======= /COMPACTE HEADER ======= */}

      {/* ======= Agenda + Details ======= */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Calendar */}
        <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-800">Agenda</span>
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-700">{monthLabel(viewMonth)}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
                className="h-8 rounded-lg border border-stone-300 px-2 text-xs font-medium text-stone-800 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-pink-300"
                aria-label="Vorige maand"
                title="Vorige maand"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                className="h-8 rounded-lg border border-stone-300 px-2 text-xs font-medium text-stone-800 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-pink-300"
                aria-label="Volgende maand"
                title="Volgende maand"
              >
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold tracking-wide text-stone-600">
            {NL_DAYS.map((d) => (<div key={d} className="py-1">{d.toUpperCase()}</div>))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((d) => {
              const iso = toDayISO(d);
              const isSelected = isSameDay(d, selectedDate);
              const muted = d.getMonth() !== viewMonth.getMonth();
              const todayFlag = isToday(d);
              const counts = dayStats[iso];
              const dot = dotClassForDay(counts, d);
              const tint = dayTintForDay(counts, d);
              const past = isPastDay(d);

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => !past && setSelectedDayISO(iso)}
                  disabled={past}
                  tabIndex={past ? -1 : 0}
                  aria-disabled={past || undefined}
                  className={[
                    "relative h-11 w-full rounded-lg border text-[11px] leading-none transition",
                    past
                      ? "cursor-default pointer-events-none border-stone-200 bg-stone-50 text-stone-400 opacity-70"
                      : isSelected
                      ? "border-pink-600 bg-pink-50 text-pink-700 shadow-[inset_0_0_0_1px_rgba(236,72,153,0.3)]"
                      : muted
                      ? "border-stone-200 bg-stone-50 text-stone-400 hover:opacity-95"
                      : `${tint.border} ${tint.bg} text-stone-800 hover:opacity-95`,
                    todayFlag && !isSelected && !past ? "ring-1 ring-stone-300" : "",
                  ].join(" ")}
                  aria-pressed={isSelected}
                  aria-current={todayFlag && !past ? "date" : undefined}
                  title={!past && counts ? `${iso} • ${dot.label}` : iso}
                >
                  {d.getDate()}
                  {!past && !dot.hideDot && (
                    <span
                      className={`pointer-events-none absolute inset-x-0 bottom-1 mx-auto block h-1.5 w-1.5 rounded-full ${dot.cls}`}
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>

          {loadingCalendar && <p className="mt-2 text-[11px] text-stone-500">Kalenderstatus laden…</p>}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-1 text-[11px] font-medium text-stone-800"><span className="inline-block h-2 w-2 rounded-full bg-emerald-600" aria-hidden />Groen +2  </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-100 px-2 py-1 text-[11px] font-medium text-stone-800"><span className="inline-block h-2 w-2 rounded-full bg-orange-500" aria-hidden />Oranje 1 boekbaar </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-800"><span className="inline-block h-2 w-2 rounded-full bg-stone-500" aria-hidden />Grijs = Geen tijdsloten beschikbaar</span>
          </div>
        </div>

        {/* Slots + Form */}
        <div ref={timesRef} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-stone-800">
              {(() => {
                const d = new Date(selectedDayISO);
                const weekday = d.toLocaleDateString("nl-NL", { weekday: "long" });
                const day = d.toLocaleDateString("nl-NL", { day: "numeric" });
                const month = d.toLocaleDateString("nl-NL", { month: "long" });
                return `Beschikbare tijdsloten op ${weekday} ${day} ${month}`;
              })()}
            </div>
            {availabilityBadge && (
              <span className={`hidden md:inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${availabilityBadge.cls}`}>
                {availabilityBadge.label}
              </span>
            )}
          </div>

          {!partnerSlug ? (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-2 text-xs text-stone-600">Selecteer eerst een hondenschool om beschikbare tijdsloten te zien.</div>
          ) : loadingSlots ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-live="polite">
              {Array.from({ length: 8 }).map((_, i) => (<div key={i} className="h-9 animate-pulse rounded-md bg-stone-100" />))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {filteredSlots.length === 0 ? (
                <div className="col-span-2 rounded-lg border border-stone-200 bg-stone-50 p-2 text-xs text-stone-600 md:col-span-4">Geen tijdsloten beschikbaar.</div>
              ) : (
                filteredSlots.map((s) => {
                  const selected = slotId === s.id;
                  const cls = selected
                    ? "border-pink-600 bg-pink-50 text-pink-700 focus:ring-pink-300"
                    : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus:ring-emerald-300";
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSlotId(s.id)}
                      className={`relative h-9 rounded-lg border px-2 text-xs font-medium transition focus:outline-none focus:ring-2 ${cls}`}
                      aria-pressed={selected}
                      aria-label={`Tijdslot ${formatTime(s.startTime)} (boekbaar)`}
                      title={formatTime(s.startTime)}
                    >
                      {formatTime(s.startTime)}
                      {selected && (
                        <span className="pointer-events-none absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/90">
                          <svg viewBox="0 0 20 20" className="h-3 w-3 fill-white" aria-hidden>
                            <path d="M7.629 13.233 3.9 9.504l1.414-1.414 2.315 2.315 6.057-6.057 1.414 1.414z" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={onReserve} className="mt-3 space-y-3" aria-label="Reserveringsformulier">
            <div className="flex flex-nowrap items-start gap-2">
              <label className="w-28 shrink-0 text-xs font-medium text-stone-800">
                Aantal spelers
                <select value={players} onChange={(e) => setPlayers(Number(e.target.value))} className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm outline-none transition focus:border-pink-600 focus:ring-2 focus:ring-pink-300">
                  <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                </select>
              </label>
              <label className="min-w-0 flex-1 text-xs font-medium text-stone-800">
                Jouw naam
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="bijv. Jamie de Vries" className="mt-1 h-10 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-pink-600 focus:ring-2 focus:ring-pink-300" />
              </label>
              <label className="min-w-0 flex-1 text-xs font-medium text-stone-800">
                Naam hond
                <input value={dogName} onChange={(e) => setDogName(e.target.value)} placeholder="bijv. Sam" className="mt-1 h-10 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-pink-600 focus:ring-2 focus:ring-pink-300" />
              </label>
            </div>

            <label className="block text-xs font-medium text-stone-800">
              E-mailadres
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jij@example.com" className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-pink-600 focus:ring-2 focus:ring-pink-300" />
            </label>

            {price && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs">
                <div className="mb-1 text-[11px] font-semibold text-stone-700">Prijs</div>
                <div className="flex items-center justify-between"><span>Totaal</span><strong>€ {price.total.toFixed(2)}</strong></div>
                <div className="flex items-center justify-between"><span>Aanbetaling ({price.feePercent}%)</span><strong>€ {price.deposit.toFixed(2)}</strong></div>
                <div className="flex items-center justify-between"><span>Rest op locatie</span><strong>€ {price.rest.toFixed(2)}</strong></div>
              </div>
            )}

            {msg && <p className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">{msg}</p>}

            <button type="submit" disabled={submitting || !slotId} className="w-full rounded-2xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:opacity-60">
              {submitting ? "Reserveren…" : "Reserveer nu"}
            </button>

            {!slotId && <p className="text-[11px] text-stone-500">Kies eerst een tijdslot hierboven om door te gaan naar de checkout.</p>}
            <p className="text-[11px] text-stone-500">Je betaalt nu de aanbetaling; het restant betaal je bij de hondenschool.</p>
          </form>
        </div>
      </div>
    </section>
  );
}
