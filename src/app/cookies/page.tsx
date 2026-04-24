// PATH: src/app/cookies/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookiebeleid | D-EscapeRoom",
  description:
    "Lees welke cookies D-EscapeRoom gebruikt en hoe je jouw voorkeuren kunt beheren.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-7">
      <h2 className="text-xl font-black tracking-tight text-rose-300 sm:text-2xl">
        {title}
      </h2>

      <div className="mt-4 space-y-4 text-sm leading-7 text-stone-200 sm:text-base">
        {children}
      </div>
    </section>
  );
}

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <section className="relative overflow-hidden px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.16),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.35)_0%,rgba(12,10,9,0.96)_100%)]" />
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
              COOKIES
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-rose-300 sm:text-5xl lg:text-6xl">
              Cookiebeleid
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
              Op deze pagina leggen we uit welke cookies wij gebruiken en hoe je
              jouw voorkeuren kunt beheren.
            </p>
          </div>

          <div className="mt-10 space-y-6">
            <Section title="1. Wat zijn cookies?">
              <p>
                Cookies zijn kleine tekstbestanden die op je apparaat worden
                geplaatst wanneer je onze website bezoekt. Ze zorgen ervoor dat
                de website goed werkt en kunnen helpen om de website te
                verbeteren.
              </p>
            </Section>

            <Section title="2. Noodzakelijke cookies">
              <p>
                Deze cookies zijn nodig om de website goed en veilig te laten
                functioneren. Ze worden altijd geplaatst en vereisen geen aparte
                toestemming.
              </p>
              <p>
                Voorbeelden zijn cookies voor beveiliging, cookievoorkeuren en
                basisfunctionaliteit van de website.
              </p>
            </Section>

            <Section title="3. Analytische cookies">
              <p>
                Met analytische cookies meten we hoe bezoekers onze website
                gebruiken. Daarmee kunnen we pagina’s verbeteren en problemen
                sneller herkennen.
              </p>
              <p>
                Analytische cookies worden alleen geplaatst wanneer je hiervoor
                toestemming geeft.
              </p>
            </Section>

            <Section title="4. Marketing cookies">
              <p>
                Marketing cookies kunnen worden gebruikt voor advertenties,
                remarketing of het meten van campagnes.
              </p>
              <p>
                Op dit moment gebruiken wij deze alleen wanneer dat technisch is
                ingericht en nadat je hiervoor toestemming hebt gegeven.
              </p>
            </Section>

            <Section title="5. Cookievoorkeuren aanpassen">
              <p>
                Je kunt jouw cookievoorkeuren aanpassen door cookies in je
                browser te verwijderen. Bij je volgende bezoek tonen wij opnieuw
                de cookiemelding.
              </p>
              <p>
                Je kunt cookies ook beheren via de instellingen van je browser.
              </p>
            </Section>

            <Section title="6. Derde partijen">
              <p>
                Voor betalingen, hosting, e-mail en statistieken kunnen externe
                partijen worden gebruikt. Deze partijen verwerken gegevens
                volgens hun eigen voorwaarden en privacybeleid.
              </p>
            </Section>

            <Section title="7. Contact">
              <p>
                Heb je vragen over cookies of privacy? Neem contact op via
                info@d-escaperoom.com.
              </p>
            </Section>

            <div className="pt-4 text-center text-sm text-stone-500">
              Laatst bijgewerkt: april 2026
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}