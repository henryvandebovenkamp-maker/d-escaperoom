// PATH: src/components/ContactWidget.tsx
"use client";

import * as React from "react";
import Image from "next/image";

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
  const ctaClass =
    isPartner
      ? "bg-black hover:bg-black/90 focus:ring-stone-400"
      : "bg-pink-600 hover:bg-pink-700 focus:ring-pink-300";

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
      setMsg("Controleer je invoer: naam (≥2), e-mail en bericht (≥3 tekens) zijn verplicht.");
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
          throw new Error(json?.error || "Versturen mislukt. Probeer het nog een keer.");
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
        // FIX: sectie krijgt hetzelfde zachte grijs als de pagina en verbergt randen
        "relative isolate overflow-hidden bg-stone-100 py-16 sm:py-20",
        className,
      ].join(" ")}
    >
      {/* FIX: dotted texture over de héle sectie, geen mask dat randen blootlegt */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] [background-size:12px_12px]"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-stone-200 shadow-lg">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-white/70 via-rose-50/50 to-amber-50/40"
          />
          <div className="relative backdrop-blur-sm">
            {/* TOPBAND */}
            <div className="relative w-full overflow-hidden h-14 sm:h-16 lg:h-20">
              <div className="flex h-full w-full items-start justify-center pt-4 sm:pt-5">
                <Image
                  src="/images/contact-header.png"
                  alt=""
                  width={2304}
                  height={224}
                  className="h-[90%] w-auto object-contain mix-blend-multiply drop-shadow"
                  priority={false}
                  style={{ mixBlendMode: "multiply" }}
                />
              </div>
              <h2 id="contact-title" className="sr-only">
                {title}
              </h2>
              <p className="sr-only">{subtitle}</p>
            </div>

            {/* BODY */}
            <div className="px-4 pb-8 sm:px-6 lg:px-8">
              <form
                onSubmit={handleSubmit}
                noValidate
                aria-label="Contactformulier"
                aria-busy={submitting}
                className="mx-auto max-w-2xl"
              >
                <article className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white/80 p-4 shadow-sm focus-within:ring-2 focus-within:ring-pink-400/60 focus-within:ring-offset-2 focus-within:ring-offset-white">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-100"
                    style={{
                      background:
                        "linear-gradient(120deg, rgba(244,114,182,0.10), rgba(244,63,94,0.06) 30%, rgba(214,211,209,0.06) 60%)",
                    }}
                  />

                  <div className="relative z-10 space-y-3">
                    <h3 className="text-sm font-semibold text-stone-900">Stuur een bericht</h3>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="block text-xs font-medium text-stone-800">
                        Volledige naam
                        <input
                          className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white/90 px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="bijv. Jamie de Vries"
                        />
                      </label>

                      <label className="block text-xs font-medium text-stone-800">
                        E-mail
                        <input
                          type="email"
                          className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white/90 px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jij@example.com"
                        />
                      </label>

                      <label className="block text-xs font-medium text-stone-800 sm:col-span-2">
                        Telefoon (optioneel)
                        <input
                          className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white/90 px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
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
                          className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white/90 px-2 text-sm outline-none transition focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
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
                          className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white/90 px-2 text-sm outline-none transition focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
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
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white/90 px-3 py-2 text-sm outline-none transition placeholder:text-stone-400 focus:border-pink-600 focus:ring-2 focus:ring-pink-300"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Vertel kort waar we je mee helpen…"
                      />
                    </label>

                    <div aria-live="polite">
                      {msg && (
                        <p className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                          {msg}
                        </p>
                      )}
                      {ok && (
                        <p className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                          Bedankt! Je bericht is verstuurd. We nemen snel contact op.
                        </p>
                      )}
                    </div>

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
                        disabled={submitting}
                        className={`inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white shadow focus:outline-none focus:ring-4 disabled:opacity-60 ${ctaClass}`}
                      >
                        {submitting ? "Versturen…" : "Verstuur bericht"}
                      </button>
                    </div>
                  </div>
                </article>
              </form>
            </div>
            {/* /BODY */}
          </div>
        </div>
      </div>
    </section>
  );
}
