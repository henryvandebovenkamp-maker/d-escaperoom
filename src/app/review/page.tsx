// PATH: src/app/review/page.tsx
import { MessageCircleHeart, Star } from "lucide-react";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function ReviewPage() {
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
            Laat een korte review achter over The Stolen Snack. Daarmee help je
            andere baasjes enorm.
          </p>

          <form
            action="/review/bedankt"
            method="GET"
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-bold text-stone-200"
              >
                Naam
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Bijvoorbeeld: Lisa"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-stone-500 focus:border-amber-300/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-stone-200">
                Beoordeling
              </label>
              <div className="flex gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-6 w-6 fill-amber-400" />
                ))}
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
                name="review"
                required
                rows={7}
                placeholder="Bijvoorbeeld: Superleuk om samen met onze hond puzzels op te lossen..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-stone-500 focus:border-amber-300/60"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-rose-500 px-6 py-4 text-sm font-black text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-400"
            >
              Verstuur review
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </main>
  );
}