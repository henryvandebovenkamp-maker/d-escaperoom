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

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-[1.35rem] border border-white/10 bg-black/22 p-5 shadow-xl shadow-black/15 backdrop-blur-md sm:p-6",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function FieldLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={[
        "mb-1.5 block text-[11px] font-medium text-stone-200",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

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

  const canSubmit =
    fullName.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(email) &&
    message.trim().length >= 3;

  const submitClass =
    variant === "partner"
      ? "bg-white text-stone-950 hover:bg-stone-100 focus:ring-white/30"
      : "bg-pink-600 text-white hover:bg-pink-700 focus:ring-pink-300/40";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setMsg(null);
    setOk(false);

    if (!canSubmit) {
      setMsg(
        "Controleer je invoer: naam, e-mailadres en bericht zijn verplicht."
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
        "relative overflow-hidden bg-stone-950 py-16 text-white sm:py-20",
        className,
      ].join(" ")}
    >
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,114,182,0.08),rgba(251,191,36,0.05)_40%,rgba(255,255,255,0.02)_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
            CONTACT
          </span>

          <h2
            id="contact-title"
            className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl"
          >
            {title}
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-stone-200/80 sm:text-base">
            {subtitle}
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel>
            <div className="mb-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200/90">
                Snel geregeld
              </div>

              <h3 className="mt-2 text-2xl font-black tracking-tight text-white">
                Laat ons weten
                <span className="block text-rose-300">waar we je mee helpen</span>
              </h3>
            </div>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-base shadow-[0_1px_0_0_rgba(255,255,255,0.04)]"
                >
                  💬
                </span>
                <div>
                  <div className="text-sm font-semibold text-white">
                    Algemene vraag
                  </div>
                  <p className="mt-1 text-sm leading-6 text-stone-200/80">
                    Stel je vraag over de ervaring, beschikbaarheid of praktische
                    zaken.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-base shadow-[0_1px_0_0_rgba(255,255,255,0.04)]"
                >
                  📞
                </span>
                <div>
                  <div className="text-sm font-semibold text-white">
                    Terugbelverzoek
                  </div>
                  <p className="mt-1 text-sm leading-6 text-stone-200/80">
                    Laat weten of je liever teruggebeld wordt, dan nemen we contact
                    met je op.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-base shadow-[0_1px_0_0_rgba(255,255,255,0.04)]"
                >
                  🤝
                </span>
                <div>
                  <div className="text-sm font-semibold text-white">
                    Partner of consument
                  </div>
                  <p className="mt-1 text-sm leading-6 text-stone-200/80">
                    Zowel hondenscholen als bezoekers kunnen hier direct hun vraag
                    stellen.
                  </p>
                </div>
              </li>
            </ul>

            <div className="mt-5 rounded-[1rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm leading-7 text-stone-200/80">
                We reageren meestal binnen één werkdag. Heb je een concrete vraag
                over boeken of partner worden, zet dat dan even in je bericht.
              </p>
            </div>
          </Panel>

          <Panel className="text-left">
            <form
              onSubmit={handleSubmit}
              noValidate
              aria-label="Contactformulier"
              aria-busy={submitting}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label>
                  <FieldLabel>Volledige naam</FieldLabel>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="bijv. Jamie de Vries"
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition placeholder:text-stone-400 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                  />
                </label>

                <label>
                  <FieldLabel>E-mailadres</FieldLabel>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jij@example.com"
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition placeholder:text-stone-400 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                  />
                </label>

                <label className="sm:col-span-2">
                  <FieldLabel>Telefoon (optioneel)</FieldLabel>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+31 6 12 34 56 78"
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition placeholder:text-stone-400 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label>
                  <FieldLabel>Onderwerp</FieldLabel>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                  >
                    <option className="text-stone-900">Algemene vraag</option>
                    <option className="text-stone-900">Partner worden</option>
                    <option className="text-stone-900">
                      Beschikbaarheid & agenda
                    </option>
                    <option className="text-stone-900">
                      Prijs & aanbetaling
                    </option>
                    <option className="text-stone-900">Overig</option>
                  </select>
                </label>

                <label>
                  <FieldLabel>Terugbelverzoek</FieldLabel>
                  <select
                    value={callOk ? "Ja, graag" : "Niet nodig"}
                    onChange={(e) => setCallOk(e.target.value === "Ja, graag")}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                  >
                    <option className="text-stone-900">Ja, graag</option>
                    <option className="text-stone-900">Niet nodig</option>
                  </select>
                </label>
              </div>

              <label>
                <FieldLabel>Bericht</FieldLabel>
                <textarea
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Vertel kort waar we je mee helpen…"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-sm text-white outline-none transition placeholder:text-stone-400 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/40"
                />
              </label>

              <div aria-live="polite" className="space-y-2">
                {msg && (
                  <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-100">
                    {msg}
                  </p>
                )}

                {ok && (
                  <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100">
                    Bedankt! Je bericht is verstuurd. We nemen snel contact op.
                  </p>
                )}
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-stone-300">
                <input
                  type="checkbox"
                  checked={callOk}
                  onChange={(e) => setCallOk(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-pink-600 focus:ring-pink-300/40"
                />
                Je mag me bellen als er vragen zijn
              </label>

              <button
                type="submit"
                disabled={submitting}
                className={[
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
                  submitClass,
                ].join(" ")}
              >
                {submitting ? "Versturen…" : "Verstuur bericht"}
              </button>
            </form>
          </Panel>
        </div>
      </div>
    </section>
  );
}