// PATH: src/app/bedankt/[bookingId]/page.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

/* ===================== Types ===================== */
type BookingVM = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  partnerName: string;
  partnerFeePercent: number;
  startTimeISO: string;
  playersCount: number;
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
  });
}

/* ===================== Page ===================== */
export default function BedanktPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = React.useMemo(() => {
    const raw = (params as any)?.bookingId;
    return Array.isArray(raw) ? raw[0] : String(raw ?? "");
  }, [params]);

  const [data, setData] = React.useState<BookingVM | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!bookingId) return;
      try {
        setLoading(true);
        const r = await fetch(`/api/booking/${encodeURIComponent(bookingId)}`, { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();

        const vm: BookingVM = {
          id: j.id,
          status: j.status,
          partnerName: j.partner?.name ?? "",
          partnerFeePercent: j.partner?.feePercent ?? 0,
          startTimeISO: j.slot?.startTime ?? j.startTimeISO,
          playersCount: j.playersCount,
          customerName: j.customer?.name ?? null,
          customerEmail: j.customer?.email ?? "",
          price: {
            totalCents: j.totalAmountCents,
            depositCents: j.depositAmountCents,
            restCents: j.restAmountCents,
          },
          discount:
            (typeof j.discountAmountCents === "number" && j.discountAmountCents > 0) || j.discountCode
              ? { code: j.discountCode?.code ?? null, amountCents: Math.max(0, j.discountAmountCents ?? 0) }
              : null,
        };

        if (!cancelled) {
          if (vm.status !== "CONFIRMED") {
            router.replace(`/checkout/${vm.id}/return`);
            return;
          }
          setData(vm);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500">Laden…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-rose-600">Boeking niet gevonden of nog niet bevestigd.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="pointer-events-none sticky top-0 z-0 h-2 w-full bg-gradient-to-r from-rose-200 via-pink-300 to-rose-200" />

      <div className="relative z-10 mx-auto max-w-6xl p-4 md:p-8">
        <HeroHeader
          title="Bedankt! Je boeking is bevestigd 🎉"
          subtitle="We hebben je aanbetaling ontvangen. Hieronder vind je je bevestiging."
          idLabel={data.id}
        />

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <section className="md:col-span-2 space-y-6">
            <Card>
              <CardTitle icon="📬" title="Bevestiging" />
              <div className="mt-3 space-y-4">
                <InfoRow label="Hondenschool">{data.partnerName}</InfoRow>
                <InfoRow label="Datum & tijd">{fmtDateTimeNL(data.startTimeISO)}</InfoRow>
                <InfoRow label="Aantal deelnemers">
                  {data.playersCount} {data.playersCount === 1 ? "speler" : "spelers"}
                </InfoRow>
                <InfoRow label="Naam klant">{data.customerName || "—"}</InfoRow>
                <InfoRow label="E-mailadres">{data.customerEmail}</InfoRow>
              </div>
            </Card>

            <Card>
              <CardTitle icon="ℹ️" title="Handig om te weten" />
              <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-stone-700">
                <li>Je ontvangt een bevestiging per e-mail op <strong>{data.customerEmail}</strong>.</li>
                <li>Neem deze bevestiging mee naar de hondenschool.</li>
                <li>Het resterende bedrag ({euro(data.price.restCents)}) betaal je op locatie.</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm hover:bg-stone-50 focus:outline-none focus:ring-4 focus:ring-stone-300"
                  href="/"
                >
                  Terug naar home
                </a>
              </div>
            </Card>
          </section>

          <aside className="md:col-span-1">
            <SummaryCard
              total={data.price.totalCents}
              deposit={data.price.depositCents}
              rest={data.price.restCents}
              feePercent={data.partnerFeePercent}
              discountCents={data.discount?.amountCents ?? 0}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ===================== UI Helpers ===================== */
function HeroHeader({
  title,
  subtitle,
  idLabel,
}: {
  title: string;
  subtitle?: string;
  idLabel?: string;
}) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-stone-200 shadow-md">
      <div className="absolute inset-0">
        <Image
          src="/images/header-foto.png"
          alt="Western thema decor voor D-EscapeRoom"
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 1200px"
        />
        <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px]" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-rose-50/60 via-pink-50/50 to-stone-50/50" aria-hidden />
      </div>

      <div className="relative p-5">
        <div className="rounded-2xl border border-stone-200 bg-white/95 shadow-sm px-5 py-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">{title}</h1>
          {subtitle && <p className="mt-1 text-stone-800">{subtitle}</p>}
          {idLabel && (
            <p className="mt-2 text-xs font-medium text-stone-700">
              Boekingsnummer: <span className="font-semibold text-stone-900">{idLabel}</span>
            </p>
          )}
        </div>
      </div>

      <div className="h-1 w-full bg-gradient-to-r from-pink-300 via-rose-300 to-pink-300" />
    </header>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-stone-200" />
      <div aria-hidden className="pointer-events-none absolute -inset-px rounded-[18px] bg-gradient-to-br from-rose-50/70 via-pink-50/40 to-stone-50/30" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function CardTitle({ icon, title }: { icon?: React.ReactNode | string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 text-lg">
        <span className="leading-none">{icon ?? "✨"}</span>
      </div>
      <h3 className="text-xl font-extrabold">{title}</h3>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[170px_1fr] items-start gap-2 rounded-xl border border-stone-100 bg-stone-50/60 p-3">
      <div className="text-sm font-semibold text-stone-700">{label}</div>
      <div className="text-stone-900">{children}</div>
    </div>
  );
}

function SummaryCard({
  total,
  deposit,
  rest,
  feePercent,
  discountCents,
}: {
  total: number;
  deposit: number;
  rest: number;
  feePercent: number;
  discountCents: number;
}) {
  const hasDiscount = discountCents > 0;
  return (
    <div className="sticky top-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="h-2 w-full rounded-t-2xl bg-gradient-to-r from-pink-300 via-rose-300 to-pink-300" />
      <div className="p-5">
        <div className="font-extrabold text-sm mb-3">Samenvatting</div>
        <Row label="Totaal" value={euro(total)} emphasize />
        {hasDiscount && <Row label="Korting" value={`- ${euro(discountCents)}`} />}
        <Row label={`Aanbetaling (${feePercent}%)`} value={euro(deposit)} />
        <Row label="Rest op locatie" value={euro(rest)} />
      </div>
    </div>
  );
}

function Row({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2 ${
        emphasize ? "bg-stone-50 font-bold" : "bg-stone-50/60"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
