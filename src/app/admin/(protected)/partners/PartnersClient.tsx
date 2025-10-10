// PATH: src/app/admin/(protected)/partners/PartnersClient.tsx
"use client";

import * as React from "react";
import { z } from "zod";

/* ========= Utils (onaangeroerd qua gedrag) ========= */
const euro = (cents: number) => `€ ${(cents / 100).toFixed(2).replace(".", ",")}`;
const toCents = (e: string | number) => {
  if (typeof e === "number") return Math.round(e * 100);
  const n = Number(e.replace(/[€\s]/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const PROVINCES = [
  "DRENTHE","FLEVOLAND","FRIESLAND","GELDERLAND","GRONINGEN","LIMBURG",
  "NOORD_BRABANT","NOORD_HOLLAND","OVERIJSSEL","UTRECHT","ZEELAND","ZUID_HOLLAND",
] as const;
type Province = (typeof PROVINCES)[number];

type PartnerRow = {
  id: string; name: string; slug: string; email: string | null; phone: string | null;
  city: string | null; province: Province; isActive: boolean; feePercent: number;
  price1PaxCents: number; price2PlusCents: number; heroImageUrl: string | null;
  addressLine1: string | null; postalCode: string | null;
  country: string | null; timezone: string; createdAt: string; updatedAt: string;
  googleMapsUrl: string | null;
};

const PartnerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Naam is verplicht"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Gebruik alleen a-z, 0-9 en '-'"),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  province: z.enum(PROVINCES),
  city: z.string().optional(),
  isActive: z.boolean().default(true),
  feePercent: z.coerce.number().int().min(0).max(90),
  price1PaxEuro: z.string().min(1, "Prijs 1p is verplicht"),
  price2PlusEuro: z.string().min(1, "Prijs ≥2p is verplicht"),
  heroImageUrl: z.string().url().optional(),
  addressLine1: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  googleMapsUrl: z.string().url("Voer een geldige URL in").optional(),
  timezone: z.string().default("Europe/Amsterdam"),
});
type PartnerForm = z.infer<typeof PartnerSchema>;

/* ========= Component ========= */
export default function PartnersClient({ initialPartners }: { initialPartners: PartnerRow[] }) {
  const [partners, setPartners] = React.useState<PartnerRow[]>(initialPartners);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<PartnerForm | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);

  const blank: PartnerForm = {
    name: "", slug: "", email: undefined, phone: "",
    province: "UTRECHT", city: "", isActive: true,
    feePercent: 20, price1PaxEuro: "49,95", price2PlusEuro: "39,95",
    heroImageUrl: undefined, addressLine1: "",
    postalCode: "", country: "NL", timezone: "Europe/Amsterdam",
    googleMapsUrl: undefined,
  };

  const fetchList = async (q?: string) => {
    setLoading(true); setError(null);
    try {
      const url = q ? `/api/admin/partners/list?q=${encodeURIComponent(q)}` : `/api/admin/partners/list`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `List failed ${res.status}`);
      setPartners(data.items as PartnerRow[]);
    } catch (e: any) { setError(e.message || "Kon lijst niet laden"); }
    finally { setLoading(false); }
  };

  const startNew = () => { setEditing({ ...blank }); setOkMsg(null); setError(null); };
  const startEdit = (p: PartnerRow) => {
    setEditing({
      id: p.id, name: p.name, slug: p.slug,
      email: p.email ?? undefined, phone: p.phone ?? "",
      province: p.province, city: p.city ?? "", isActive: p.isActive,
      feePercent: p.feePercent,
      price1PaxEuro: (p.price1PaxCents / 100).toFixed(2).replace(".", ","),
      price2PlusEuro: (p.price2PlusCents / 100).toFixed(2).replace(".", ","),
      heroImageUrl: p.heroImageUrl ?? undefined,
      addressLine1: p.addressLine1 ?? "",
      postalCode: p.postalCode ?? "", country: p.country ?? "NL",
      timezone: p.timezone ?? "Europe/Amsterdam",
      googleMapsUrl: p.googleMapsUrl ?? undefined,
    });
    setOkMsg(null); setError(null);
  };
  const cancelEdit = () => setEditing(null);
  const autoSlug = (name: string) =>
    setEditing((prev) => prev ? ({ ...prev, name, ...(prev.id ? {} : { slug: slugify(name) }) }) : prev);

  const normalize = (input: PartnerForm) => {
    const norm = { ...input };
    if (!norm.email) delete (norm as any).email;
    if (!norm.heroImageUrl) delete (norm as any).heroImageUrl;
    if (!norm.city) delete (norm as any).city;
    if (!norm.addressLine1) delete (norm as any).addressLine1;
    if (!norm.postalCode) delete (norm as any).postalCode;
    if (!norm.country) delete (norm as any).country;
    if (!norm.googleMapsUrl) delete (norm as any).googleMapsUrl;
    return norm;
  };

  const submit = async () => {
    if (!editing) return;
    setLoading(true); setError(null); setOkMsg(null);
    try {
      const parsed = PartnerSchema.parse(normalize(editing));
      const payload = {
        ...parsed,
        slug: slugify(parsed.slug || parsed.name),
        price1PaxCents: toCents(parsed.price1PaxEuro),
        price2PlusCents: toCents(parsed.price2PlusEuro),
      };
      const isUpdate = Boolean(parsed.id);
      const url = isUpdate ? "/api/admin/partners/update" : "/api/admin/partners/create";
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Onbekende fout");
      setOkMsg(isUpdate ? "Partner bijgewerkt ✅" : "Partner aangemaakt ✅");
      setEditing(null);
      await fetchList(query);
    } catch (e: any) {
      setError(e.message || "Validatiefout");
    } finally { setLoading(false); }
  };

  const onSearch = async (e: React.FormEvent) => { e.preventDefault(); await fetchList(query); };

  /* ========= UI (aligned met Admin Dashboard) ========= */
  return (
    <div className="space-y-6">
      {/* Compact header zoals dashboard */}
      <header className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Partners</h1>
            <p className="mt-0.5 text-sm text-stone-700">
              Beheer hondenscholen: zoeken, aanmaken en bewerken.
            </p>
          </div>
          <button
            onClick={startNew}
            className="rounded-2xl bg-black px-4 py-2 text-xs font-semibold text-white shadow hover:-translate-y-0.5 hover:shadow-md transition"
          >
            + Nieuwe partner
          </button>
        </div>
      </header>

      {(error || okMsg) && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            error
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-emerald-300 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || okMsg}
        </div>
      )}

      {/* Hoofdgrid — zelfde compacte, rustige look */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {/* Lijst */}
        <div className="md:col-span-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          {/* Zoekbalk in dashboard-stijl */}
          <form onSubmit={onSearch} className="mb-3 flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek op naam, slug, stad of e-mail…"
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
            <button
              type="submit"
              className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              disabled={loading}
            >
              Zoeken
            </button>
          </form>

          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-stone-100 text-stone-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Naam</th>
                  <th className="px-3 py-2 font-medium">Slug</th>
                  <th className="px-3 py-2 font-medium">Plaats</th>
                  <th className="px-3 py-2 font-medium">Fee%</th>
                  <th className="px-3 py-2 font-medium">Actief</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-stone-900">{p.name}</div>
                      <div className="text-[11px] text-stone-500">{p.email || "—"}</div>
                    </td>
                    <td className="px-3 py-2 text-stone-700">{p.slug}</td>
                    <td className="px-3 py-2 text-stone-700">{p.city || "—"}</td>
                    <td className="px-3 py-2">{p.feePercent}%</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${
                          p.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {p.isActive ? "Actief" : "Inactief"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => startEdit(p)}
                        className="rounded-lg border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100"
                      >
                        Bewerken
                      </button>
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-stone-500">
                      Geen partners gevonden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-2 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight">
              {editing?.id ? "Partner bewerken" : "Nieuwe partner"}
            </h2>
            {editing && (
              <button
                onClick={cancelEdit}
                className="rounded-lg px-3 py-1 text-xs text-stone-700 hover:bg-stone-100"
              >
                Annuleren
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[11px] text-stone-600">Naam</label>
              <input
                className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                value={editing?.name ?? ""}
                onChange={(e) => autoSlug(e.target.value)}
                placeholder="WoofExperience Odijk"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600">Slug</label>
              <input
                className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                value={editing?.slug ?? ""}
                onChange={(e) =>
                  setEditing((prev) => (prev ? { ...prev, slug: slugify(e.target.value) } : prev))
                }
                placeholder="woofexperience-odijk"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-stone-600">E-mail</label>
                <input
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                  value={editing?.email ?? ""}
                  onChange={(e) =>
                    setEditing((p) => (p ? { ...p, email: e.target.value || undefined } : p))
                  }
                  placeholder="info@voorbeeld.nl"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600">Telefoon</label>
                <input
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                  value={editing?.phone ?? ""}
                  onChange={(e) => setEditing((p) => (p ? { ...p, phone: e.target.value } : p))}
                  placeholder="+31 6 12345678"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-stone-600">Provincie</label>
                <select
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                  value={editing?.province ?? "UTRECHT"}
                  onChange={(e) =>
                    setEditing((p) => (p ? ({ ...p, province: e.target.value as Province }) : p))
                  }
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-stone-600">Plaats</label>
                <input
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                  value={editing?.city ?? ""}
                  onChange={(e) => setEditing((p) => (p ? { ...p, city: e.target.value } : p))}
                  placeholder="Odijk"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-stone-600">Adresregel 1</label>
                <input
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                  value={editing?.addressLine1 ?? ""}
                  onChange={(e) =>
                    setEditing((p) => (p ? { ...p, addressLine1: e.target.value } : p))
                  }
                  placeholder="Stationsstraat 1"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600">Postcode</label>
                <input
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                  value={editing?.postalCode ?? ""}
                  onChange={(e) =>
                    setEditing((p) => (p ? { ...p, postalCode: e.target.value } : p))
                  }
                  placeholder="1234 AB"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-stone-600">Google Maps URL</label>
              <input
                className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                value={editing?.googleMapsUrl ?? ""}
                onChange={(e) =>
                  setEditing((p) => (p ? { ...p, googleMapsUrl: e.target.value || undefined } : p))
                }
                placeholder="https://maps.google.com/?q=Stationsstraat+1,+1234+AB"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-stone-600">Land</label>
                <input
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                  value={editing?.country ?? "NL"}
                  onChange={(e) =>
                    setEditing((p) => (p ? { ...p, country: e.target.value } : p))
                  }
                  placeholder="NL"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600">Tijdzone</label>
                <input
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                  value={editing?.timezone ?? "Europe/Amsterdam"}
                  onChange={(e) =>
                    setEditing((p) => (p ? { ...p, timezone: e.target.value } : p))
                  }
                  placeholder="Europe/Amsterdam"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-stone-600">Prijs 1 persoon (EUR)</label>
                <input
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                  value={editing?.price1PaxEuro ?? ""}
                  onChange={(e) =>
                    setEditing((p) => (p ? { ...p, price1PaxEuro: e.target.value } : p))
                  }
                  placeholder="49,95"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600">Prijs ≥2 personen (EUR)</label>
                <input
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                  value={editing?.price2PlusEuro ?? ""}
                  onChange={(e) =>
                    setEditing((p) => (p ? { ...p, price2PlusEuro: e.target.value } : p))
                  }
                  placeholder="39,95"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600">Fee% (aanbetaling)</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                  value={editing?.feePercent ?? 20}
                  onChange={(e) =>
                    setEditing((p) => (p ? ({ ...p, feePercent: Number(e.target.value) }) : p))
                  }
                  placeholder="20"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] text-stone-600">Hero image URL</label>
                <input
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                  value={editing?.heroImageUrl ?? ""}
                  onChange={(e) =>
                    setEditing((p) => (p ? { ...p, heroImageUrl: e.target.value || undefined } : p))
                  }
                  placeholder="https://…"
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={editing?.isActive ?? true}
                    onChange={(e) =>
                      setEditing((p) => (p ? { ...p, isActive: e.target.checked } : p))
                    }
                  />
                  Actief
                </label>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={submit}
                disabled={!editing || loading}
                className="rounded-2xl bg-black px-4 py-2 text-xs font-semibold text-white shadow hover:-translate-y-0.5 hover:shadow-md transition disabled:opacity-50"
              >
                {editing?.id ? "Opslaan" : "Aanmaken"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
