// PATH: src/components/ContactWidget.tsx
"use client";

import * as React from "react";

type Variant = "partner" | "consumer";

type Props = {
  title?: string;
  subtitle?: string;
  variant?: Variant;
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

  const ctaClass = isPartner
    ? "bg-white text-stone-950 hover:bg-stone-200 focus:ring-white/30"
    : "bg-pink-600 text-white hover:bg-pink-700 focus:ring-pink-300";

  const canSubmit =
    fullName.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(email) &&
    message.trim().length >= 3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setMsg(null);
    setOk(false);

    if (!canSubmit) {
      setMsg(
        "Controleer je invoer: naam, e-mail en bericht zijn verplicht."
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        topic,
        message: message.trim(),
        callOk,
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || json?.ok !== true) {
          throw new Error(
            json?.error || "Versturen mislukt. Probeer het nog een keer."
          );
        }
      }

      setOk(true);
      setFullName("");
      setEmail("");
      setPhone("");
      setTopic("Algemene vraag");
      setMessage("");
      setCallOk(true);

      window.setTimeout(() => setOk(false), 6000);
    } catch (err: any) {
      setMsg(err?.message || "Versturen mislukt. Probeer het nog een keer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className={[
        "relative overflow-hidden bg-stone-950 px-4 py-12 text-white sm:px-6 lg:px-8 lg:py-20",
        className,
      ].join(" ")}
    >
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.16),transparent_38%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.45)_0%,rgba(12,10,9,0.96)_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
            CONTACT
          </span>

          <h2
            id="contact-title"
            className="mt-5 text-4xl font-black tracking-tight text-rose-300 sm:text-5xl lg:text-6xl"
          >
            {title}
          </h2>

          <p className="mt-5 text-sm leading-7 text-stone-200/90 sm:text-base">
            {subtitle}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-7">
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-label="Contactformulier"
            aria-busy={submitting}
            className="rounded-[1.5rem] border border-white/10 bg-black/35 p-5 backdrop-blur-md sm:p-6"
          >
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200/90">
                Stuur een bericht
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-stone-100">
                  Volledige naam
                  <input
                    className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-stone-950/70 px-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-pink-400 focus:ring-4 focus:ring-pink-300/30"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="bijv. Jamie de Vries"
                  />
                </label>

                <label className="block text-xs font-semibold text-stone-100">
                  E-mail
                  <input
                    type="email"
                    className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-stone-950/70 px-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-pink-400 focus:ring-4 focus:ring-pink-300/30"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jij@example.com"
                  />
                </label>

                <label className="block text-xs font-semibold text-stone-100 sm:col-span-2">
                  Telefoon optioneel
                  <input
                    className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-stone-950/70 px-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-pink-400 focus:ring-4 focus:ring-pink-300/30"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+31 6 12 34 56 78"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-stone-100">
                  Onderwerp
                  <select
                    className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-stone-950/70 px-3 text-sm text-white outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-300/30"
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

                <label className="block text-xs font-semibold text-stone-100">
                  Terugbelverzoek
                  <select
                    className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-stone-950/70 px-3 text-sm text-white outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-300/30"
                    value={callOk ? "Ja, graag" : "Niet nodig"}
                    onChange={(e) => setCallOk(e.target.value === "Ja, graag")}
                  >
                    <option>Ja, graag</option>
                    <option>Niet nodig</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs font-semibold text-stone-100">
                Bericht
                <textarea
                  rows={5}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-stone-950/70 px-3 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-pink-400 focus:ring-4 focus:ring-pink-300/30"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Vertel kort waar we je mee kunnen helpen…"
                />
              </label>

              <div aria-live="polite">
                {msg && (
                  <p className="rounded-xl border border-rose-300/30 bg-rose-400/15 px-3 py-2 text-sm font-medium text-rose-100">
                    {msg}
                  </p>
                )}

                {ok && (
                  <p className="rounded-xl border border-emerald-300/30 bg-emerald-400/15 px-3 py-2 text-sm font-medium text-emerald-100">
                    Bedankt! Je bericht is verstuurd. We nemen snel contact op.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 text-xs text-stone-300">
                  <input
                    type="checkbox"
                    checked={callOk}
                    onChange={(e) => setCallOk(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-stone-950 text-pink-600 focus:ring-pink-300"
                  />
                  Je mag me bellen als er vragen zijn
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold shadow-lg transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${ctaClass}`}
                >
                  {submitting ? "Versturen…" : "Verstuur bericht"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}