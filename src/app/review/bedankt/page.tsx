// PATH: src/app/review/bedankt/page.tsx
import Link from "next/link";
import { ArrowRight, CheckCircle2, Star } from "lucide-react";

import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import CopyReviewButton from "../../../components/CopyReviewButton";

const GOOGLE_REVIEW_URL = "https://g.page/r/CSDO11-iQ8OcEBM/review";

type Props = {
  searchParams?: Promise<{
    review?: string;
    name?: string;
  }>;
};

export default async function ReviewThanksPage({ searchParams }: Props) {
  const params = await searchParams;

  const reviewText =
    params?.review?.trim() ||
    "Wij hebben een fantastische ervaring gehad bij D-EscapeRoom. Superleuk om samen met onze hond puzzels op te lossen!";

  const name = params?.name?.trim();

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Header />

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[34px] border border-amber-200/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_34%),linear-gradient(135deg,#1c1917,#0c0a09)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Review ontvangen
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
            Dankjewel voor je review 🤠
          </h1>

          <p className="mt-4 text-base leading-7 text-stone-300 sm:text-lg">
            Supertof dat jullie de tijd nemen om D-EscapeRoom te helpen. Wil je
            ons nóg meer helpen? Plaats je review dan ook op Google.
          </p>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.07] p-5">
            <div className="flex items-center gap-1 text-amber-400">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="h-5 w-5 fill-amber-400" />
              ))}
            </div>

            <p className="mt-4 text-sm leading-7 text-stone-200">
              “{reviewText}”
            </p>

            {name ? (
              <p className="mt-4 text-sm font-black text-white">— {name}</p>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CopyReviewButton text={reviewText} />

            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-400 sm:w-auto"
            >
              Plaats ook op Google
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <Link
              href="/"
              className="text-sm font-bold text-amber-200 underline-offset-4 hover:underline"
            >
              Terug naar homepage
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}