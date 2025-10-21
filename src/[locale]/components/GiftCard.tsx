// PATH: src/components/Giftcard.tsx
"use client";

import * as React from "react";
import { z } from "zod";

type PartnerOption = { id: string; name: string; city: string | null };

const FormSchema = z.object({
  amountCents: z.number().int().min(500, "Minimaal €5,00"),
  partnerId: z.string().optional().nullable(),
  purchaserEmail: z.string().email("Vul een geldig e-mailadres in"),
  purchaserName: z.string().max(120).optional(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().max(120).optional(),
  message: z.string().max(500).optional(),
});

export default function Giftcard() {
  // ---- Form state
  const [amountCents, setAmountCents] = React.useState(5000);
  const [partners, setPartners] = React.useState<PartnerOption[]>([]);
  const [partnerId, setPartnerId] = React.useState("");
  const [purchaserName, setPurchaserName] = React.useState("");
  const [recipientName, setRecipientName] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedPartner = partners.find((p) => p.id === partnerId) || null;
  const eur = (amountCents / 100).toFixed(2);

  // ---- Load partners
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/partners/list", { cache: "no-store" });
        if (r.ok) setPartners((await r.json()) as PartnerOption[]);
      } catch {}
    })();
  }, []);

  // ---- Build preview IMG url via /api/giftcards/card
  const [previewUrl, setPreviewUrl] = React.useState<string>("");

  React.useEffect(() => {
    // window is beschikbaar (client component)
    const origin = window.location.origin;
    const url = new URL("/api/giftcards/card", origin);
    url.searchParams.set("amountCents", String(amountCents));
    url.searchParams.set("recipientName", recipientName || "— ontvanger —");
    url.searchParams.set("purchaserName", purchaserName || "— jouw naam —");
    url.searchParams.set("message", message || "Voeg een persoonlijk bericht toe…");
    url.searchParams.set(
      "partnerName",
      selectedPartner
        ? selectedPartner.city
          ? `${selectedPartner.name} (${selectedPartner.city})`
          : selectedPartner.name
        : "Alle locaties"
    );
    // Voor preview tonen we een placeholder code; bij echte e-mail/success vul je de echte code in.
    url.searchParams.set("code", "GC-XXXXXX");
    // Hogere resolutie voor strak beeld (retina)
    url.searchParams.set("w", "1000");
    url.searchParams.set("h", "1500");

    setPreviewUrl(url.toString());
  }, [amountCents, recipientName, purchaserName, message, selectedPartner]);

  // ---- Submit handler (start Mollie via jouw order API)
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      amountCents: Number(fd.get("amountCents")),
      partnerId: (fd.get("partnerId") as string) || undefined,
      purchaserEmail: String(fd.get("purchaserEmail") || ""),
      purchaserName,
      recipientEmail: String(fd.get("recipientEmail") || ""),
      recipientName,
      message,
    };

    const parsed = FormSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Controleer je invoer.");
      return;
    }

    try {
      setLoading(true);
      const r = await fetch("/api/giftcards/order/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!r.ok) throw new Error((await r.text()) || "Kon betaling niet starten.");
      const { checkoutUrl } = (await r.json()) as { checkoutUrl: string };
      if (!checkoutUrl) throw new Error("Geen checkoutUrl ontvangen.");
      window.location.href = checkoutUrl;
    } catch (err: any) {
      setError(err?.message ?? "Onbekende fout. Probeer het later opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  const presets = [2500, 5000, 7500, 10000]; // €25 / €50 / €75 / €100

  return (
    <section className="mx-auto mt-14 mb-12 w-full max-w-6xl px-4 md:px-6">
      <div className="grid gap-10 md:grid-cols-2 md:items-start">
        {/* =========================
            FORMULIER (links)
        ========================= */}
        <div className="rounded-3xl border border-stone-200 bg-white/90 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.25)]">
          <div className="border-b border-stone-200/80 p-6 sm:p-7">
            <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">
              Geef avontuur cadeau
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Kies een bedrag en (optioneel) een hondenschool. Na betaling ontvang je de giftcard per e-mail.
            </p>
          </div>

          <form onSubmit={onSubmit} className="grid gap-6 p-6 sm:p-7" noValidate>
            {/* Bedrag */}
            <div>
              <label className="block text-sm font-semibold text-stone-800">Bedrag</label>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {presets.map((c) => {
                  const active = amountCents === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAmountCents(c)}
                      aria-pressed={active}
                      className={[
                        "rounded-xl px-4 py-2 text-sm font-medium transition shadow-sm",
                        active ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-900 hover:bg-stone-200",
                      ].join(" ")}
                    >
                      €{(c / 100).toFixed(2)}
                    </button>
                  );
                })}
                <div className="ml-1 flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm">
                  <label htmlFor="amount-eur" className="sr-only">Eigen bedrag</label>
                  <input
                    id="amount-eur"
                    type="number"
                    min={5}
                    step={1}
                    value={Math.max(5, Math.round(amountCents / 100))}
                    onChange={(e) => setAmountCents(Math.max(5, Number(e.target.value)) * 100)}
                    className="w-20 bg-transparent text-stone-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-stone-700">euro</span>
                </div>
              </div>
              <input type="hidden" name="amountCents" value={amountCents} />
            </div>

            {/* Hondenschool */}
            <div>
              <label className="block text-sm font-semibold text-stone-800">Hondenschool (optioneel)</label>
              <select
                name="partnerId"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              >
                <option value="">— Alle locaties —</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.city ? `(${p.city})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Koper + ontvanger */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-stone-800">Jouw naam</label>
                <input
                  value={purchaserName}
                  onChange={(e) => setPurchaserName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-800">Jouw e-mail</label>
                <input
                  name="purchaserEmail"
                  type="email"
                  required
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-stone-800">Naam ontvanger</label>
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-800">E-mail ontvanger</label>
                <input
                  name="recipientEmail"
                  type="email"
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>

            {/* Persoonlijk bericht */}
            <div>
              <label className="block text-sm font-semibold text-stone-800">Persoonlijk bericht</label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Bijv. Veel plezier met het avontuur!"
                className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-pink-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-600 disabled:opacity-60"
              >
                {loading ? "Bezig…" : "Verder naar betalen"}
              </button>
            </div>
          </form>
        </div>

        {/* =========================
            PREVIEW (rechts) — 1 PNG
        ========================= */}
        <div className="flex items-start justify-center">
          {/* aspect ratio 2:3 (staand) */}
          <div className="w-full max-w-sm">
            {/* Gebruik één afbeelding vanaf de API */}
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Voorbeeld van de D-EscapeRoom giftcard"
                className="aspect-[2/3] w-full rounded-[28px] border border-stone-300 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.55)]"
              />
            ) : (
              <div className="aspect-[2/3] w-full animate-pulse rounded-[28px] border border-stone-200 bg-stone-100" />
            )}
            <p className="mt-3 text-center text-xs text-stone-500">
              De uiteindelijke giftcard wordt als afbeelding meegestuurd in de e-mail.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
