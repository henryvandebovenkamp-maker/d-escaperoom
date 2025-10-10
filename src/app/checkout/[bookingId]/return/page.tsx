// PATH: src/app/checkout/[bookingId]/return/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/* ==========================================================
   Betalingsverwerking (Return-pagina)
   ----------------------------------------------------------
   - Toont voortgang in NL
   - Pollt API tot betaling is verwerkt
   - Redirect bij status 'CONFIRMED' of 'CANCELLED'
========================================================== */

export default function ReturnClient({
  params,
}: {
  params: { bookingId: string };
}) {
  const router = useRouter();
  const { bookingId } = params;
  const [attempt, setAttempt] = React.useState(0);
  const [status, setStatus] = React.useState<{
    booking?: string;
    payment?: string;
  }>({});
  const [loading, setLoading] = React.useState(true);

  // ---- Poll API ----
  React.useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/booking/status?id=${bookingId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!active) return;

        setStatus({
          booking: data.bookingStatus,
          payment: data.paymentStatus,
        });
        setAttempt((n) => n + 1);

        // Zodra bevestigd → redirect
        if (data.bookingStatus === "CONFIRMED") {
          router.replace(`/checkout/${bookingId}/success`);
          return;
        }

        // Als geannuleerd of mislukt → redirect
        if (
          ["CANCELLED", "FAILED", "REFUNDED"].includes(data.paymentStatus)
        ) {
          router.replace(`/checkout/${bookingId}/failed`);
          return;
        }

        // Anders opnieuw poll na 3s
        setTimeout(poll, 3000);
      } catch (err) {
        console.error(err);
        if (active) setTimeout(poll, 5000);
      } finally {
        if (active) setLoading(false);
      }
    }

    poll();
    return () => {
      active = false;
    };
  }, [bookingId, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-stone-200">
      <h1 className="text-3xl font-bold mb-2">Even geduld...</h1>
      <p className="text-stone-400 mb-6">We verwerken je betaling...</p>

      <div className="border border-stone-500 rounded-2xl p-6 text-center">
        <p>Status boeking: {status.booking ?? "..."}</p>
        <p>Status betaling: {status.payment ?? "..."}</p>
        <p className="text-sm text-stone-500 mt-2">poging #{attempt}</p>
      </div>

      <button
        onClick={() => location.reload()}
        className="mt-8 bg-pink-600 hover:bg-pink-700 text-white font-medium px-6 py-2 rounded-2xl transition"
      >
        Ververs nu
      </button>
    </main>
  );
}
