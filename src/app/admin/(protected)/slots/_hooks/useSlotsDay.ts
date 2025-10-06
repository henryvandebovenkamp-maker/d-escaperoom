// src/app/admin/(protected)/slots/_hooks/useSlotsDay.ts
"use client";

import * as React from "react";

export type SlotVM = {
  id: string;
  timeLabel: string; // "09:00"
  hour: number;      // 9..21
  status: "DRAFT" | "PUBLISHED" | "BOOKED";
};

export function useSlotsDay(partnerSlug: string, dayISO: string) {
  const [slots, setSlots] = React.useState<SlotVM[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ partner: partnerSlug, day: dayISO });
      const res = await fetch(`/api/slots/day?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSlots(data.slots);
    } catch (e: any) {
      setError(e?.message ?? "Kon slots niet laden");
    } finally {
      setLoading(false);
    }
  }, [partnerSlug, dayISO]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  async function publish(hour: number) {
    await mutate("publish", hour);
  }
  async function unpublish(hour: number) {
    await mutate("unpublish", hour);
  }

  async function mutate(action: "publish" | "unpublish", hour: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/slots/day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner: partnerSlug, day: dayISO, hour, action }),
      });
      if (!res.ok) throw new Error(await res.text());
      await reload();
    } catch (e: any) {
      setError(e?.message ?? "Actie mislukt");
      setLoading(false);
    }
  }

  return { slots, loading, error, reload, publish, unpublish };
}
