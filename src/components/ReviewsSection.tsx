// PATH: src/components/ReviewsSection.tsx
import prisma from "@/lib/prisma";

const fallbackReviews = [
  {
    name: "Sanne",
    dogName: "Bowie",
    rating: 5,
    message:
      "Wat een leuke ervaring! Onze hond vond het geweldig om echt mee te mogen zoeken. De kinderen waren achteraf ook helemaal enthousiast.",
  },
  {
    name: "Mark",
    dogName: "Nala",
    rating: 4,
    message:
      "Heel origineel concept en leuk opgezet. Sommige puzzels waren verrassend lastig, maar juist daardoor erg leuk.",
  },
  {
    name: "Kevin",
    dogName: "Luna",
    rating: 5,
    message:
      "Echt knap hoe de western sfeer is neergezet. Je stapt helemaal een andere wereld binnen en onze hond deed fanatiek mee.",
  },
];

function Stars({ rating }: { rating: number }) {
  const safeRating = Math.max(1, Math.min(5, Math.round(rating)));

  return (
    <div
      className="flex items-center gap-1 text-amber-300"
      aria-label={`${safeRating} van de 5 sterren`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} aria-hidden="true" className="text-base sm:text-lg">
          {index < safeRating ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

export default async function ReviewsSection() {
  const reviews = await prisma.review.findMany({
    where: {
      isPublished: true,
      consent: true,
    },
    select: {
      id: true,
      name: true,
      dogName: true,
      rating: true,
      message: true,
      partner: {
        select: {
          name: true,
          city: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 3,
  });

  const items = reviews.length > 0 ? reviews : fallbackReviews;

  return (
    <section
      id="reviews"
      className="relative overflow-hidden bg-stone-950 py-14 text-white sm:py-18 lg:py-20"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.12),transparent_36%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
            REVIEWS
          </span>

          <h2 className="mt-5 text-3xl font-black tracking-tight text-rose-300 sm:text-5xl lg:text-6xl">
            Wat baasjes zeggen
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-stone-200/90 sm:text-base">
            Ervaringen van hondenbaasjes die samen met hun hond The Stolen Snack
            hebben gespeeld.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:gap-5 md:grid-cols-3">
          {items.map((review, index) => (
            <article
              key={"id" in review ? review.id : index}
              className="group relative flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.06] sm:p-6"
            >
              <div
                aria-hidden
                className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.10),transparent_42%)]" />
              </div>

              <div className="relative flex h-full flex-col">
                <Stars rating={review.rating} />

                <p className="mt-4 flex-1 text-sm leading-7 text-stone-100/95 sm:text-[15px] sm:leading-8">
                  “{review.message}”
                </p>

                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-base font-bold text-white">
                    {review.name}
                    {review.dogName ? ` met ${review.dogName}` : ""}
                  </p>

                  {"partner" in review && review.partner && (
                    <p className="mt-1 text-xs text-stone-400">
                      {review.partner.name}
                      {review.partner.city ? ` — ${review.partner.city}` : ""}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-9 flex justify-center">
          <a
            href="/review"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-pink-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-pink-950/30 transition hover:scale-[1.02] hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-300 sm:w-auto"
          >
            Schrijf een review
          </a>
        </div>
      </div>
    </section>
  );
}