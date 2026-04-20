// PATH: src/app/checkout/[bookingId]/return/page.tsx
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

/** Kleine helpers */
type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

type StatusPayload = {
  id: string;
  status: BookingStatus;
  confirmedAt?: string | null;
  depositPaidAt?: string | null;
  payment?: {
    status?: string | null;
    providerPaymentId?: string | null;
    paidAt?: string | null;
  } | null;
};

const POLL_MS = 2500;
const MAX_WAIT_MS = 2 * 60 * 1000; // 2 minuten

export default function ReturnPage() {
  const router = useRouter();
  const params = useParams();

  const bookingId = React.useMemo(() => {
    const raw = (params as any)?.bookingId;
    return Array.isArray(raw) ? raw[0] : String(raw ?? "");
  }, [params]);

  const [status, setStatus] = React.useState<BookingStatus>("PENDING");
  const [last, setLast] = React.useState<StatusPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [manualLoading, setManualLoading] = React.useState(false);

  const fetchStatus = React.useCallback(async () => {
    if (!bookingId) return;

    try {
      setError(null);

      const r = await fetch(
        `/api/booking/${encodeURIComponent(bookingId)}/status`,
        {
          cache: "no-store",
        }
      );

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(txt || "Status ophalen mislukt");
      }

      const j: StatusPayload = await r.json();
      setLast(j);
      setStatus(j.status);
    } catch (e: any) {
      setError(e?.message || "Onbekende fout");
    }
  }, [bookingId]);

  // Init + interval polling
  React.useEffect(() => {
    let mounted = true;
    let t: number | null = null;
    const timerStart = Date.now();

    const loop = async () => {
      if (!mounted) return;

      await fetchStatus();

      if (!mounted) return;

      // klaar? stop
      if (status === "CONFIRMED") return;

      // timeout?
      const ms = Date.now() - timerStart;
      setElapsed(ms);

      if (ms >= MAX_WAIT_MS) return;

      t = window.setTimeout(loop, POLL_MS);
    };

    // direct één keer
    loop();

    return () => {
      mounted = false;
      if (t) window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]); // start slechts 1x per bookingId

  // Handmatig opnieuw controleren
  async function checkNow() {
    try {
      setManualLoading(true);
      await fetchStatus();
    } finally {
      setManualLoading(false);
    }
  }

  const isTimedOut = elapsed >= MAX_WAIT_MS && status !== "CONFIRMED";
  const paymentStatus = last?.payment?.status?.toUpperCase();

  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-950 text-white">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.78)_0%,rgba(12,10,9,0.96)_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
              BETALING & BOEKING
            </span>

            <p className="mt-5 text-sm font-medium uppercase tracking-[0.18em] text-amber-200/90">
              The Missing Snack
            </p>

            <h1 className="mt-3 text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
              Betaling
              <span className="block">afronden</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-stone-200/90 sm:text-base">
              We halen de status van je betaling op. Dit kan een paar seconden
              duren.
            </p>
          </div>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/30 backdrop-blur-sm sm:p-5">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5 sm:p-6">
              {status === "CONFIRMED" ? (
                <Success />
              ) : status === "CANCELLED" ? (
                <Cancelled bookingId={bookingId} />
              ) : (
                <Pending
                  bookingId={bookingId}
                  isTimedOut={isTimedOut}
                  paymentStatus={paymentStatus}
                  onRetry={checkNow}
                  retryLoading={manualLoading}
                  error={error}
                  router={router}
                />
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-stone-300/90 backdrop-blur-sm">
            <div className="flex flex-col gap-2">
              <div>
                Booking: <span className="font-mono text-stone-100">{bookingId}</span>
              </div>

              {last?.payment?.providerPaymentId && (
                <div>
                  Provider ID:{" "}
                  <span className="font-mono text-stone-100">
                    {last.payment.providerPaymentId}
                  </span>
                </div>
              )}

              {paymentStatus && (
                <div>
                  Laatste paymentstatus:{" "}
                  <span className="font-semibold text-stone-100">
                    {paymentStatus}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Success() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/15">
        <svg
          viewBox="0 0 20 20"
          className="h-8 w-8 text-emerald-300"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M5 10l3 3 7-7" />
        </svg>
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/90">
        Bevestigd
      </p>

      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
        Gelukt! Je aanbetaling is ontvangen.
      </h2>

      <p className="mt-3 text-sm leading-7 text-stone-200/90 sm:text-base">
        Je boeking is bevestigd.
      </p>

      <p className="mt-4 text-sm leading-7 text-stone-300/85">
        Bevestiging is per mail verstuurd, check ook even je spam folder.
      </p>

      <div className="mt-7">
        <a
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-pink-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
        >
          Naar homepage
        </a>
      </div>
    </div>
  );
}

function Cancelled({ bookingId }: { bookingId: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-rose-300/20 bg-rose-400/15">
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8 text-rose-300"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/90">
        Niet afgerond
      </p>

      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
        Betaling geannuleerd
      </h2>

      <p className="mt-3 text-sm leading-7 text-stone-200/90 sm:text-base">
        Je kunt het opnieuw proberen; je boeking blijft nog even voor je
        gereserveerd.
      </p>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={`/checkout/${bookingId}`}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
        >
          Terug naar betaling
        </a>

        <a
          href={`/booking/${bookingId}`}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/30"
        >
          Bekijk je boeking
        </a>
      </div>
    </div>
  );
}

function Pending({
  bookingId,
  isTimedOut,
  paymentStatus,
  onRetry,
  retryLoading,
  error,
  router,
}: {
  bookingId: string;
  isTimedOut: boolean;
  paymentStatus?: string | null | undefined;
  onRetry: () => void;
  retryLoading: boolean;
  error: string | null;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/10">
        <Spinner className="h-7 w-7 text-stone-100" />
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/90">
        Even geduld
      </p>

      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
        We verwerken je betaling…
      </h2>

      <p className="mt-3 text-sm leading-7 text-stone-200/90 sm:text-base">
        Dit duurt meestal maar een paar seconden. Deze pagina ververst
        automatisch.
      </p>

      <div className="mt-5 space-y-3 text-sm text-stone-200/90" aria-live="polite">
        {paymentStatus && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            Mollie status: <strong className="text-white">{paymentStatus}</strong>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-rose-200">
            Fout bij ophalen status: {error}
          </div>
        )}

        {isTimedOut && (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-amber-100">
            Het lijkt wat langer te duren. Je kunt het handmatig opnieuw
            proberen of terug naar de checkout gaan.
          </div>
        )}
      </div>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onRetry}
          disabled={retryLoading}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-pink-300"
        >
          {retryLoading ? "Bezig…" : "Status opnieuw controleren"}
        </button>

        <a
          href={`/checkout/${bookingId}`}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/30"
        >
          Terug naar checkout
        </a>

        <button
          type="button"
          onClick={() => router.refresh()}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-transparent px-6 py-3 text-sm font-semibold text-stone-200 transition hover:bg-white/5 focus:outline-none focus:ring-4 focus:ring-white/20"
        >
          Vernieuw pagina
        </button>
      </div>

      <p className="mt-5 text-xs leading-6 text-stone-400">
        Blijft dit scherm hangen terwijl je wél hebt betaald? Je krijgt ook een
        e-mail zodra je boeking is bevestigd.
      </p>
    </div>
  );
}

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      role="status"
      aria-label="Laden"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}