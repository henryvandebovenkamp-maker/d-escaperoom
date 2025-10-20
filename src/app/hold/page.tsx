import Image from "next/image";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "D-EscapeRoom — We zijn bijna terug",
  robots: { index: false, follow: false },
};

export default function HoldPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      <header className="relative w-full h-56 sm:h-72">
        <Image
          src="/images/header-foto.png"
          alt="D-EscapeRoom — The Missing Snack"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-50/90 to-transparent" />
      </header>

      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
          We zetten de site heel even on hold
        </h1>
        <p className="text-lg leading-relaxed mb-6">
          <span className="font-medium">Speel jij binnenkort onze escape room?</span>{" "}
          Houd onze site in de gaten – we zijn achter de schermen bezig met de laatste details.
        </p>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-2">Voor hondenscholen</h2>
          <p className="mb-4">
            Ben jij een hondenschool en wil je de escape room op jouw locatie aanbieden?
            Neem gerust contact op.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:info@d-escaperoom.com"
              className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-base font-medium bg-pink-600 text-white hover:bg-pink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-pink-600"
            >
              Mail: info@d-escaperoom.com
            </a>
            <a
              href="tel:+31683853373"
              className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-base font-medium border border-stone-300 hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-stone-400"
            >
              Bel: 06-83853373
            </a>
          </div>
        </div>

        <p className="text-sm text-stone-600">
          Tip: volg ons binnenkort voor updates en boekingsdata.
        </p>
      </section>

      <footer className="mt-auto border-t border-stone-200 bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-stone-600">
          © {new Date().getFullYear()} D-EscapeRoom — “The Missing Snack”
        </div>
      </footer>
    </main>
  );
}
