"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ReturnPage() {
  const router = useRouter();
  const params = useParams<{ bookingId: string }>();
  const bookingId = Array.isArray(params?.bookingId) ? params!.bookingId[0] : params!.bookingId;

  React.useEffect(() => {
    let timer: any;
    let cancelled = false;

    async function tick() {
      try {
        const r = await fetch(`/api/booking/${encodeURIComponent(bookingId)}`, { cache: "no-store" });
        if (!r.ok) throw new Error();
        const j = await r.json();
        if (!cancelled && j?.status === "CONFIRMED") {
          router.replace(`/bedankt/${bookingId}`); // of `/checkout/${bookingId}/bedankt` als je die route gebruikt
          return;
        }
      } catch {}
      if (!cancelled) timer = setTimeout(tick, 2000);
    }

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [bookingId, router]);

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-5 text-center">
        <p className="text-stone-800 font-semibold">We verwerken je betaling…</p>
        <p className="text-stone-600 text-sm mt-1">Je wordt automatisch doorverwezen zodra de betaling is bevestigd.</p>
      </div>
    </main>
  );
}
