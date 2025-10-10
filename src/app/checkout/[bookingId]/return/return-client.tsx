"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

const NL_STATUS: Record<string, string> = {
  PENDING: "IN AFWACHTING",
  CONFIRMED: "BEVESTIGD",
  CANCELLED: "GEANNULEERD",
  REFUNDED: "TERUGGEBOEKT",
  CREATED: "AANGEMAAKT",
  PAID: "BETAALD",
  FAILED: "MISLUKT",
  CANCELED: "GEANNULEERD",
};

function t(s?: string) {
  if (!s) return "onbekend";
  return NL_STATUS[s] ?? s;
}

export default function ReturnClient({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [tryCount, setTryCount] = React.useState(0);
  const [bookingStatus, setBookingStatus] = React.useState<string>("…");
  const [paymentStatus, setPaymentStatus] = React.useState<string>("…");
  const [loading, setLoading] = React.useState(false);
  const [terminal, setTerminal] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-no-cache": "1" },
        body: JSON.stringify({ bookingId }),
        cache: "no-store",
      });
      const json = await res.json();

      if (!json.ok) {
        setError(json.error || "Onbekende fout");
        setTryCount((c) => c + 1);
        return;
      }

      const b = json.booking?.status as string | undefined;
      const p = json.payment?.status as string | undefined;

      setBookingStatus(t(b));
      setPaymentStatus(t(p));
      const isTerminal = Boolean(json.terminal);
      setTerminal(isTerminal);

      if (isTerminal) {
        if (p === "PAID") router.replace(`/checkout/${bookingId}/success`);
        else if (p === "REFUNDED") router.replace(`/checkout/${bookingId}/refunded`);
        else router.replace(`/checkout/${bookingId}/failed`);
        return;
      }

      setTryCount((c) => c + 1);
    } catch (e: any) {
      setError("Netwerkfout");
      setTryCount((c) => c + 1);
    } finally {
      setLoading(false);
    }
  }, [bookingId, router]);

  // Auto-poll: start direct, backoff tot max 15 keer
  React.useEffect(() => {
    if (terminal) return;
    if (tryCount === 0) {
      refresh();
      return;
    }
    if (tryCount >= 15) return;
    const delay = Math.min(1000 + tryCount * 600, 6000);
    const tmr = setTimeout(() => refresh(), delay);
    return () => clearTimeout(tmr);
  }, [tryCount, terminal, refresh]);

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-black/30 p-6 text-center text-stone-100">
      <h1 className="mb-2 text-2xl font-semibold">Even geduld…</h1>
      <p className="mb-6 text-stone-400">We verwerken je betaling…</p>

      <div className="mb-6 rounded-xl border border-white/10 p-4 text-sm">
        <div className="mb-1">Status boeking: <span className="font-medium">{bookingStatus}</span></div>
        <div>Status betaling: <span className="font-medium">{paymentStatus}</span></div>
        {!terminal && <div className="mt-3 text-xs text-stone-500">poging #{tryCount}</div>}
        {error && <div className="mt-3 text-xs text-rose-300">Fout: {error}</div>}
      </div>

      {!terminal && (
        <button
          onClick={refresh}
          disabled={loading}
          className="rounded-xl bg-stone-800 px-4 py-2 text-sm font-medium text-stone-100 ring-rose-400/60 transition hover:bg-stone-700 focus:outline-none focus:ring-2"
          aria-busy={loading}
        >
          {loading ? "Verversen…" : "Ververs nu"}
        </button>
      )}

      {tryCount >= 15 && !terminal && (
        <p className="mt-4 text-xs text-stone-400">
          Het duurt langer dan verwacht. Je kunt opnieuw proberen of later je e-mail checken.
        </p>
      )}
    </div>
  );
}
