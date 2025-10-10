// PATH: src/app/admin/(protected)/discounts/DiscountsClient.tsx
"use client";

import * as React from "react";

/* =========================================================
   Admin • Kortingscodes (Client)
   - Formulier om aan te maken (zonder dubbele partner dropdown)
   - Overzicht + Verwijder-knop per code
   - Admin: partnerselector in header bepaalt zowel lijst als aanmaak-target
   ======================================================= */

type PartnerRow = { id: string; name: string; slug: string; city: string | null };
type CodeType = "PERCENT" | "FIXED";

type DiscountRow = {
  id: string;
  code: string;
  type: CodeType;
  percent: number | null;
  amountCents: number | null;
  validFrom: string | null;
  validUntil: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  active: boolean;
  partnerId: string;
  partnerName: string | null;
  partnerSlug: string | null;
  createdAt: string;
  updatedAt: string;
};

type ListResp =
  | { ok: true; items: DiscountRow[] }
  | { ok?: false; error: string };

type CreateResp =
  | { ok: true; code: DiscountRow }
  | { ok?: false; error: string; issues?: { path: string; message: string }[] };

type DeleteResp =
  | { ok: true }
  | { ok?: false; error: string };

const ALL = "__ALL__";

const euro = (n?: number | null) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(((n ?? 0) as number) / 100);

const formatDate = (iso?: string | null) => (!iso ? "—" : new Date(iso).toLocaleDateString("nl-NL"));
const formatDateTime = (iso?: string | null) => (!iso ? "—" : new Date(iso).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" }));

const normalizeCode = (s: string) =>
  s.trim()
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`);
  return r.json();
}

export default function DiscountsClient() {
  /* ---------------- Scope / partners ---------------- */
  const [partners, setPartners] = React.useState<PartnerRow[] | null>(null);
  const [partnersErr, setPartnersErr] = React.useState<string | null>(null);

  // Heuristiek voor admin: meer dan 1 partner zichtbaar
  const isAdmin = (partners?.length ?? 0) > 1;

  // Header-partnerselectie voor LIJST (en aanmaakdoel als admin)
  const [listPartner, setListPartner] = React.useState<string>(ALL);

  React.useEffect(() => {
    (async () => {
      try {
        const rows = await fetchJSON<PartnerRow[]>("/api/partners/list");
        setPartners(rows ?? []);
        if ((rows?.length ?? 0) <= 1) {
          setListPartner(rows?.[0]?.id ?? "");
        } else {
          setListPartner(ALL);
        }
      } catch (e: any) {
        setPartnersErr(e?.message || "Kon partners niet laden.");
        setPartners([]);
      }
    })();
  }, []);

  const chosenListPartner = isAdmin
    ? (listPartner === ALL ? null : partners?.find((p) => p.id === listPartner) ?? null)
    : null;

  /* ---------------- Aanmaakformulier ---------------- */
  const [type, setType] = React.useState<CodeType>("PERCENT");
  const [code, setCode] = React.useState<string>("");
  const [autoNormalize, setAutoNormalize] = React.useState<boolean>(true);
  const [percent, setPercent] = React.useState<string>("");
  const [amountEuro, setAmountEuro] = React.useState<string>("");
  const [validFrom, setValidFrom] = React.useState<string>("");
  const [validUntil, setValidUntil] = React.useState<string>("");
  const [maxRedemptions, setMaxRedemptions] = React.useState<string>("");

  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [issues, setIssues] = React.useState<Record<string, string>>({});
  const [success, setSuccess] = React.useState<null | {
    code: string;
    type: CodeType;
    percent?: number | null;
    amountCents?: number | null;
    partnerName?: string;
  }>(null);

  React.useEffect(() => {
    if (!autoNormalize) return;
    setCode((prev) => normalizeCode(prev));
  }, [autoNormalize]); // eslint-disable-line

  function validateLight(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!code || code.length < 3) errs.code = "Minimaal 3 tekens.";
    if (type === "PERCENT") {
      if (!percent) errs.percent = "Verplicht.";
      else {
        const p = Number(String(percent).replace(",", "."));
        if (!Number.isFinite(p) || p < 1 || p > 100) errs.percent = "Geef 1–100 op.";
      }
    } else {
      if (!amountEuro) errs.amountEuro = "Verplicht.";
      else {
        const v = Number(String(amountEuro).replace(",", "."));
        if (!Number.isFinite(v) || v <= 0) errs.amountEuro = "Voer een geldig bedrag in (> 0).";
      }
    }
    // Admin: partner verplicht via header; geen extra dropdown meer
    if (isAdmin && listPartner === ALL) {
      errs.partnerId = "Kies in de header een hondenschool om voor aan te maken.";
    }
    if (validFrom && validUntil && validUntil < validFrom) errs.validUntil = "Einddatum ligt voor startdatum.";
    if (maxRedemptions) {
      const m = Number(maxRedemptions);
      if (!Number.isInteger(m) || m < 1) errs.maxRedemptions = "Minimaal 1 (geheel getal).";
    }
    return errs;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setIssues({});
    setSuccess(null);

    const light = validateLight();
    if (Object.keys(light).length > 0) {
      setIssues(light);
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        type,
        code: autoNormalize ? normalizeCode(code) : code,
        validFrom: validFrom || undefined,
        validUntil: validUntil || undefined,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
      };
      if (type === "PERCENT") payload.percent = Number(String(percent).replace(",", "."));
      else payload.amountEuro = String(amountEuro).replace(/\s+/g, "");

      // Admin → partnerId komt uit header select (listPartner)
      if (isAdmin && listPartner !== ALL) payload.partnerId = listPartner;

      const r = await fetch("/api/discounts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await r.json()) as CreateResp;

      if (!r.ok || (data as any).error) {
        const d = data as any;
        setServerError(d.error || `HTTP ${r.status}`);
        if (d.issues?.length) {
          const m: Record<string, string> = {};
          for (const it of d.issues) m[it.path] = it.message;
          setIssues(m);
        }
        return;
      }

      if (data.ok) {
        const partnerName =
          partners?.find((p) => p.id === (isAdmin ? listPartner : data.code.partnerId))?.name ?? undefined;

        setSuccess({
          code: data.code.code,
          type: data.code.type,
          percent: data.code.percent,
          amountCents: data.code.amountCents ?? undefined,
          partnerName,
        });

        // reset velden (type en header-keuze blijven staan)
        setCode("");
        setPercent("");
        setAmountEuro("");
        setValidFrom("");
        setValidUntil("");
        setMaxRedemptions("");
        setIssues({});

        // lijst verversen
        await loadList();
      }
    } catch (err: any) {
      setServerError(err?.message || "Onbekende fout.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------- Lijst (alle codes) ---------------- */
  const [rows, setRows] = React.useState<DiscountRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [listError, setListError] = React.useState<string | null>(null);

  const [onlyActive, setOnlyActive] = React.useState<boolean>(true);
  const [validNow, setValidNow] = React.useState<boolean>(false);
  const [q, setQ] = React.useState<string>("");
  const [qDebounced, setQDebounced] = React.useState<string>("");

  React.useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const [sortKey, setSortKey] = React.useState<
    "createdAt" | "code" | "type" | "value" | "valid" | "uses" | "partner" | "active"
  >("createdAt");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  function setSort(next: typeof sortKey) {
    setSortDir((prev) => (sortKey === next ? (prev === "asc" ? "desc" : "asc") : "asc"));
    setSortKey(next);
  }

  async function loadList() {
    setLoading(true);
    setListError(null);
    try {
      const p = new URLSearchParams();
      if (isAdmin && listPartner !== ALL) p.set("partnerId", listPartner);
      p.set("active", onlyActive ? "1" : "0");
      if (validNow) p.set("validNow", "1");
      if (qDebounced) p.set("q", qDebounced);
      p.set("limit", "1000");

      const data = await fetchJSON<ListResp>(`/api/discounts/list?${p.toString()}`);
      if ((data as any).error) throw new Error((data as any).error);
      if (!data?.ok) throw new Error("Onbekende fout");

      setRows(data.items ?? []);
    } catch (e: any) {
      setListError(e?.message || "Fout bij laden van kortingscodes.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (partners === null) return; // wacht eerst op partners (admin check)
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partners, listPartner, onlyActive, validNow, qDebounced]);

  const viewed = React.useMemo(() => {
    const arr = [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "createdAt":
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case "code":
          return dir * a.code.localeCompare(b.code);
        case "type":
          return dir * a.type.localeCompare(b.type);
        case "value": {
          const va = a.type === "PERCENT" ? (a.percent ?? 0) : (a.amountCents ?? 0);
          const vb = b.type === "PERCENT" ? (b.percent ?? 0) : (b.amountCents ?? 0);
          return dir * (va - vb);
        }
        case "valid": {
          const va = (a.validUntil ?? a.validFrom ?? "") || "";
          const vb = (b.validUntil ?? b.validFrom ?? "") || "";
          return dir * String(va).localeCompare(String(vb));
        }
        case "uses": {
          const va = a.maxRedemptions ? a.redeemedCount / a.maxRedemptions : a.redeemedCount;
          const vb = b.maxRedemptions ? b.redeemedCount / b.maxRedemptions : b.redeemedCount;
          return dir * (va - vb);
        }
        case "partner":
          return dir * (String(a.partnerName || "").localeCompare(String(b.partnerName || "")));
        case "active":
          return dir * (Number(a.active) - Number(b.active));
        default:
          return 0;
      }
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  function exportCSV() {
    const lines = [
      ["Aangemaakt","Code","Type","Waarde","Geldig (van)","Geldig (tm)","Gebruik","Actief","Hondenschool"].join(";"),
      ...viewed.map((c) =>
        [
          formatDateTime(c.createdAt),
          c.code,
          c.type === "PERCENT" ? "Percentage" : "Vast bedrag",
          c.type === "PERCENT" ? (c.percent ?? "") : (typeof c.amountCents === "number" ? (c.amountCents / 100).toFixed(2) : ""),
          c.validFrom ? formatDate(c.validFrom) : "",
          c.validUntil ? formatDate(c.validUntil) : "",
          c.maxRedemptions ? `${c.redeemedCount}/${c.maxRedemptions}` : `${c.redeemedCount}×`,
          c.active ? "Ja" : "Nee",
          c.partnerName ?? "",
        ].join(";")
      ),
    ].join("\n");
    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kortingscodes.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ---------------- Delete ---------------- */
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Weet je zeker dat je deze kortingscode wilt verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    setDeletingId(id);
    try {
      // Verwacht serverroute: POST /api/discounts/delete { id }
      const r = await fetch("/api/discounts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const data = (await r.json()) as DeleteResp;
      if (!r.ok || !data?.ok) {
        throw new Error((data as any)?.error || `HTTP ${r.status}`);
      }
      await loadList();
    } catch (e: any) {
      alert(e?.message || "Verwijderen mislukt.");
    } finally {
      setDeletingId(null);
    }
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 space-y-4">
        {/* Sticky header */}
        <section className="sticky top-2 z-20 rounded-2xl border border-stone-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-400" />
                  Kortingscodes
                </span>
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-stone-600">
                Maak nieuwe codes aan en beheer alle <b className="text-stone-900">actieve</b> codes hieronder.
              </p>
            </div>

            {/* Partner selector — alleen Admin */}
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="partnerListSel" className="sr-only">Scope overzicht</label>
                <select
                  id="partnerListSel"
                  aria-label="Partner voor overzicht en aanmaak"
                  className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  value={listPartner}
                  onChange={(e) => setListPartner(e.target.value)}
                >
                  <option value={ALL}>Alle hondenscholen</option>
                  {(partners ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.city ? ` — ${p.city}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {partnersErr && (
            <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {partnersErr}
            </div>
          )}
        </section>

        {/* Aanmaakformulier */}
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <form onSubmit={handleCreate} className="space-y-6">
            {/* Type & Code */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-stone-700 mb-1">Type</label>
                <div className="inline-flex gap-1 rounded-lg border border-stone-300 bg-white p-0.5 shadow-sm" role="tablist" aria-label="Kortingstype">
                  <Chip active={type==="PERCENT"} onClick={()=>setType("PERCENT")}>Percentage</Chip>
                  <Chip active={type==="FIXED"} onClick={()=>setType("FIXED")}>Vast bedrag</Chip>
                </div>
              </div>
              <div className="sm:col-span-8">
                <label htmlFor="code" className="block text-xs font-semibold text-stone-700 mb-1">Code</label>
                <div className="flex gap-2">
                  <input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(autoNormalize ? normalizeCode(e.target.value) : e.target.value)}
                    placeholder="BIJV. HERFST-10"
                    className={`h-10 w-full rounded-lg border ${issues.code ? "border-rose-400" : "border-stone-300"} bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500`}
                  />
                  <label className="inline-flex items-center gap-1 text-xs text-stone-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-stone-300 text-pink-600 focus:ring-pink-500"
                      checked={autoNormalize}
                      onChange={(e) => setAutoNormalize(e.target.checked)}
                    />
                    Normaliseer
                  </label>
                </div>
                {issues.code && <p className="mt-1 text-xs text-rose-700">{issues.code}</p>}
              </div>
            </div>

            {/* Waarde */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              {type === "PERCENT" ? (
                <div className="sm:col-span-4">
                  <label htmlFor="percent" className="block text-xs font-semibold text-stone-700 mb-1">Percentage</label>
                  <div className="relative">
                    <input
                      id="percent"
                      inputMode="decimal"
                      value={percent}
                      onChange={(e) => setPercent(e.target.value)}
                      placeholder="Bijv. 10"
                      className={`h-10 w-full rounded-lg border ${issues.percent ? "border-rose-400" : "border-stone-300"} bg-white px-3 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-sm text-stone-500">%</span>
                  </div>
                  {issues.percent && <p className="mt-1 text-xs text-rose-700">{issues.percent}</p>}
                </div>
              ) : (
                <div className="sm:col-span-4">
                  <label htmlFor="amount" className="block text-xs font-semibold text-stone-700 mb-1">Bedrag</label>
                  <div className="relative">
                    <input
                      id="amount"
                      inputMode="decimal"
                      value={amountEuro}
                      onChange={(e) => setAmountEuro(e.target.value)}
                      placeholder="Bijv. 7,50"
                      className={`h-10 w-full rounded-lg border ${issues.amountEuro ? "border-rose-400" : "border-stone-300"} bg-white pl-7 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 left-2 grid place-items-center text-sm text-stone-500">€</span>
                  </div>
                  {issues.amountEuro && <p className="mt-1 text-xs text-rose-700">{issues.amountEuro}</p>}
                </div>
              )}

              <div className="sm:col-span-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="from" className="block text-xs font-semibold text-stone-700 mb-1">Geldig vanaf</label>
                  <input
                    id="from" type="date" value={validFrom}
                    onChange={(e)=>setValidFrom(e.target.value)}
                    className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label htmlFor="until" className="block text-xs font-semibold text-stone-700 mb-1">Geldig t/m</label>
                  <input
                    id="until" type="date" value={validUntil}
                    onChange={(e)=>setValidUntil(e.target.value)}
                    className={`h-10 w-full rounded-lg border ${issues.validUntil ? "border-rose-400" : "border-stone-300"} bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500`}
                  />
                  {issues.validUntil && <p className="mt-1 text-xs text-rose-700">{issues.validUntil}</p>}
                </div>
                <div>
                  <label htmlFor="max" className="block text-xs font-semibold text-stone-700 mb-1">Max. keer te gebruiken</label>
                  <input
                    id="max" inputMode="numeric" value={maxRedemptions}
                    onChange={(e)=>setMaxRedemptions(e.target.value)}
                    placeholder="Bijv. 100"
                    className={`h-10 w-full rounded-lg border ${issues.maxRedemptions ? "border-rose-400" : "border-stone-300"} bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500`}
                  />
                  {issues.maxRedemptions && <p className="mt-1 text-xs text-rose-700">{issues.maxRedemptions}</p>}
                </div>
              </div>
            </div>

            {/* Geen extra partner dropdown meer in het formulier */}
            {isAdmin && listPartner === ALL && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Je overzicht staat op <b>Alle hondenscholen</b>. Kies in de header een hondenschool om een code voor aan te maken.
                {issues.partnerId && <div className="mt-1 text-rose-700">{issues.partnerId}</div>}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-stone-500">
                Na aanmaken is de code <b className="text-stone-800">actief</b>. (Deactiveren/verwijderen kan bij “Overzicht”.)
              </div>
              <button
                type="submit"
                disabled={submitting || (isAdmin && listPartner === ALL)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-900 bg-stone-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-rose-400/40 disabled:opacity-60"
              >
                {submitting ? "Aanmaken…" : "Aanmaken"}
              </button>
            </div>

            {serverError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {serverError}
              </div>
            )}
          </form>

          {/* Succeskaart */}
          {success && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>✅</span>
                <h2 className="text-base font-extrabold tracking-tight">Kortingscode aangemaakt</h2>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <KV label="Code"><CopyBlock text={success.code} /></KV>
                <KV label="Type">{success.type === "PERCENT" ? "Percentage" : "Vast bedrag"}</KV>
                {typeof success.percent === "number" && <KV label="Waarde">{success.percent}%</KV>}
                {typeof success.amountCents === "number" && <KV label="Waarde">{euro(success.amountCents)}</KV>}
                {success.partnerName && <KV label="Hondenschool">{success.partnerName}</KV>}
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setSuccess(null)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 shadow-sm hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                >
                  Nog één maken
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Overzicht — álle codes (filterbaar) */}
        <section className="rounded-2xl border border-stone-200 bg-white p-0 shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-2 border-b border-stone-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-extrabold">🔖 Overzicht</h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                placeholder="Zoek op code…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-8 w-48 rounded-lg border border-stone-300 bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <label className="inline-flex items-center gap-1 text-xs text-stone-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-pink-600 focus:ring-pink-500"
                  checked={onlyActive}
                  onChange={(e) => setOnlyActive(e.target.checked)}
                />
                Alleen actieve
              </label>
              <label className="inline-flex items-center gap-1 text-xs text-stone-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-pink-600 focus:ring-pink-500"
                  checked={validNow}
                  onChange={(e) => setValidNow(e.target.checked)}
                />
                Alleen nú geldig
              </label>
              <button
                type="button"
                onClick={exportCSV}
                className="h-8 rounded-lg border border-stone-900 bg-stone-900 px-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
              >
                Exporteer CSV
              </button>
            </div>
          </div>

          {/* Desktop tabel */}
          <div className="hidden md:block overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-stone-50 text-stone-600 shadow-sm">
                <tr>
                  <Th sortable onSort={()=>setSort("createdAt")} active={sortKey==="createdAt"} dir={sortDir}>Aangemaakt</Th>
                  <Th sortable onSort={()=>setSort("code")}      active={sortKey==="code"}      dir={sortDir}>Code</Th>
                  <Th sortable onSort={()=>setSort("type")}      active={sortKey==="type"}      dir={sortDir}>Type</Th>
                  <Th sortable onSort={()=>setSort("value")}     active={sortKey==="value"}     dir={sortDir}>Waarde</Th>
                  <Th sortable onSort={()=>setSort("valid")}     active={sortKey==="valid"}     dir={sortDir}>Geldig</Th>
                  <Th sortable onSort={()=>setSort("uses")}      active={sortKey==="uses"}      dir={sortDir}>Gebruik</Th>
                  <Th sortable onSort={()=>setSort("partner")}   active={sortKey==="partner"}   dir={sortDir}>Hondenschool</Th>
                  <Th sortable onSort={()=>setSort("active")}    active={sortKey==="active"}    dir={sortDir}>Status</Th>
                  <Th>Acties</Th>
                </tr>
              </thead>
              <tbody>
                {loading && <SkeletonRows rows={8} cols={9} />}
                {!loading && viewed.length === 0 && (
                  <tr><td colSpan={9} className="p-8"><EmptyState title="Geen resultaten">Pas je filters aan of maak een nieuwe code aan.</EmptyState></td></tr>
                )}
                {!loading && viewed.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-stone-50/80">
                    <Td>{formatDateTime(c.createdAt)}</Td>
                    <Td className="font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px]">{c.code}</code>
                        <CopyMini text={c.code} />
                      </span>
                    </Td>
                    <Td>{c.type === "PERCENT" ? "Percentage" : "Vast bedrag"}</Td>
                    <Td>{c.type === "PERCENT" ? (typeof c.percent === "number" ? `${c.percent}%` : "—") : (typeof c.amountCents === "number" ? euro(c.amountCents) : "—")}</Td>
                    <Td>{c.validFrom || c.validUntil ? `${formatDate(c.validFrom)} – ${formatDate(c.validUntil)}` : "Onbeperkt"}</Td>
                    <Td>{c.maxRedemptions ? `${c.redeemedCount}/${c.maxRedemptions}` : `${c.redeemedCount}×`}</Td>
                    <Td>{c.partnerName ?? "—"}</Td>
                    <Td>
                      <span className={[
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        c.active ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-700"
                      ].join(" ")}>
                        {c.active ? "Actief" : "Inactief"}
                      </span>
                    </Td>
                    <Td>
                      <button
                        type="button"
                        aria-label={`Verwijder kortingscode ${c.code}`}
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-600 bg-white px-3 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400/40 disabled:opacity-60"
                      >
                        {deletingId === c.id ? "Verwijderen…" : "Verwijder"}
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobiel kaarten */}
          <div className="md:hidden divide-y divide-stone-200">
            {loading && <div className="p-4"><div className="h-3 w-full animate-pulse rounded bg-stone-200 mb-2" /><div className="h-3 w-full animate-pulse rounded bg-stone-200" /></div>}
            {!loading && viewed.length === 0 && (
              <div className="p-4"><EmptyState title="Geen resultaten">Pas je filters aan of maak een nieuwe code aan.</EmptyState></div>
            )}
            {!loading && viewed.map((c) => (
              <div key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-stone-500">{formatDateTime(c.createdAt)}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px]">{c.code}</code>
                      <CopyMini text={c.code} />
                      <span className="text-xs text-stone-600">•</span>
                      <span className="text-xs text-stone-700">{c.type === "PERCENT" ? "Percentage" : "Vast bedrag"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={[
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      c.active ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-700"
                    ].join(" ")}>
                      {c.active ? "Actief" : "Inactief"}
                    </span>
                    <button
                      type="button"
                      aria-label={`Verwijder kortingscode ${c.code}`}
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-600 bg-white px-2.5 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400/40 disabled:opacity-60"
                    >
                      {deletingId === c.id ? "…" : "Verwijder"}
                    </button>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border border-stone-200 p-2">
                    <div className="text-[11px] text-stone-500">Waarde</div>
                    <div className="font-semibold">
                      {c.type === "PERCENT" ? (typeof c.percent === "number" ? `${c.percent}%` : "—") : (typeof c.amountCents === "number" ? euro(c.amountCents) : "—")}
                    </div>
                  </div>
                  <div className="rounded-lg border border-stone-200 p-2">
                    <div className="text-[11px] text-stone-500">Gebruik</div>
                    <div className="font-semibold">
                      {c.maxRedemptions ? `${c.redeemedCount}/${c.maxRedemptions}` : `${c.redeemedCount}×`}
                    </div>
                  </div>
                  <div className="rounded-lg border border-stone-200 p-2 col-span-2">
                    <div className="text-[11px] text-stone-500">Geldig</div>
                    <div className="font-semibold">
                      {c.validFrom || c.validUntil ? `${formatDate(c.validFrom)} – ${formatDate(c.validUntil)}` : "Onbeperkt"}
                    </div>
                  </div>
                  {c.partnerName && (
                    <div className="rounded-lg border border-stone-200 p-2 col-span-2">
                      <div className="text-[11px] text-stone-500">Hondenschool</div>
                      <div className="font-semibold">{c.partnerName}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {listError && (
            <div className="border-t border-rose-200 px-3 py-2 text-sm text-rose-700 bg-rose-50">
              {listError}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------------- Presentational helpers ---------------- */
function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-md px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/40",
        active ? "bg-pink-600 text-white" : "text-stone-900 hover:bg-stone-100"
      ].join(" ")}
      aria-pressed={!!active}
      role="tab"
    >
      {children}
    </button>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
      <div className="text-[11px] uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-stone-900">{children}</div>
    </div>
  );
}

function CopyBlock({ text }: { text: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="rounded-md bg-stone-100 px-2 py-1 text-xs">{text}</code>
      <button
        type="button"
        onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(()=>setOk(false), 1500); } catch {} }}
        className="inline-flex h-7 items-center justify-center rounded-md border border-stone-300 bg-white px-2 text-[11px] font-semibold text-stone-900 shadow-sm hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
      >
        {ok ? "Gekopieerd" : "Kopieer"}
      </button>
    </div>
  );
}

function CopyMini({ text }: { text: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(()=>setOk(false), 1200); } catch {} }}
      className="inline-flex h-6 items-center justify-center rounded border border-stone-300 bg-white px-1.5 text-[10px] font-semibold text-stone-900 shadow-sm hover:bg-stone-100"
      title="Kopieer code"
    >
      {ok ? "✓" : "Kopieer"}
    </button>
  );
}

function Th({
  children, className = "", sortable, onSort, active, dir,
}: {
  children: React.ReactNode;
  className?: string;
  sortable?: boolean;
  onSort?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
}) {
  const base = "px-3 py-2 text-left text-xs font-semibold";
  if (!sortable) return <th className={`${base} ${className}`}>{children}</th>;
  return (
    <th className={`${base} ${className}`}>
      <button
        type="button"
        onClick={onSort}
        className={[
          "inline-flex items-center gap-1 rounded px-0.5 py-0.5 hover:bg-stone-100",
          active ? "text-stone-900" : "text-stone-600"
        ].join(" ")}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{children}</span>
        <span className="text-[11px]" aria-hidden>
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}
function Td({ children, className = "" }: any) {
  return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}
function SkeletonRows({ rows = 6, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-3 py-2">
              <div className="h-3 w-full animate-pulse rounded bg-stone-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="mx-auto mb-2 h-10 w-10 rounded-2xl bg-stone-100 p-2">📭</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-stone-600">{children}</p>
    </div>
  );
}
