"use client";

import * as React from "react";

type Partner = { id: string; name: string; slug: string; city: string | null };

export default function PartnerPicker({ partners }: { partners: Partner[] }) {
  const [value, setValue] = React.useState(partners[0]?.slug ?? "");

  React.useEffect(() => {
    // fire custom event naar SlotsPageClient
    window.dispatchEvent(new CustomEvent("partner:change", { detail: { slug: value } }));
  }, [value]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <label className="block text-sm font-medium text-stone-700">Hondenschool</label>
      <select
        className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        {partners.map((p) => (
          <option key={p.id} value={p.slug}>
            {p.name} {p.city ? `— ${p.city}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
