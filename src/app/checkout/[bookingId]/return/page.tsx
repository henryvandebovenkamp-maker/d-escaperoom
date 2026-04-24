// PATH: src/app/checkout/[bookingId]/return/page.tsx
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

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
const MAX_WAIT_MS = 2 * 60 * 1000;

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
        { cache: "no-store" }
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

  React.useEffect(() => {
    let mounted = true;
    let t: number | null = null;
    const timerStart = Date.now();

    const loop = async () => {
      if (!mounted) return;

      await fetchStatus();

      if (!mounted) return;

      if (status === "CONFIRMED") return;

      const ms = Date.now() - timerStart;
      setElapsed(ms);

      if (ms >= MAX_WAIT_MS) return;

      t = window.setTimeout(loop, POLL_MS);
    };

    loop();

    return () => {
      mounted = false;
      if (t) window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

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
      <Background />

      <div className="relative mx-auto max-w-xl px-4 py-12 sm:px-6 lg:py-20">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
            BETALING
          </span>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-rose-300 sm:text-5xl">
            Betaling afronden
          </h1>

          <p className="mt-4 text-sm leading-7 text-stone-300 sm:text-base">
            We halen de status van je betaling op. Dit kan een paar seconden
            duren.
          </p>
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-7">
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

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-6 text-stone-400">
          <div>
            Booking: <span className="font-mono text-stone-200">{bookingId}</span>
          </div>

          {last?.payment?.providerPaymentId && (
            <div>
              Provider ID:{" "}
              <span className="font-mono text-stone-200">
                {last.payment.providerPaymentId}
              </span>
            </div>
          )}

          {paymentStatus && (
            <div>
              Laatste paymentstatus:{" "}
              <span className="font-semibold text-stone-200">
                {paymentStatus}
              </span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Background() {
  return (
    <div aria-hidden className="fixed inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.16),transparent_34%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.35)_0%,rgba(12,10,9,0.96)_100%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
    </div>
  );
}

function Success() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-400/15">
        <svg
          viewBox="0 0 20 20"
          className="h-8 w-8 text-emerald-200"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M5 10l3 3 7-7" />
        </svg>
      </div>

      <h2 className="text-2xl font-black tracking-tight text-rose-300">
        Gelukt! Je aanbetaling is ontvangen.
      </h2>

      <p className="mt-2 text-stone-200">Je boeking is bevestigd.</p>

      <p className="mt-4 text-sm leading-6 text-stone-400">
        De bevestiging is per mail verstuurd. Check ook even je spamfolder.
      </p>

      <div className="mt-6">
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
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-rose-300/35 bg-rose-400/15">
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8 text-rose-200"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </div>

      <h2 className="text-2xl font-black tracking-tight text-rose-300">
        Betaling geannuleerd
      </h2>

      <p className="mt-2 text-sm leading-6 text-stone-300">
        Je kunt het opnieuw proberen. Je boeking blijft nog even voor je
        gereserveerd.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        <a
          href={`/checkout/${bookingId}`}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
        >
          Terug naar betaling
        </a>

        <a
          href={`/booking/${bookingId}`}
          className="text-sm text-stone-300 underline underline-offset-4 transition hover:text-pink-300"
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
        <Spinner className="h-7 w-7 text-rose-200" />
      </div>

      <h2 className="text-2xl font-black tracking-tight text-rose-300">
        We verwerken je betaling…
      </h2>

      <p className="mt-2 text-sm leading-6 text-stone-300">
        Dit duurt meestal maar een paar seconden. Deze pagina controleert
        automatisch de status.
      </p>

      <div className="mt-5 space-y-3 text-sm text-stone-300" aria-live="polite">
        {paymentStatus && (
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
            Mollie status: <strong className="text-white">{paymentStatus}</strong>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-300/35 bg-rose-400/15 px-4 py-3 text-rose-100">
            Fout bij ophalen status: {error}
          </div>
        )}

        {isTimedOut && (
          <div className="rounded-2xl border border-amber-300/35 bg-amber-400/15 px-4 py-3 text-amber-100">
            Het lijkt wat langer te duren. Je kunt handmatig opnieuw controleren
            of terug naar de checkout gaan.
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          disabled={retryLoading}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:bg-pink-700 disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-pink-300"
        >
          {retryLoading ? "Bezig…" : "Status opnieuw controleren"}
        </button>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href={`/checkout/${bookingId}`}
            className="text-sm text-stone-300 underline underline-offset-4 transition hover:text-pink-300"
          >
            Terug naar checkout
          </a>

          <button
            type="button"
            onClick={() => router.refresh()}
            className="text-sm text-stone-300 underline underline-offset-4 transition hover:text-pink-300"
          >
            Vernieuw pagina
          </button>
        </div>
      </div>

      <p className="mt-5 text-xs leading-5 text-stone-500">
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
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}