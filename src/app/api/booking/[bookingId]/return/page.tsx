"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = { bookingId: string };

export default function ReturnClient({ bookingId }: Props) {
  const router = useRouter();
  const [tries, setTries] = React.useState(0);
  const [status, setStatus] = React.useState<{ bookingStatus?: string; paymentStatus?: string }>({});

  React.useEffect(() => {
    let active = true;

    async function tick() {
      try {
        const res = await fetch(`/api/booking/${bookingId}/status`, { cache: "no-store" });
        const data = await res.json();
        if (!active) return;

        setStatus({ bookingStatus: data.bookingStatus, paymentStatus: data.paymentStatus });

        if (data.confirmed) {
          router.replace(`/checkout/booking/${bookingId}/bedankt`);
          return;
        }
      } catch {
        // ignore
      } finally {
        if (active) setTries((t) => t + 1);
      }
    }

    tick();
    const id = setInterval(tick, 1500);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [bookingId, router]);

  const waitingMsg =
    status.paymentStatus === "PAID"
      ? "Betaling ontvangen — we bevestigen je boeking…"
      : "We verwerken je betaling…";

  return (
    <main className="mx-auto max-w-xl p-6 text-center">
      <h1 className="text-2xl font-semibold">Even geduld…</h1>
      <p className="mt-3 text-stone-600">{waitingMsg}</p>

      <div className="mt-6 animate-pulse rounded-2xl border p-6">
        <p className="text-sm">Status booking: <strong>{status.bookingStatus ?? "…"}</strong></p>
        <p className="text-sm">Status payment: <strong>{status.paymentStatus ?? "…"}</strong></p>
        <p className="mt-2 text-xs text-stone-500">poging #{tries}</p>
      </div>

      <button className="mt-6 rounded-xl bg-stone-900 px-4 py-2 text-white" onClick={() => router.refresh()}>
        Ververs nu
      </button>
    </main>
  );
}
