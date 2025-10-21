"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

type PartnerRow = { id: string; name: string; slug: string; city: string | null };

type Props = {
  className?: string;
  /** Querystring key die je wil gebruiken (bv. "partner") */
  qsKey?: string;
  /** Controlled usage (optioneel) */
  value?: string | null;
  onChangeSlug?: (slug: string | null) => void;
  placeholder?: string;
};

export default function PartnerSelect({
  className,
  qsKey = "partner",
  value,
  onChangeSlug,
  placeholder = "Kies een hondenschool...",
}: Props) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<PartnerRow[]>([]);
  const router = useRouter();
  const sp = useSearchParams();

  const qsValue = sp.get(qsKey);
  const selected = value ?? qsValue ?? "";

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/partners/list", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "HTTP " + res.status);
        if (alive) setItems(json.data as PartnerRow[]);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Onbekende fout");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const slug = e.target.value || null;
    onChangeSlug?.(slug);
    if (!onChangeSlug) {
      const params = new URLSearchParams(Array.from(sp.entries()));
      if (slug) params.set(qsKey, slug);
      else params.delete(qsKey);
      router.replace(`?${params.toString()}`);
    }
  }

  return (
    <div className={className}>
      <label className="text-sm text-stone-600 block mb-1">Hondenschool</label>

      {loading ? (
        <div className="h-10 animate-pulse rounded-xl bg-stone-200" />
      ) : error ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          Kan partners niet laden: {error}
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-stone-700 bg-stone-50 border border-stone-200 rounded-xl p-3">
          Geen partners gevonden. Voeg er één toe in het admin-portaal.
        </div>
      ) : (
        <select
          value={selected}
          onChange={handleChange}
          className="w-full h-10 rounded-xl border border-stone-300 bg-white px-3 text-stone-900
                     focus:outline-none focus:ring-2 focus:ring-rose-300"
          aria-label="Selecteer hondenschool"
        >
          <option value="">{placeholder}</option>
          {items.map((p) => (
            <option key={p.id} value={p.slug}>
              {p.name}{p.city ? ` — ${p.city}` : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
