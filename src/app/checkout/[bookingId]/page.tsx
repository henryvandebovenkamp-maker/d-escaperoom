// PATH: src/app/checkout/[bookingId]/page.tsx
"use client";

import * as React from "react";
import { useParams } from "next/navigation";

/* ===================== Types ===================== */
type TrackingLevel = "NONE" | "BEGINNER" | "AMATEUR" | "PRO";

type BookingVM = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  partnerName: string;
  partnerFeePercent: number;
  startTimeISO: string;
  playersCount: number;
  dogName?: string | null;
  dogAllergies?: string | null;
  dogFears?: string | null;
  dogTrackingLevel?: TrackingLevel | null;
  customerName?: string | null;
  customerEmail: string;
  price: { totalCents: number; depositCents: number; restCents: number };
  discount?: { code?: string | null; amountCents: number } | null;
};

/* ===================== Helpers ===================== */
const euro = (cents: number) => `€ ${(cents / 100).toFixed(2)}`;

function fmtDateTimeNL(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

const IconCheck = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
    <path d="M5 10l3 3 7-7" />
  </svg>
);

const IconCalendar = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...p}>
    <path d="M7 3v4M17 3v4M3 10h18M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
  </svg>
);

const IconUsers = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...p}>
    <path d="M16 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4zM8 13c-2.761 0-5 2.239-5 5v2h10v-2c0-2.761-2.239-5-5-5z" />
    <path d="M16 13c-1.2 0-2.284.42-3.141 1.118A5.97 5.97 0 0 1 15 18v2h7v-2c0-2.761-2.239-5-5-5z" />
  </svg>
);

const IconMail = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...p}>
    <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
    <path d="m22 8-10 7L2 8" />
  </svg>
);

const IconAlert = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
    <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
  </svg>
);

async function postJSON<T>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function useDebouncedCallback(fn: () => void, delay = 600, deps: any[] = []) {
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => fn(), delay);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ===================== Pagina ===================== */
export default function CheckoutPage() {
  const params = useParams();

  const bookingId = React.useMemo(() => {
    const raw = (params as any)?.bookingId;
    return Array.isArray(raw) ? raw[0] : String(raw ?? "");
  }, [params]);

  const [data, setData] = React.useState<BookingVM | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState<string | null>(null);

  // Hond (autosave)
  const [dogName, setDogName] = React.useState("");
  const [dogAllergies, setDogAllergies] = React.useState("");
  const [dogFears, setDogFears] = React.useState("");
  const [dogTrackingLevel, setDogTrackingLevel] =
    React.useState<TrackingLevel>("NONE");
  const [savingDog, setSavingDog] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  // Klant
  const [customerName, setCustomerName] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [emailSaving, setEmailSaving] = React.useState(false);
  const [emailSavedAt, setEmailSavedAt] = React.useState<number | null>(null);

  // Korting
  const [couponInput, setCouponInput] = React.useState("");
  const [discountMsg, setDiscountMsg] = React.useState<string | null>(null);
  const [applying, setApplying] = React.useState(false);

  // Pay
  const [payLoading, setPayLoading] = React.useState(false);

  /* ====== Data laden ====== */
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!bookingId) return;

      try {
        setLoading(true);
        const r = await fetch(`/api/booking/${encodeURIComponent(bookingId)}`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();

        const vm: BookingVM = {
          id: j.id,
          status: j.status,
          partnerName: j.partner?.name ?? "",
          partnerFeePercent: j.partner?.feePercent ?? 0,
          startTimeISO: j.slot?.startTime ?? j.startTimeISO,
          playersCount: j.playersCount,
          dogName: j.dogName ?? null,
          dogAllergies: j.dogAllergies ?? null,
          dogFears: j.dogFears ?? null,
          dogTrackingLevel: j.dogTrackingLevel ?? "NONE",
          customerName: j.customer?.name ?? null,
          customerEmail: j.customer?.email ?? "",
          price: {
            totalCents: j.totalAmountCents,
            depositCents: j.depositAmountCents,
            restCents: j.restAmountCents,
          },
          discount:
            (typeof j.discountAmountCents === "number" &&
              j.discountAmountCents > 0) ||
            j.discountCode
              ? {
                  code: j.discountCode?.code ?? null,
                  amountCents: Math.max(0, j.discountAmountCents ?? 0),
                }
              : null,
        };

        if (!cancelled) {
          setData(vm);
          setDogName(vm.dogName ?? "");
          setDogAllergies(vm.dogAllergies ?? "");
          setDogFears(vm.dogFears ?? "");
          setDogTrackingLevel((vm.dogTrackingLevel as any) || "NONE");
          setCustomerName(vm.customerName ?? "");
          setCustomerEmail(vm.customerEmail ?? "");
          setCouponInput(vm.discount?.code ?? "");
          setDiscountMsg(null);
        }
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message || "Kon boeking niet laden");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  /* ====== Validatie email ====== */
  function validateEmail(value: string): string | null {
    const clean = value.trim();
    if (!clean) return "E-mailadres is verplicht.";
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean);
    return ok ? null : "Vul een geldig e-mailadres in.";
  }

  /* ====== Autosave email (debounced) ====== */
  useDebouncedCallback(
    async () => {
      if (!data) return;

      const err = validateEmail(customerEmail);
      setEmailError(err);
      if (err) return;

      try {
        setEmailSaving(true);
        setEmailSavedAt(null);

        let resp: any;
        try {
          resp = await postJSON("/api/booking/update-customer-email", {
            bookingId: data.id,
            email: customerEmail.trim(),
          });
        } catch {
          resp = await postJSON("/api/booking/update-customer", {
            bookingId: data.id,
            customer: { email: customerEmail.trim() },
          });
        }

        if (!resp?.ok && !resp?.booking) {
          throw new Error(resp?.error || "Opslaan mislukt");
        }

        setData((d) =>
          d ? ({ ...d, customerEmail: customerEmail.trim() } as BookingVM) : d
        );
        setEmailSavedAt(Date.now());
      } catch {
        setEmailError("Opslaan mislukt. Probeer opnieuw.");
      } finally {
        setEmailSaving(false);
      }
    },
    700,
    [customerEmail, data?.id]
  );

  /* ====== Autosave hondgegevens (debounced) ====== */
  useDebouncedCallback(
    async () => {
      if (!data) return;

      try {
        setSavingDog(true);
        setSavedAt(null);

        const r = await fetch("/api/booking/update-dog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            bookingId,
            dogName: dogName.trim() || null,
            dogAllergies: dogAllergies.trim() || null,
            dogFears: dogFears.trim() || null,
            dogTrackingLevel,
          }),
        });

        if (!r.ok) throw new Error(await r.text());
        setSavedAt(Date.now());
      } catch (e: any) {
        setMsg(e?.message || "Opslaan mislukt");
      } finally {
        setSavingDog(false);
      }
    },
    800,
    [dogName, dogAllergies, dogFears, dogTrackingLevel, bookingId, data?.id]
  );

  /* ====== Kortingscode ====== */
  async function applyDiscount(codeRaw: string | null) {
    if (!data) return;

    setApplying(true);
    setDiscountMsg(null);

    try {
      const code = codeRaw?.trim() || null;

      const tryApply = async () =>
        postJSON<any>("/api/booking/apply-discount", { bookingId: data.id, code });

      const tryAlt = async () =>
        postJSON<any>(
          code ? "/api/booking/discount/apply" : "/api/booking/discount/clear",
          {
            bookingId: data.id,
            code,
          }
        );

      let resp: any;
      try {
        resp = await tryApply();
      } catch {
        resp = await tryAlt();
      }

      if (!resp?.ok || !resp?.booking) {
        throw new Error(resp?.error || "Kon kortingscode niet toepassen");
      }

      const b = resp.booking;

      const vm: BookingVM = {
        id: b.id,
        status: b.status,
        partnerName: b.partner?.name ?? data.partnerName,
        partnerFeePercent: b.partner?.feePercent ?? data.partnerFeePercent,
        startTimeISO: b.slot?.startTime ?? data.startTimeISO,
        playersCount: b.playersCount ?? data.playersCount,
        dogName: b.dogName ?? data.dogName,
        dogAllergies: b.dogAllergies ?? data.dogAllergies,
        dogFears: b.dogFears ?? data.dogFears,
        dogTrackingLevel: b.dogTrackingLevel ?? data.dogTrackingLevel,
        customerName: b.customer?.name ?? data.customerName,
        customerEmail: b.customer?.email ?? data.customerEmail,
        price: {
          totalCents: b.totalAmountCents,
          depositCents: b.depositAmountCents,
          restCents: b.restAmountCents,
        },
        discount:
          (typeof b.discountAmountCents === "number" &&
            b.discountAmountCents > 0) ||
          b.discountCode
            ? {
                code: b.discountCode?.code ?? null,
                amountCents: Math.max(0, b.discountAmountCents ?? 0),
              }
            : null,
      };

      setData(vm);
      setCouponInput(vm.discount?.code ?? "");
      setDiscountMsg(code ? "Kortingscode toegepast ✔️" : "Kortingscode verwijderd");
    } catch {
      const typed = (couponInput || "").trim().toUpperCase();
      const pretty = typed
        ? `De kortingscode ‘${typed}’ is ongeldig of niet van toepassing op deze boeking. Controleer de spelling of vraag bij de hondenschool naar een geldige code.`
        : "Deze kortingscode is ongeldig of niet van toepassing op deze boeking.";
      setDiscountMsg(pretty);
    } finally {
      setApplying(false);
    }
  }

  /* ====== Mollie ====== */
  const canPay = React.useMemo(() => {
    const err = validateEmail(customerEmail);
    return !err && !emailSaving && !!data?.id;
  }, [customerEmail, emailSaving, data?.id]);

  async function handlePayNow(id: string) {
    try {
      const err = validateEmail(customerEmail);
      setEmailError(err);
      if (err) return;

      setPayLoading(true);

      const res = await fetch("/api/payments/mollie/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ bookingId: id }),
      });

      if (!res.ok) throw new Error(await res.text());

      const j = await res.json();
      if (!j?.url) throw new Error("Geen Mollie URL ontvangen");

      window.location.assign(j.url as string);
    } catch (err) {
      console.error("Betaling starten mislukt", err);
      alert("Betaling starten mislukt, probeer later opnieuw.");
      setPayLoading(false);
    }
  }

  /* ===================== UI ===================== */
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-stone-950 text-white">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_35%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.96)_0%,rgba(12,10,9,1)_100%)]" />
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:12px_12px]" />
        </div>

        <div className="relative mx-auto max-w-6xl p-4 md:p-8">
          <HeaderSkeleton />
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="space-y-6 md:col-span-2">
              <div className="h-40 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.05]" />
              <div className="h-72 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.05]" />
            </div>
            <div className="h-56 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.05]" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[100dvh] bg-stone-950 text-white">
        <div className="relative mx-auto max-w-6xl p-4 md:p-8">
          <SimpleHeader title="Bevestig jouw boeking" />
          <div
            className="mt-6 rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 p-4 text-rose-100 shadow-sm"
            role="alert"
          >
            Boekingsnummer onbekend of verlopen.
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-stone-950 text-white">
      <div aria-hidden className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_35%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.96)_0%,rgba(12,10,9,1)_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <SimpleHeader
          title="Bevestig jouw boeking"
          status={data.status}
          idLabel={data.id}
        />

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {/* Linker kolom */}
          <section className="space-y-6 md:col-span-2">
            <Card>
              <CardTitle icon="📅" title="Overzicht" />
              <div className="mt-4 space-y-4">
                <InfoRow label="Hondenschool" icon={<span aria-hidden>🏫</span>}>
                  <span className="font-medium text-white">{data.partnerName}</span>
                </InfoRow>

                <InfoRow label="Datum & tijd" icon={<IconCalendar className="h-4 w-4" />}>
                  {fmtDateTimeNL(data.startTimeISO)}
                </InfoRow>

                <InfoRow label="Aantal deelnemers" icon={<IconUsers className="h-4 w-4" />}>
                  {data.playersCount} {data.playersCount === 1 ? "speler" : "spelers"}
                </InfoRow>

                <InfoRow label="Voornaam" icon={<span aria-hidden>👤</span>}>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Jouw naam"
                    className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none placeholder:text-stone-400 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                    aria-label="Naam klant"
                    autoComplete="name"
                  />
                </InfoRow>

                <InfoRow label="E-mailadres" icon={<IconMail className="h-4 w-4" />}>
                  <div className="flex flex-col gap-1">
                    <input
                      type="email"
                      inputMode="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="bijv. naam@voorbeeld.nl"
                      className={[
                        "mt-1 h-11 w-full rounded-xl border bg-white/[0.06] px-3 text-sm text-white outline-none placeholder:text-stone-400 transition",
                        emailError
                          ? "border-rose-400/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-300/30"
                          : "border-white/10 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40",
                      ].join(" ")}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby="email-help"
                      autoComplete="email"
                    />

                    <div id="email-help" className="min-h-[18px]" aria-live="polite">
                      {emailError && (
                        <p className="text-[12px] text-rose-300">{emailError}</p>
                      )}
                      {emailSaving && !emailError && (
                        <p className="text-[12px] text-stone-400">Opslaan…</p>
                      )}
                      {emailSavedAt && !emailError && !emailSaving && null}
                    </div>
                  </div>
                </InfoRow>
              </div>
            </Card>

            {/* Gegevens van je hond — autosave */}
            <Card>
              <CardTitle icon="🐾" title="Gegevens van je hond" />
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Naam hond">
                    <input
                      value={dogName}
                      onChange={(e) => setDogName(e.target.value)}
                      placeholder="bijv. Sam"
                      className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none placeholder:text-stone-400 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                      autoComplete="off"
                    />
                  </Field>

                  <Field label="Hond is sociaal tegen andere mensen">
                    <select
                      value={dogTrackingLevel}
                      onChange={(e) =>
                        setDogTrackingLevel(e.target.value as TrackingLevel)
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                    >
                      <option value="NONE" className="text-stone-900">
                        Nee
                      </option>
                      <option value="BEGINNER" className="text-stone-900">
                        Een beetje
                      </option>
                      <option value="AMATEUR" className="text-stone-900">
                        Meestal wel
                      </option>
                      <option value="PRO" className="text-stone-900">
                        Ja
                      </option>
                    </select>
                  </Field>
                </div>

                <Field label="Allergieën?">
                  <textarea
                    value={dogAllergies}
                    onChange={(e) => setDogAllergies(e.target.value)}
                    placeholder="Bijv. kip, rund, granen…"
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none placeholder:text-stone-400 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                  />
                </Field>

                <Field label="Ergens bang voor?">
                  <textarea
                    value={dogFears}
                    onChange={(e) => setDogFears(e.target.value)}
                    placeholder="Bijv. harde geluiden, onbekende ruimtes…"
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none placeholder:text-stone-400 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                  />
                </Field>

                <div className="min-h-[18px]" aria-live="polite">
                  {savingDog && <p className="text-[12px] text-stone-400">Opslaan…</p>}
                  {savedAt && !savingDog && null}
                  {msg && <span className="text-[12px] text-rose-300">{msg}</span>}
                </div>
              </div>
            </Card>
          </section>

          {/* Rechter kolom */}
          <aside className="md:col-span-1">
            <PriceCard
              total={data.price.totalCents}
              deposit={data.price.depositCents}
              rest={data.price.restCents}
              feePercent={data.partnerFeePercent}
              discountCents={data.discount?.amountCents ?? 0}
              discountCode={data.discount?.code ?? ""}
              couponInput={couponInput}
              onCouponInput={setCouponInput}
              onApply={() => applyDiscount(couponInput)}
              onClear={() => applyDiscount(null)}
              applying={applying}
              message={discountMsg}
              onPay={() => handlePayNow(data.id)}
              canPay={canPay}
              payLoading={payLoading}
              bookingId={data.id}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ===================== UI Helpers ===================== */

function SimpleHeader({
  title,
  status,
  idLabel,
}: {
  title: string;
  status?: BookingVM["status"];
  idLabel?: string;
}) {
  return (
    <header className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur-md">
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,114,182,0.08),rgba(251,191,36,0.05)_45%,rgba(255,255,255,0.02)_100%)]"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200/90">
            CHECKOUT
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
            {title}
          </h1>
          {idLabel && (
            <p className="mt-1 text-xs text-stone-400">
              Boekingsnummer:{" "}
              <span className="font-semibold text-stone-200">{idLabel}</span>
            </p>
          )}
        </div>

        {status && status !== "PENDING" && <StatusBadge status={status} />}
      </div>
    </header>
  );
}

function HeaderSkeleton() {
  return (
    <div className="h-16 w-full animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.05]" />
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur-md">
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,114,182,0.06),rgba(251,191,36,0.04)_45%,rgba(255,255,255,0.02)_100%)]"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function CardTitle({
  icon,
  title,
}: {
  icon?: React.ReactNode | string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] text-lg">
        <span className="leading-none">{icon ?? "✨"}</span>
      </div>
      <h3 className="text-xl font-extrabold text-white">{title}</h3>
    </div>
  );
}

function InfoRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 md:grid-cols-[170px_1fr] md:items-start md:gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-300">
        {icon && <span className="text-stone-400">{icon}</span>}
        {label}
      </div>
      <div className="text-stone-100">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-stone-200">
      {label}
      <div className="text-sm font-normal text-stone-100">{children}</div>
    </label>
  );
}

function StatusBadge({ status }: { status: BookingVM["status"] }) {
  const map: Record<BookingVM["status"], { cls: string; label: string }> = {
    PENDING: {
      cls: "border-amber-400/25 bg-amber-500/12 text-amber-100",
      label: "PENDING",
    },
    CONFIRMED: {
      cls: "border-emerald-400/25 bg-emerald-500/12 text-emerald-100",
      label: "CONFIRMED",
    },
    CANCELLED: {
      cls: "border-rose-400/25 bg-rose-500/12 text-rose-100",
      label: "CANCELLED",
    },
  };

  const s = map[status];

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

function Row({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-white/10 px-3 py-2.5 ${
        emphasize ? "bg-white/[0.08]" : "bg-white/[0.04]"
      }`}
    >
      <span className="text-stone-300">{label}</span>
      <strong className={emphasize ? "text-white" : "text-stone-100"}>
        {value}
      </strong>
    </div>
  );
}

function PriceCard({
  total,
  deposit,
  rest,
  feePercent,
  discountCents,
  discountCode,
  couponInput,
  onCouponInput,
  onApply,
  onClear,
  applying,
  message,
  onPay,
  canPay,
  payLoading,
}: {
  total: number;
  deposit: number;
  rest: number;
  feePercent: number;
  discountCents: number;
  discountCode: string;
  couponInput: string;
  onCouponInput: (v: string) => void;
  onApply: () => void;
  onClear: () => void;
  applying: boolean;
  message: string | null;
  onPay: () => void;
  canPay: boolean;
  payLoading: boolean;
  bookingId: string;
}) {
  const hasDiscount = discountCents > 0;
  const isSuccess = message
    ? message.includes("✔") || message.toLowerCase().startsWith("ok")
    : false;

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] shadow-xl shadow-black/15 backdrop-blur-md md:sticky md:top-6">
      <div className="h-2 w-full rounded-t-[1.75rem] bg-gradient-to-r from-pink-400 via-rose-300 to-amber-200" />
      <div className="p-5">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.08]">
            💳
          </div>
          <div className="text-base font-extrabold tracking-tight text-white">
            Prijs
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <Row label="Totaal" value={euro(total)} emphasize />
          {hasDiscount && (
            <Row label="Korting" value={`- ${euro(discountCents)}`} />
          )}
          <Row
            label={`Aanbetaling (${feePercent}%)`}
            value={euro(deposit)}
          />
          <Row label="Rest op locatie" value={euro(rest)} />
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">
            Kortingscode
          </div>

          {hasDiscount && discountCode ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                  <IconCheck className="h-3 w-3 text-white" />
                </span>
                <span className="font-semibold text-emerald-100">
                  Toegepast:{" "}
                  <span className="underline decoration-dotted">
                    {discountCode}
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={onClear}
                disabled={applying}
                className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-100 hover:bg-rose-500/15 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-rose-300/30"
              >
                Verwijderen
              </button>
            </div>
          ) : (
            <div className="flex items-stretch gap-2">
              <input
                value={couponInput}
                onChange={(e) => onCouponInput(e.target.value)}
                placeholder="WINTER10"
                className="h-10 w-[9.5rem] rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none placeholder:text-stone-400 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                aria-label="Kortingscode"
              />
              <button
                type="button"
                onClick={onApply}
                disabled={!couponInput.trim() || applying}
                className="h-10 rounded-xl bg-pink-600 px-3 text-sm font-semibold text-white shadow hover:bg-pink-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-pink-300/40"
              >
                {applying ? "Bezig…" : "Pas toe"}
              </button>
            </div>
          )}

          {message && (
            <div
              role="alert"
              className={[
                "mt-2 flex items-start gap-2 rounded-xl border px-3 py-2 text-[12px]",
                isSuccess
                  ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                  : "border-rose-400/25 bg-rose-500/10 text-rose-100",
              ].join(" ")}
            >
              <IconAlert className="mt-[2px] h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {!message && !hasDiscount && (
            <p className="mt-2 text-[11px] text-stone-400">
              Korting wordt over het hele bedrag berekend.
            </p>
          )}
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={onPay}
            disabled={payLoading || !canPay}
            aria-busy={payLoading}
            className="w-full rounded-2xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-pink-300/40"
          >
            {payLoading ? "Bezig…" : "Betalen"}
          </button>

          <p className="mt-3 text-[11px] leading-6 text-stone-400">
            Je betaalt nu de aanbetaling; het restant betaal je bij de
            hondenschool.
          </p>
        </div>
      </div>
    </div>
  );
}