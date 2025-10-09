"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = { bookingId: string };

const NL_PAYMENT: Record<string, string> = {
  CREATED: "Aangemaakt",
  PENDING: "In behandeling",
  PAID: "Betaald",
  FAILED: "Mislukt",
  CANCELED: "Geannuleerd",
  REFUNDED: "Terugbetaald",
};

const NL_BOOKING: Record<string, string> = {
  PENDING: "In afwachting",
  CONFIRMED: "Bevestigd",
  CANCELLED: "Geannuleerd",
  REFUNDED: "Terugbetaald",
};

export default function ReturnClient({ bookingId }: Props) {
  const router = useRouter();
  const [tries, setTries] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<{ bookingStatus?: string; paymentStatus?: string }>({});

  React.useEffect(() => {
    let active = true;
    const ctrl = new AbortController();

    async function tick() {
      try {
        setLoading(true);
        const res = await fetch(`/api/booking/${bookingId}/status`, {
          cache: "no-store",
          headers: { "cache-control": "no-store" },
          next: { revalidate: 0 },
          signal: ctrl.signal,
        });

        if (!res.ok) throw new Error("status fetch failed");
        const data = await res.json();
        if (!active) return;

        const booking = data.bookingStatus ?? "PENDING";
        const payment = data.paymentStatus ?? "PENDING";

        setStatus({
          bookingStatus: NL_BOOKING[booking] ?? booking,
          paymentStatus: NL_PAYMENT[payment] ?? payment,
        });

        if (data.confirmed === true || booking === "CONFIRMED") {
          router.replace(`/checkout/${bookingId}/bedankt`);
          return;
        }

        // als payment mislukt/geannuleerd, kun je evt. hier een redirect tonen
        // if (payment === "FAILED" || payment === "CANCELED") { ... }
      } catch {
        // stilletjes opnieuw proberen
      } finally {
        if (active) {
          setTries((t) => t + 1);
          setLoading(false);
        }
      }
    }

    // eerste call meteen
    tick();
    // daarna elke 4s automatisch
    const id = setInterval(tick, 4000);

    return () => {
      active = false;
      ctrl.abort();
      clearInterval(id);
    };
  }, [bookingId, router]);

  const waitingMsg =
    status.paymentStatus === "Betaald"
      ? "Betaling ontvangen — we bevestigen je boeking…"
      : "We verwerken je betaling…";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-stone-950 text-stone-100 px-6 py-10 text-center">
      <h1 className="text-2xl sm:text-3xl font-bold text-amber-400 mb-2">Even geduld…</h1>
      <p className="text-stone-400 mb-8">{waitingMsg}</p>

      <div className="animate-pulse border border-amber-500/40 rounded-2xl px-8 py-6 w-full max-w-sm text-sm bg-stone-900/40 shadow-inner">
        <p>Status boeking: <strong>{status.bookingStatus ?? "…"}</strong></p>
        <p>Status betaling: <strong>{status.paymentStatus ?? "…"}</strong></p>
        <p className="mt-2 text-xs text-stone-500">Poging #{tries}</p>
      </div>

      <button
        onClick={() => router.refresh()}
        disabled={loading}
        className="mt-8 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-70 text-stone-950 font-semibold px-6 py-2 transition-colors"
      >
        {loading ? "Verversen…" : "Ververs nu"}
      </button>
    </main>
  );
}
