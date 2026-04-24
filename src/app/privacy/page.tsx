// PATH: src/app/privacy/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacybeleid | D-EscapeRoom",
  description:
    "Lees hoe D-EscapeRoom omgaat met persoonsgegevens, boekingsgegevens, betalingen en cookies.",
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

export default function PrivacyPage() {
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
              PRIVACY
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-rose-300 sm:text-5xl lg:text-6xl">
              Privacybeleid
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
              Wij gaan zorgvuldig om met jouw persoonsgegevens en gebruiken
              gegevens alleen wanneer dat nodig is voor onze dienstverlening.
            </p>
          </div>

          <div className="mt-10 space-y-6">
            <Section title="1. Wie zijn wij">
              <p>
                D-EscapeRoom is gevestigd aan Nijverheidsweg-Noord 42, 3812 PM
                Amersfoort, Nederland.
              </p>

              <p>
                E-mail: info@d-escaperoom.com <br />
                Telefoon: +31 (0)6 83 85 33 73
              </p>
            </Section>

            <Section title="2. Welke gegevens verzamelen wij">
              <p>Wij kunnen onder andere de volgende gegevens verwerken:</p>

              <ul className="list-disc space-y-2 pl-5">
                <li>Naam</li>
                <li>E-mailadres</li>
                <li>Telefoonnummer</li>
                <li>Adresgegevens (indien nodig)</li>
                <li>Boekingsinformatie</li>
                <li>Betaalstatus</li>
                <li>Communicatie via contactformulier of e-mail</li>
                <li>Technische gegevens zoals IP-adres en browsertype</li>
              </ul>
            </Section>

            <Section title="3. Waarom wij gegevens gebruiken">
              <p>Wij gebruiken persoonsgegevens voor:</p>

              <ul className="list-disc space-y-2 pl-5">
                <li>Het verwerken van boekingen</li>
                <li>Het versturen van bevestigingen en updates</li>
                <li>Klantenservice en contactverzoeken</li>
                <li>Betalingsverwerking</li>
                <li>Fraudepreventie en beveiliging</li>
                <li>Verbetering van onze website en dienstverlening</li>
              </ul>
            </Section>

            <Section title="4. Betalingen">
              <p>
                Betalingen verlopen via externe betaalproviders zoals Mollie.
              </p>

              <p>
                Wanneer je betaalt, worden noodzakelijke persoonsgegevens direct
                verwerkt door deze betaalprovider volgens hun eigen
                privacyvoorwaarden.
              </p>
            </Section>

            <Section title="5. Cookies">
              <p>
                Onze website gebruikt cookies en vergelijkbare technieken om de
                website goed te laten functioneren en om statistieken te meten.
              </p>

              <p>
                Waar nodig vragen wij toestemming voor analytische of marketing
                cookies.
              </p>
            </Section>

            <Section title="6. Bewaartermijnen">
              <p>
                Wij bewaren persoonsgegevens niet langer dan noodzakelijk is voor
                het doel waarvoor deze zijn verzameld of zolang wettelijk
                verplicht.
              </p>
            </Section>

            <Section title="7. Delen met derden">
              <p>
                Wij verkopen jouw gegevens nooit aan derden.
              </p>

              <p>
                Wij delen gegevens uitsluitend wanneer dat nodig is voor onze
                dienstverlening, bijvoorbeeld met:
              </p>

              <ul className="list-disc space-y-2 pl-5">
                <li>Betaalproviders</li>
                <li>Hostingpartijen</li>
                <li>E-maildiensten</li>
                <li>Partnerlocaties indien relevant voor jouw boeking</li>
              </ul>
            </Section>

            <Section title="8. Beveiliging">
              <p>
                Wij nemen passende technische en organisatorische maatregelen om
                persoonsgegevens te beschermen tegen verlies, misbruik of
                onbevoegde toegang.
              </p>
            </Section>

            <Section title="9. Jouw rechten">
              <p>Je hebt het recht om:</p>

              <ul className="list-disc space-y-2 pl-5">
                <li>Jouw gegevens in te zien</li>
                <li>Gegevens te laten corrigeren</li>
                <li>Gegevens te laten verwijderen</li>
                <li>Bezwaar te maken tegen verwerking</li>
                <li>Gegevens over te dragen</li>
              </ul>

              <p>
                Verzoeken kun je sturen naar info@d-escaperoom.com.
              </p>
            </Section>

            <Section title="10. Wijzigingen">
              <p>
                Wij mogen dit privacybeleid aanpassen wanneer wetgeving of onze
                dienstverlening verandert. De meest actuele versie staat altijd
                op deze pagina.
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