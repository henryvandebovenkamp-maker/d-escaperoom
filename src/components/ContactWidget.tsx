// PATH: src/components/ContactWidget.tsx
"use client";

import * as React from "react";
import Link from "next/link";

type Variant = "partner" | "consumer";

type Props = {
  title?: string;
  subtitle?: string;
  variant?: Variant; // partner = zwarte CTA, consumer = roze CTA
  className?: string;
  onSubmit?: (data: {
    fullName: string;
    email: string;
    phone?: string;
    topic: string;
    message: string;
    callOk: boolean;
  }) => Promise<void> | void;
};

export default function ContactWidget({
  title = "Neem contact op",
  subtitle = "Stel je vraag of plan direct een belmoment. We reageren meestal binnen één werkdag.",
  variant = "partner",
  className = "",
  onSubmit,
}: Props) {
  // Form state
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [topic, setTopic] = React.useState("Algemene vraag");
  const [message, setMessage] = React.useState("");
  const [callOk, setCallOk] = React.useState(true);

  const [submitting, setSubmitting] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  const isPartner = variant === "partner";
  const ctaClass =
    isPartner
      ? "bg-black hover:bg-black/90 focus:ring-stone-400"
      : "bg-pink-600 hover:bg-pink-700 focus:ring-pink-300";

  // zeer lichte validatie
  const canSubmit = fullName.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && message.trim().length > 5;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!canSubmit) {
      setMsg("Controleer je invoer: naam, e-mail en bericht zijn verplicht.");
      return;
    }
    try {
      setSubmitting(true);
      if (onSubmit) {
        await onSubmit({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), topic, message: message.trim(), callOk });
      } else {
        // Placeholder: hier kun je je echte endpoint aanroepen
        // await fetch("/api/contact", { method: "POST", body: JSON.stringify({...}) });
        await new Promise((r) => setTimeout(r, 400));
      }
      setOk(true);
      setFullName("");
      setEmail("");
      setPhone("");
      setTopic("Algemene vraag");
      setMessage("");
      setCallOk(true);
    } catch (err: any) {
      setMsg(err?.message || "Versturen mislukt. Probeer het nog een keer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="contact-widget-title"
      className={[
        "space-y-4 rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-md backdrop-blur-sm",
        className,
      ].join(" ")}
    >
      {/* ======= HEADER ======= */}
      <div className="relative overflow-visible rounded-2xl border border-stone-200">
        <img
          src="/images/header-foto.png"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl object-cover opacity-60"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-50/90 via-pink-50/80 to-stone-50/90" />
        <div className="relative z-10 p-4 text-center">
          <h2
            id="contact-widget-title"
            className="text-2xl md:text-3xl font-black leading-tight tracking-tight text-stone-900"
          >
            {title}
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-sm text-stone-700">{subtitle}</p>
        </div>
      </div>
      {/* ======= /HEADER ======= */}

      {/* ======= BODY ======= */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Info/CTA-kaart links */}
        <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-stone-200" />
          <div aria-hidden className="pointer-events-none absolute -inset-px rounded-[14px] bg-gradient-to-br from-rose-50/70 via-pink-50/40 to-stone-50/30" />

          <div className="relative z-10 space-y-3">
            <h3 className="text-base md:text-lg font-extrabold leading-tight tracking-tight text-stone-900">
              Snel antwoord, korte lijntjes
            </h3>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2">
                <span aria-hidden className="select-none text-sm leading-6">📞</span>
                <div className="text-[13px] text-stone-700">
                  Liever bellen? <strong className="text-stone-900">Plan een kort gesprek</strong> en we lopen alles samen door.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="select-none text-sm leading-6">✉️</span>
                <div className="text-[13px] text-stone-700">
                  Mail ons direct via{" "}
                  <a href="mailto:info@d-escaperoom.nl" className="underline decoration-stone-300 hover:decoration-stone-500">
                    info@d-escaperoom.nl
                  </a>
                  .
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="select-none text-sm leading-6">📍</span>
                <div className="text-[13px] text-stone-700">
                  Landelijk concept — we werken met lokale hondenscholen (1 partner per provincie).
                </div>
              </li>
            </ul>

            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/partner/aanmelden"
                className={`inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white shadow focus:outline-none focus:ring-4 ${ctaClass}`}
                aria-label="Plan een demo"
              >
                Plan een demo
              </Link>
              <a
                href="tel:+31000000000"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-stone-300 bg-white/90 px-3 text-sm font-medium text-stone-900 shadow-sm hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300"
                aria-label="Bel ons"
              >
                Bel ons
              </a>
            </div>
          </div>
        </div>

        {/* Form rechts */}
        <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-stone-200" />
          <div aria-hidden className="pointer-events-none absolute -inset-px rounded-[14px] bg-gradient-to-br from-rose-50/70 via-pink-50/40 to-stone-50/30" />

          <form onSubmit={handleSubmit} className="relative z-10 space-y-3" aria-label="Contactformulier">
            <h3 className="text-base md:text-lg font-extrabold leading-tight tracking-tight text-stone-900">
              Stuur een bericht
            </h3>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs font-medium text-stone-800">
                Volledige naam
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="bijv. Jamie de Vries"
                  required
                />
              </label>

              <label className="block text-xs font-medium text-stone-800">
                E-mail
                <input
                  type="email"
                  className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jij@example.com"
                  required
                />
              </label>

              <label className="block text-xs font-medium text-stone-800 sm:col-span-2">
                Telefoon (optioneel)
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+31 6 12 34 56 78"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs font-medium text-stone-800">
                Onderwerp
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm outline-none transition focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  <option>Algemene vraag</option>
                  <option>Partner worden</option>
                  <option>Beschikbaarheid & agenda</option>
                  <option>Prijs & aanbetaling</option>
                  <option>Overig</option>
                </select>
              </label>

              <label className="block text-xs font-medium text-stone-800">
                Terugbelverzoek
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm outline-none transition focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
                  value={callOk ? "Ja, graag" : "Niet nodig"}
                  onChange={(e) => setCallOk(e.target.value === "Ja, graag")}
                >
                  <option>Ja, graag</option>
                  <option>Niet nodig</option>
                </select>
              </label>
            </div>

            <label className="block text-xs font-medium text-stone-800">
              Bericht
              <textarea
                rows={5}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-stone-400 focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Vertel kort waar we je mee helpen…"
                required
              />
            </label>

            {msg && <p className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">{msg}</p>}
            {ok && (
              <p className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                Bedankt! Je bericht is verstuurd. We nemen snel contact op.
              </p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <label className="inline-flex items-center gap-2 text-[11px] text-stone-700">
                <input
                  type="checkbox"
                  checked={callOk}
                  onChange={(e) => setCallOk(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-pink-600 focus:ring-pink-300"
                />
                Je mag me bellen als er vragen zijn
              </label>

              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className={`inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white shadow focus:outline-none focus:ring-4 disabled:opacity-60 ${ctaClass}`}
              >
                {submitting ? "Versturen…" : "Verstuur bericht"}
              </button>
            </div>
          </form>
        </div>
      </div>
      {/* ======= /BODY ======= */}
    </section>
  );
}
