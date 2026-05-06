// PATH: src/app/review/bedankt/page.tsx
import Link from "next/link";
import { CheckCircle2, ExternalLink, Star } from "lucide-react";

import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import CopyReviewButton from "../../../components/CopyReviewButton";

const GOOGLE_REVIEW_URL = "https://g.page/r/CSDO11-iQ8OcEBM/review";

type Props = {
  searchParams: Promise<{
    review?: string;
  }>;
};

export default async function ReviewThanksPage({ searchParams }: Props) {
  const params = await searchParams;
  const reviewText = params.review ? decodeURIComponent(params.review) : "";

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Header />

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-[34px] border border-amber-200/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_34%),linear-gradient(135deg,#1c1917,#0c0a09)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Bedankt
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
            Review ontvangen 🤠
          </h1>

          <p className="mt-4 text-base leading-7 text-stone-300 sm:text-lg">
            Super bedankt voor je review. Je helpt ons enorm om meer baasjes en
            honden kennis te laten maken met The Stolen Snack.
          </p>

          <div className="mt-8 rounded-[26px] border border-white/10 bg-white/5 p-5">
            <div className="flex gap-1 text-amber-400">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="h-5 w-5 fill-amber-400" />
              ))}
            </div>

            <h2 className="mt-4 text-xl font-black text-white">
              Help je ons ook op Google?
            </h2>

            <p className="mt-3 text-sm leading-7 text-stone-300">
              Wil je ons extra helpen? Plaats je review dan ook op Google. Dat
              helpt enorm bij onze vindbaarheid.
            </p>

            {reviewText && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                  Jouw reviewtekst
                </p>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-100">
                  “{reviewText}”
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {reviewText && <CopyReviewButton text={reviewText} />}

              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-300 sm:w-auto"
              >
                Plaats ook op Google
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              Terug naar de website
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}