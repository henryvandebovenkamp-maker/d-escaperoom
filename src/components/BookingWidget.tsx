// PATH: src/components/BookingWidget.tsx
"use client";

import * as React from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

const APP_TIMEZONE = "Europe/Amsterdam";

function isAbortError(err: unknown): boolean {
  return (
    (err as any)?.name === "AbortError" ||
    (typeof DOMException !== "undefined" &&
      err instanceof DOMException &&
      err.name === "AbortError")
  );
}

type SlotItem = {
  id: string;
  startTime: string;
  status: "DRAFT" | "PUBLISHED" | "BOOKED";
};

type DayCounts = { published: number; booked: number; total: number };

type PartnerOption = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
};

type PriceInfo = {
  total: number;
  deposit: number;
  rest: number;
  feePercent: number;
};

const FormSchema = z.object({
  partnerSlug: z.string().min(1, "Kies een hondenschool"),
  dayISO: z.string().min(1, "Kies een datum"),
  slotId: z.string().min(1, "Kies een tijdslot"),
  players: z.number().min(1).max(3),
  dogName: z.string().min(2, "Vul de hondennaam in"),
  fullName: z.string().min(2, "Vul je naam in"),
  email: z.string().email("Vul een geldig e-mailadres in"),
});

const NL_DAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"] as const;

function formatInAmsterdam(
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
  locale = "nl-NL"
) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIMEZONE,
    ...options,
  }).format(date);
}

function parseISODateOnly(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDayISO(date = new Date()) {
  return formatInAmsterdam(
    date,
    { year: "numeric", month: "2-digit", day: "2-digit" },
    "en-CA"
  );
}

function toMonthISO(date = new Date()) {
  return formatInAmsterdam(date, { year: "numeric", month: "2-digit" }, "en-CA");
}

function monthLabel(date: Date) {
  return formatInAmsterdam(date, { month: "long", year: "numeric" });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function startOfCalendarGrid(date: Date) {
  const first = startOfMonth(date);
  const jsDay = first.getDay();
  const offset = jsDay === 0 ? -6 : 1 - jsDay;
  const start = new Date(first);
  start.setDate(first.getDate() + offset);
  return start;
}

function buildCalendarDays(date: Date) {
  const start = startOfCalendarGrid(date);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const next = new Date(start);
    next.setDate(start.getDate() + i);
    days.push(next);
  }
  return days;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isPastDay(date: Date) {
  return toDayISO(date) < toDayISO(new Date());
}

function isToday(date: Date) {
  return toDayISO(date) === toDayISO(new Date());
}

function formatTime(iso: string) {
  return formatInAmsterdam(iso, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function sortSlotsByTime(slots: SlotItem[]) {
  return [...slots].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

function filterFutureSlotsForDay(dayISO: string, slots: SlotItem[]) {
  const day = parseISODateOnly(dayISO);
  if (isPastDay(day)) return [];
  if (!isToday(day)) return sortSlotsByTime(slots);

  const now = Date.now() + 5 * 60 * 1000;
  return sortSlotsByTime(slots).filter(
    (slot) => new Date(slot.startTime).getTime() > now
  );
}

async function postJSON<T>(
  url: string,
  body: any,
  signal?: AbortSignal
): Promise<T> {
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

async function fetchPartners(
  preview = false,
  signal?: AbortSignal
): Promise<PartnerOption[]> {
  const endpoint = preview ? "/api/partners/list?all=1" : "/api/public/partners";
  const opts: RequestInit = preview
    ? { cache: "no-store", credentials: "include", signal }
    : { cache: "no-store", signal };

  const res = await fetch(endpoint, opts);
  if (!res.ok) throw new Error(await res.text());

  const data = await res.json();
  const rows: any[] = Array.isArray(data) ? data : data?.items ?? [];

  return rows
    .filter((p) => p && p.slug && p.name)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      city: p.city ?? null,
    }));
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
    const endISO = toDayISO(gridEnd);

    const res = await fetch(
      `/api/public/slots/${encodeURIComponent(
        partnerSlug
      )}/calendar?start=${startISO}&end=${endISO}`,
      { cache: "no-store", signal }
    );

    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : data?.items ?? [];
      const out: Record<string, DayCounts> = {};

      for (const row of items) {
        const dayISO: string | undefined =
          row?.dayISO ?? row?.day ?? row?.dateISO;
        if (!dayISO) continue;

        const c = row?.counts ?? {};
        const published = Number(c.published ?? row?.published ?? 0);
        const booked = Number(c.booked ?? row?.booked ?? 0);
        const total = Number(c.total ?? published + booked);

        out[dayISO] = { published, booked, total };
      }

      return out;
    }
  }

  const months: string[] = [];
  const current = new Date(gridStart);
  current.setDate(1);

  const end = new Date(gridEnd.getFullYear(), gridEnd.getMonth(), 1);
  while (current <= end) {
    months.push(toMonthISO(current));
    current.setMonth(current.getMonth() + 1);
  }

  const out: Record<string, DayCounts> = {};

  for (const monthISO of months) {
    const res = await fetch(
      `/api/slots/${encodeURIComponent(
        partnerSlug
      )}/list?scope=month&month=${encodeURIComponent(monthISO)}`,
      { cache: "no-store", credentials: "include", signal }
    );

    if (!res.ok) continue;

    const data = await res.json();

    if (Array.isArray(data.days)) {
      for (const row of data.days) {
        const dayISO = row.day ?? row.date;
        if (!dayISO) continue;

        const published = Number(row.PUBLISHED ?? row.publishedCount ?? 0);
        const booked = Number(row.BOOKED ?? row.bookedCount ?? 0);

        out[dayISO] = { published, booked, total: published + booked };
      }
    } else if (Array.isArray(data.publishedDays)) {
      for (const row of data.publishedDays) {
        const dayISO = row.date;
        const published = Number(row.publishedCount ?? 0);
        out[dayISO] = { published, booked: 0, total: published };
      }
    }
  }

  return out;
}

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
      const res = await fetch(url, { cache: "no-store", signal });
      if (!res.ok) {
        lastErr = await res.text().catch(() => `HTTP ${res.status}`);
        continue;
      }
      payload = await res.json();
      break;
    } catch (err) {
      if (isAbortError(err)) throw err;
      lastErr = err;
    }
  }

  if (!payload) {
    if (isAbortError(lastErr) || signal?.aborted) {
      const err: any =
        lastErr instanceof Error ? lastErr : new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
    throw new Error(String(lastErr ?? "Kon tijdsloten niet laden"));
  }

  const items: any[] = Array.isArray(payload)
    ? payload
    : payload.items ?? payload.slots ?? payload.published ?? [];

  function normalizeStatus(row: any): NormStatus {
    const raw = row?.status ?? row?.state ?? row?.availability ?? row?.booked;
    if (typeof raw === "boolean") return raw ? "BOOKED" : "PUBLISHED";

    const status = String(raw ?? "").toUpperCase();
    if (["PUBLISHED", "AVAILABLE", "OPEN"].includes(status)) return "PUBLISHED";
    if (["BOOKED", "RESERVED", "FULL"].includes(status)) return "BOOKED";
    if (status === "DRAFT") return "DRAFT";
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
        const dt = new Date(
          y,
          (m as number) - 1,
          d as number,
          Number(hh),
          Number(mm),
          Number(ss ?? 0)
        );
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
      return { id, startISO, status };
    })
    .filter((row) => row.id && row.startISO) as Array<{
    id: string;
    startISO: string;
    status: NormStatus;
  }>;

  const published: SlotItem[] = normalized
    .filter((row) => row.status === "PUBLISHED" || row.status === "UNKNOWN")
    .map((row) => ({
      id: row.id,
      startTime: row.startISO,
      status: "PUBLISHED" as const,
    }));

  const bookedCount = normalized.filter((row) => row.status === "BOOKED").length;

  return {
    published: sortSlotsByTime(published),
    bookedCount,
  };
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-[1.35rem] border border-white/10 bg-black/22 p-4 shadow-xl shadow-black/15 backdrop-blur-md",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function FieldLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={["mb-1.5 block text-[11px] font-medium text-stone-200", className].join(" ")}>
      {children}
    </span>
  );
}

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

  const [partners, setPartners] = React.useState<PartnerOption[]>([]);
  const [partnerSlug, setPartnerSlug] = React.useState<string>(
    fixedPartnerSlug ?? defaultPartnerSlug ?? ""
  );

  const [viewMonth, setViewMonth] = React.useState<Date>(startOfMonth(new Date()));
  const [selectedDayISO, setSelectedDayISO] = React.useState<string>(todayISO);
  const [dayStats, setDayStats] = React.useState<Record<string, DayCounts>>({});
  const [loadingCalendar, setLoadingCalendar] = React.useState(false);

  const [slots, setSlots] = React.useState<SlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [slotId, setSlotId] = React.useState<string>("");

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

  React.useEffect(() => {
    if (!mounted) return;
    trackEvent("view_booking");
  }, [mounted]);

  const bookingStartKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!partnerSlug || !selectedDayISO || !players) return;
    const key = `${partnerSlug}|${selectedDayISO}|${players}`;
    if (bookingStartKeyRef.current === key) return;

    trackEvent("booking_start", {
      partner: partnerSlug,
      day: selectedDayISO,
      players,
    });

    bookingStartKeyRef.current = key;
  }, [partnerSlug, selectedDayISO, players]);

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

        if (
          defaultPartnerSlug &&
          list.find((p) => p.slug === defaultPartnerSlug)
        ) {
          setPartnerSlug(defaultPartnerSlug);
          return;
        }

        if (partnerSlug && !list.find((p) => p.slug === partnerSlug)) {
          setPartnerSlug("");
        }
      } catch (err: any) {
        if (!isAbortError(err)) {
          setMsg(err?.message || "Kon hondenscholen niet laden");
        }
      }
    })();

    return () => ac.abort();
  }, [preview, locked, fixedPartnerSlug, defaultPartnerSlug, partnerSlug]);

  React.useEffect(() => {
    if (locked && fixedPartnerSlug && partnerSlug !== fixedPartnerSlug) {
      setPartnerSlug(fixedPartnerSlug);
    }
  }, [locked, fixedPartnerSlug, partnerSlug]);

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
        const agg = await fetchCalendarCounts(
          partnerSlug,
          gridStart,
          gridEnd,
          preview,
          ac.signal
        );
        setDayStats(agg);
      } catch {
        setDayStats({});
      } finally {
        setLoadingCalendar(false);
      }
    })();

    return () => ac.abort();
  }, [partnerSlug, viewMonth, preview]);

  React.useEffect(() => {
    setSlotId("");
    setPrice(null);
    setMsg(null);

    if (!partnerSlug || !selectedDayISO) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    const ac = new AbortController();

    fetchDaySlots(partnerSlug, selectedDayISO, ac.signal)
      .then(({ published, bookedCount }) => {
        const filtered = filterFutureSlotsForDay(selectedDayISO, published);
        setSlots(filtered);

        const pub = filtered.length;
        const boo = bookedCount;

        setDayStats((prev) => ({
          ...prev,
          [selectedDayISO]: { published: pub, booked: boo, total: pub + boo },
        }));
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          setMsg((err as any)?.message || "Kon tijdsloten niet laden");
        }
      })
      .finally(() => setLoadingSlots(false));

    return () => ac.abort();
  }, [partnerSlug, selectedDayISO]);

  React.useEffect(() => {
    setPrice(null);
    if (!partnerSlug || !slotId) return;

    const partnerId = selectedPartner?.id;
    const slot = slots.find((s) => s.id === slotId);
    const startTimeISO = slot?.startTime;
    if (!partnerId || !startTimeISO) return;

    const ac = new AbortController();

    postJSON<any>(
      `/api/booking/price`,
      { partnerId, startTimeISO, playersCount: players },
      ac.signal
    )
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

      if (!partnerId || !startTimeISO) {
        throw new Error("Kan partner of tijdslot niet bepalen. Probeer opnieuw.");
      }

      const slotIdNum = Number.isFinite(Number(slotId))
        ? Number(slotId)
        : undefined;

      const payload = {
        partnerId,
        partnerSlug,
        slotId: slotIdNum ?? slotId,
        startTimeISO,
        playersCount: players,
        dogName: dogName.trim(),
        customer: {
          email: email.trim(),
          name: fullName.trim(),
          locale: "nl",
        },
      };

      const createResp = await postJSON<{ ok: boolean; bookingId: string }>(
        `/api/booking/create`,
        payload
      );

      if (createResp?.ok && createResp.bookingId) {
        router.push(`/checkout/${createResp.bookingId}`);
      } else {
        setMsg("Boeking aangemaakt, maar geen bookingId ontvangen.");
      }
    } catch (err: any) {
      if (!isAbortError(err)) {
        setMsg(err?.message || "Er ging iets mis bij reserveren");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const calendarDays = React.useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);
  const selectedDate = parseISODateOnly(selectedDayISO);
  const filteredSlots = React.useMemo(
    () => filterFutureSlotsForDay(selectedDayISO, slots),
    [slots, selectedDayISO]
  );

  const availableCount = filteredSlots.length;
  const availabilityBadge =
    availableCount > 3
      ? {
          cls: "border-emerald-400/25 bg-emerald-500/12 text-emerald-100",
          label: "Groen +2",
        }
      : availableCount === 1
      ? {
          cls: "border-orange-400/25 bg-orange-500/12 text-orange-100",
          label: "Oranje 1 boekbaar",
        }
      : availableCount === 0
      ? {
          cls: "border-white/10 bg-white/[0.05] text-stone-300",
          label: "Geen tijdsloten",
        }
      : null;

  function dotClassForDay(
    counts?: DayCounts,
    d?: Date
  ): { cls: string; label: string; hideDot?: boolean } {
    if (d && isPastDay(d)) return { cls: "bg-transparent", label: "", hideDot: true };
    const c = counts;
    if (!c || c.total === 0) return { cls: "bg-stone-500", label: "Geen tijdsloten" };
    if (c.published === 1) return { cls: "bg-orange-400", label: "Nog 1 tijdslot" };
    if (c.published >= 2) return { cls: "bg-emerald-400", label: "Beschikbaar" };
    return { cls: "bg-stone-500", label: "Geen tijdsloten" };
  }

  function dayTintForDay(counts?: DayCounts, d?: Date) {
    if (d && isPastDay(d)) {
      return {
        bg: "bg-white/[0.03]",
        border: "border-white/5",
        text: "text-stone-500",
      };
    }
    const c = counts;
    if (!c || c.total === 0) {
      return {
        bg: "bg-white/[0.03]",
        border: "border-white/10",
        text: "text-stone-300",
      };
    }
    if (c.published === 1) {
      return {
        bg: "bg-orange-500/10",
        border: "border-orange-400/30",
        text: "text-orange-100",
      };
    }
    if (c.published >= 2) {
      return {
        bg: "bg-emerald-500/10",
        border: "border-emerald-400/30",
        text: "text-emerald-100",
      };
    }
    return {
      bg: "bg-white/[0.03]",
      border: "border-white/10",
      text: "text-stone-300",
    };
  }

  if (!mounted) {
    return (
      <section
        aria-label="Boekingswidget"
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 text-white shadow-2xl shadow-black/25 backdrop-blur-sm sm:p-6"
      >
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_40%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,114,182,0.08),rgba(251,191,36,0.05)_40%,rgba(255,255,255,0.02)_100%)]" />
        </div>

        <div className="relative text-center">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90">
            BOEK JULLIE MOMENT
          </span>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Kies jullie locatie,
            <span className="block text-rose-300">prik een tijdslot en reserveer</span>
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-stone-200/80 sm:text-base">
            Boek eenvoudig jullie western avontuur. Je betaalt nu alleen de
            aanbetaling; het restant betaal je op locatie bij de hondenschool.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-[1.02fr_0.98fr]">
            <Panel>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Agenda</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-stone-200">
                    {monthLabel(viewMonth)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-white/10" />
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-white/10" />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold tracking-[0.18em] text-stone-400">
                {NL_DAYS.map((d) => (
                  <div key={d} className="py-1">
                    {d.toUpperCase()}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div key={i} className="h-11 animate-pulse rounded-xl bg-white/10" />
                ))}
              </div>
            </Panel>

            <Panel className="text-left">
              <div className="space-y-4">
                <div className="h-11 animate-pulse rounded-xl bg-white/10" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-11 animate-pulse rounded-xl bg-white/10" />
                  <div className="h-11 animate-pulse rounded-xl bg-white/10" />
                </div>
                <div className="h-11 animate-pulse rounded-xl bg-white/10" />
                <div className="h-11 animate-pulse rounded-xl bg-white/10" />
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-xl bg-white/10" />
                  ))}
                </div>
                <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
              </div>
            </Panel>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Boekingswidget"
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 text-white shadow-2xl shadow-black/25 backdrop-blur-sm sm:p-6"
    >
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,114,182,0.08),rgba(251,191,36,0.05)_40%,rgba(255,255,255,0.02)_100%)]" />
      </div>

      <div className="relative text-center">
        <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
          BOEK JULLIE MOMENT
        </span>

        <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Kies jullie locatie,
          <span className="block text-rose-300">prik een tijdslot en reserveer</span>
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-stone-200/80 sm:text-base">
          Boek eenvoudig jullie western avontuur. Je betaalt nu alleen de
          aanbetaling; het restant betaal je op locatie bij de hondenschool.
        </p>

        <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-[1.02fr_0.98fr]">
          <Panel>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Agenda</span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-stone-200">
                  {monthLabel(viewMonth)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, -1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-sm font-medium text-white transition hover:bg-white/[0.10] focus:outline-none focus:ring-2 focus:ring-rose-300/40"
                  aria-label="Vorige maand"
                  title="Vorige maand"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-sm font-medium text-white transition hover:bg-white/[0.10] focus:outline-none focus:ring-2 focus:ring-rose-300/40"
                  aria-label="Volgende maand"
                  title="Volgende maand"
                >
                  →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold tracking-[0.18em] text-stone-400">
              {NL_DAYS.map((d) => (
                <div key={d} className="py-1">
                  {d.toUpperCase()}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day) => {
                const iso = toDayISO(day);
                const isSelected = isSameDay(day, selectedDate);
                const muted = day.getMonth() !== viewMonth.getMonth();
                const todayFlag = isToday(day);
                const counts = dayStats[iso];
                const dot = dotClassForDay(counts, day);
                const tint = dayTintForDay(counts, day);
                const past = isPastDay(day);

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => !past && setSelectedDayISO(iso)}
                    disabled={past}
                    tabIndex={past ? -1 : 0}
                    aria-disabled={past || undefined}
                    className={[
                      "relative h-11 w-full rounded-xl border text-[11px] leading-none transition",
                      past
                        ? "pointer-events-none cursor-default border-white/5 bg-white/[0.03] text-stone-500 opacity-70"
                        : isSelected
                        ? "border-rose-300/60 bg-rose-500/12 text-rose-100 shadow-[inset_0_0_0_1px_rgba(244,114,182,0.25)]"
                        : muted
                        ? "border-white/5 bg-white/[0.03] text-stone-500 hover:opacity-95"
                        : `${tint.border} ${tint.bg} ${tint.text} hover:opacity-95`,
                      todayFlag && !isSelected && !past ? "ring-1 ring-white/15" : "",
                    ].join(" ")}
                    aria-pressed={isSelected}
                    aria-current={todayFlag && !past ? "date" : undefined}
                    title={!past && counts ? `${iso} • ${dot.label}` : iso}
                  >
                    {day.getDate()}
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

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/12 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                Groen +2
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/25 bg-orange-500/12 px-2.5 py-1 text-[11px] font-medium text-orange-100">
                <span className="inline-block h-2 w-2 rounded-full bg-orange-400" aria-hidden />
                Oranje 1 boekbaar
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-stone-200">
                <span className="inline-block h-2 w-2 rounded-full bg-stone-400" aria-hidden />
                Geen tijdsloten
              </span>
            </div>

            <div className="mt-5 rounded-[1rem] border border-white/10 bg-white/[0.04] p-3 text-left">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">
                  {(() => {
                    const date = parseISODateOnly(selectedDayISO);
                    const weekday = date.toLocaleDateString("nl-NL", { weekday: "long" });
                    const day = date.toLocaleDateString("nl-NL", { day: "numeric" });
                    const month = date.toLocaleDateString("nl-NL", { month: "long" });
                    return `Beschikbare tijdsloten op ${weekday} ${day} ${month}`;
                  })()}
                </div>

                {availabilityBadge && (
                  <span
                    className={`hidden md:inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${availabilityBadge.cls}`}
                  >
                    {availabilityBadge.label}
                  </span>
                )}
              </div>

              {!partnerSlug ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-stone-300">
                  Kies eerst een locatie om beschikbare tijdsloten te zien.
                </div>
              ) : loadingSlots ? (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-xl bg-white/10" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {filteredSlots.length === 0 ? (
                    <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-stone-300 md:col-span-3">
                      Geen tijdsloten beschikbaar.
                    </div>
                  ) : (
                    filteredSlots.map((slot) => {
                      const selected = slotId === slot.id;
                      const cls = selected
                        ? "border-rose-300/60 bg-rose-500/12 text-rose-100 focus:ring-rose-300/40"
                        : "border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/16 focus:ring-emerald-300/30";

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSlotId(slot.id)}
                          className={`relative h-10 rounded-xl border px-3 text-sm font-medium transition focus:outline-none focus:ring-2 ${cls}`}
                          aria-pressed={selected}
                          aria-label={`Tijdslot ${formatTime(slot.startTime)} (boekbaar)`}
                          title={formatTime(slot.startTime)}
                        >
                          {formatTime(slot.startTime)}
                          {selected && (
                            <span className="pointer-events-none absolute right-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/90">
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
            </div>
          </Panel>

          <Panel className="text-left">
            <div ref={timesRef}>
              <div className="grid gap-4">
                <label>
                  <FieldLabel>Locatie</FieldLabel>
                  {locked ? (
                    <div className="flex h-11 w-full items-center rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-stone-100">
                      <span className="truncate">
                        {selectedPartner?.name ?? partnerSlug}
                        {selectedPartner?.city ? ` — ${selectedPartner.city}` : ""}
                      </span>
                    </div>
                  ) : (
                    <select
                      value={partnerSlug}
                      onChange={(e) => setPartnerSlug(e.target.value)}
                      className="h-11 w-full rounded-xl border border-rose-300/40 bg-white/[0.06] px-3 text-sm text-white outline-none transition focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                      aria-label="Kies locatie"
                    >
                      <option value="" className="text-stone-900">
                        Kies locatie
                      </option>
                      {partners.map((p) => (
                        <option key={p.slug} value={p.slug} className="text-stone-900">
                          {p.name}
                          {p.city ? ` — ${p.city}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <FieldLabel>Aantal spelers</FieldLabel>
                    <select
                      value={players}
                      onChange={(e) => setPlayers(Number(e.target.value))}
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                    >
                      <option value={1} className="text-stone-900">
                        1
                      </option>
                      <option value={2} className="text-stone-900">
                        2
                      </option>
                      <option value={3} className="text-stone-900">
                        3
                      </option>
                    </select>
                  </label>

                  <label>
                    <FieldLabel>Naam hond</FieldLabel>
                    <input
                      value={dogName}
                      onChange={(e) => setDogName(e.target.value)}
                      placeholder="bijv. Sam"
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition placeholder:text-stone-400 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                    />
                  </label>
                </div>

                <label>
                  <FieldLabel>Jouw naam</FieldLabel>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="bijv. Jamie de Vries"
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition placeholder:text-stone-400 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                  />
                </label>

                <label>
                  <FieldLabel>E-mailadres</FieldLabel>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jij@example.com"
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition placeholder:text-stone-400 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                  />
                </label>
              </div>

              <form
                onSubmit={onReserve}
                className="mt-5 space-y-4"
                aria-label="Reserveringsformulier"
              >
                {price && (
                  <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-4 text-sm">
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/90">
                      Prijs
                    </div>

                    <div className="space-y-2 text-stone-200">
                      <div className="flex items-center justify-between gap-4">
                        <span>Totaal</span>
                        <strong className="text-white">€ {price.total.toFixed(2)}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Aanbetaling ({price.feePercent}%)</span>
                        <strong className="text-white">€ {price.deposit.toFixed(2)}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Rest op locatie</span>
                        <strong className="text-white">€ {price.rest.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {msg && (
                  <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-100">
                    {msg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !slotId}
                  className="w-full rounded-2xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Reserveren…" : "Reserveer nu"}
                </button>

                {!slotId && (
                  <p className="text-xs text-stone-400">
                    Kies eerst een tijdslot hierboven om door te gaan naar de checkout.
                  </p>
                )}

                <p className="text-xs leading-6 text-stone-400">
                  Je betaalt nu de aanbetaling; het restant betaal je bij de hondenschool.
                </p>
              </form>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}