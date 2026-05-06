// PATH: src/app/review/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageCircleHeart, Star } from "lucide-react";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function ReviewPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [dogName, setDogName] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [rating, setRating] = React.useState(5);
  const [consent, setConsent] = React.useState(true);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/reviews/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          dogName: dogName.trim(),
          rating,
          message: message.trim(),
          consent,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Kon review niet versturen.");
      }

      router.push(`/review/bedankt?review=${encodeURIComponent(message)}`);
    } catch (err: any) {
      setError(err?.message || "Er ging iets mis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Header />

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-[34px] border border-amber-200/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_34%),linear-gradient(135deg,#1c1917,#0c0a09)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-amber-200">
            <MessageCircleHeart className="h-4 w-4" />
            Review
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
            Hoe was jullie avontuur? 🤠
          </h1>

          <p className="mt-4 text-base leading-7 text-stone-300 sm:text-lg">
            Laat een korte review achter over The Stolen Snack. Gebruik het
            e-mailadres waarmee je hebt geboekt, zodat we weten dat jullie echt
            hebben gespeeld.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-bold text-stone-200"
              >
                E-mailadres van je boeking
              </label>

              <input
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Bijvoorbeeld: lisa@example.com"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-stone-500 focus:border-amber-300/60"
              />

              <p className="mt-2 text-xs leading-5 text-stone-400">
                We gebruiken dit alleen om te controleren of er een gespeelde
                boeking bij dit e-mailadres hoort.
              </p>
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-bold text-stone-200"
              >
                Naam
              </label>

              <input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder="Bijvoorbeeld: Lisa"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-stone-500 focus:border-amber-300/60"
              />
            </div>

            <div>
              <label
                htmlFor="dogName"
                className="mb-2 block text-sm font-bold text-stone-200"
              >
                Naam hond (optioneel)
              </label>

              <input
                id="dogName"
                value={dogName}
                onChange={(e) => setDogName(e.target.value)}
                type="text"
                placeholder="Bijvoorbeeld: Bowie"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-stone-500 focus:border-amber-300/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-stone-200">
                Beoordeling
              </label>

              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  const active = value <= rating;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="rounded-lg transition hover:scale-110 focus:outline-none focus:ring-4 focus:ring-amber-300/30"
                      aria-label={`${value} van de 5 sterren`}
                      aria-pressed={active}
                    >
                      <Star
                        className={`h-7 w-7 ${
                          active
                            ? "fill-amber-400 text-amber-400"
                            : "text-stone-500"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="review"
                className="mb-2 block text-sm font-bold text-stone-200"
              >
                Jouw review
              </label>

              <textarea
                id="review"
                required
                rows={7}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Bijvoorbeeld: Superleuk om samen met onze hond puzzels op te lossen..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-stone-500 focus:border-amber-300/60"
              />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-stone-300">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />

              <span>
                Ik geef toestemming om mijn review op de website van
                D-EscapeRoom te tonen.
              </span>
            </label>

            {error && (
              <div className="rounded-2xl border border-rose-300/30 bg-rose-400/15 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-rose-500 px-6 py-4 text-sm font-black text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Review controleren..." : "Verstuur review"}
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </main>
  );
}