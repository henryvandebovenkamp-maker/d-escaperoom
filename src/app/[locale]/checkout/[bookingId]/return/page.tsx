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
      const r = await fetch(`/api/booking/${encodeURIComponent(bookingId)}/status`, {
        cache: "no-store",
      });
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
    let timerStart = Date.now();

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
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="pointer-events-none sticky top-0 z-0 h-2 w-full bg-gradient-to-r from-rose-200 via-pink-300 to-rose-200" />
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Betaling afronden</h1>
        <p className="mt-1 text-stone-700">
          We halen de status van je betaling op. Dit kan een paar seconden duren.
        </p>

        {/* Statuskaart */}
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          {status === "CONFIRMED" ? (
            <Success bookingId={bookingId} />
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

        {/* Meta / debug light */}
        <div className="mt-4 text-xs text-stone-600">
          <div>
            Booking: <span className="font-mono">{bookingId}</span>
          </div>
          {last?.payment?.providerPaymentId && (
            <div>
              Provider ID: <span className="font-mono">{last.payment.providerPaymentId}</span>
            </div>
          )}
          {paymentStatus && (
            <div>
              Laatste paymentstatus: <span className="font-semibold">{paymentStatus}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Success({ bookingId }: { bookingId: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
        <svg viewBox="0 0 20 20" className="h-7 w-7 text-emerald-700" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M5 10l3 3 7-7" />
        </svg>
      </div>
      <h2 className="text-xl font-extrabold">Gelukt! Je aanbetaling is ontvangen.</h2>
      <p className="mt-1 text-stone-700">
        Je boeking is bevestigd. Je krijgt zo ook een bevestiging per e-mail.
      </p>
      <div className="mt-4 flex flex-col items-center gap-2">
        <a
          href={`/booking/${bookingId}`}
          className="inline-flex items-center justify-center rounded-full bg-pink-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
        >
          Ga naar je boeking
        </a>
        <a href={`/checkout/${bookingId}`} className="text-sm text-stone-700 underline">
          Terug naar checkout
        </a>
      </div>
    </div>
  );
}

function Cancelled({ bookingId }: { bookingId: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-rose-700" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </div>
      <h2 className="text-xl font-extrabold">Betaling geannuleerd</h2>
      <p className="mt-1 text-stone-700">
        Je kunt het opnieuw proberen; je boeking blijft nog even voor je gereserveerd.
      </p>
      <div className="mt-4 flex flex-col items-center gap-2">
        <a
          href={`/checkout/${bookingId}`}
          className="inline-flex items-center justify-center rounded-full bg-pink-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300"
        >
          Terug naar betaling
        </a>
        <a href={`/booking/${bookingId}`} className="text-sm text-stone-700 underline">
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
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
        <Spinner className="h-6 w-6 text-stone-700" />
      </div>
      <h2 className="text-xl font-extrabold">We verwerken je betaling…</h2>
      <p className="mt-1 text-stone-700">
        Dit duurt meestal maar een paar seconden. Deze pagina ververst automatisch.
      </p>

      <div className="mt-4 space-y-2 text-sm text-stone-700" aria-live="polite">
        {paymentStatus && <div>Mollie status: <strong>{paymentStatus}</strong></div>}
        {error && <div className="text-rose-700">Fout bij ophalen status: {error}</div>}
        {isTimedOut && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
            Het lijkt wat langer te duren. Je kunt het handmatig opnieuw proberen of terug naar de checkout gaan.
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          disabled={retryLoading}
          className="rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-pink-700 disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-pink-300"
        >
          {retryLoading ? "Bezig…" : "Status opnieuw controleren"}
        </button>
        <a
          href={`/checkout/${bookingId}`}
          className="text-sm text-stone-700 underline underline-offset-2"
        >
          Terug naar checkout
        </a>
        {/* hard refresh helpt soms om caches/redirects te resetten */}
        <button
          type="button"
          onClick={() => router.refresh()}
          className="text-sm text-stone-700 underline underline-offset-2"
        >
          Vernieuw pagina
        </button>
      </div>

      <p className="mt-3 text-xs text-stone-600">
        Blijft dit scherm hangen terwijl je wél hebt betaald? Je krijgt ook een e-mail zodra je boeking is bevestigd.
      </p>
    </div>
  );
}

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" role="status" aria-label="Laden">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      ></path>
    </svg>
  );
}
