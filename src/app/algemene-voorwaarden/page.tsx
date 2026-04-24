// PATH: src/app/algemene-voorwaarden/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Algemene voorwaarden | D-EscapeRoom",
  description:
    "Lees de algemene voorwaarden van D-EscapeRoom voor boekingen, betalingen, deelname en aansprakelijkheid.",
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

export default function TermsPage() {
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
              JURIDISCH
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-rose-300 sm:text-5xl lg:text-6xl">
              Algemene voorwaarden
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
              Transparante afspraken voor boekingen, deelname en gebruik van
              onze diensten.
            </p>
          </div>

          <div className="mt-10 space-y-6">
            <Section title="1. Identiteit ondernemer">
              <p>
                D-EscapeRoom is gevestigd aan Nijverheidsweg-Noord 42, 3812 PM
                Amersfoort, Nederland.
              </p>
              <p>
                E-mail: info@d-escaperoom.com <br />
                Telefoon: +31 (0)6 83 85 33 73
              </p>
            </Section>

            <Section title="2. Toepasselijkheid">
              <p>
                Deze voorwaarden zijn van toepassing op alle reserveringen,
                boekingen, offertes en deelname aan activiteiten van
                D-EscapeRoom.
              </p>
              <p>
                Door een boeking te plaatsen ga je akkoord met deze algemene
                voorwaarden.
              </p>
            </Section>

            <Section title="3. Reserveringen en betalingen">
              <p>
                Boekingen verlopen via onze website of via een aangesloten
                partnerlocatie.
              </p>
              <p>
                Bij reservering kan een aanbetaling gevraagd worden. De
                resterende betaling kan op locatie plaatsvinden indien vermeld.
              </p>
              <p>
                Een reservering is definitief zodra de betaling of aanbetaling
                succesvol is ontvangen.
              </p>
            </Section>

            <Section title="4. Prijzen">
              <p>
                Alle prijzen op de website zijn inclusief btw, tenzij anders
                vermeld.
              </p>
              <p>
                Kennelijke fouten of vergissingen in prijzen of aanbiedingen
                binden D-EscapeRoom niet.
              </p>
            </Section>

            <Section title="5. Annuleren en verplaatsen">
              <p>
                Tot 48 uur voor aanvang kan een boeking kosteloos worden
                verplaatst (op basis van beschikbaarheid).
              </p>
              <p>
                Bij annulering binnen 48 uur voor aanvang kan de aanbetaling
                vervallen.
              </p>
              <p>
                Bij niet verschijnen (no-show) bestaat geen recht op restitutie.
              </p>
            </Section>

            <Section title="6. Deelname met hond(en)">
              <p>
                Deelnemers zijn verantwoordelijk voor hun hond(en) gedurende het
                gehele bezoek.
              </p>
              <p>
                Honden dienen sociaal en beheersbaar te zijn in een nieuwe
                omgeving.
              </p>
              <p>
                Deelname met loopse teefjes is niet toegestaan tenzij vooraf
                schriftelijk anders overeengekomen.
              </p>
              <p>
                Maximaal toegestaan aantal honden per boeking kan per locatie
                verschillen en wordt tijdens het boekingsproces vermeld.
              </p>
            </Section>

            <Section title="7. Veiligheid en huisregels">
              <p>
                Aanwijzingen van medewerkers of locatiebeheerders dienen direct
                opgevolgd te worden.
              </p>
              <p>
                D-EscapeRoom mag deelname weigeren of beëindigen bij gevaarlijk,
                storend of respectloos gedrag zonder recht op restitutie.
              </p>
            </Section>

            <Section title="8. Aansprakelijkheid">
              <p>
                Deelname geschiedt op eigen risico.
              </p>
              <p>
                D-EscapeRoom is niet aansprakelijk voor indirecte schade,
                gevolgschade, verlies van eigendommen of schade veroorzaakt door
                deelnemer of hond.
              </p>
              <p>
                Iedere aansprakelijkheid is beperkt tot het bedrag dat voor de
                betreffende boeking is betaald, tenzij sprake is van opzet of
                grove nalatigheid.
              </p>
            </Section>

            <Section title="9. Overmacht">
              <p>
                Bij overmacht, waaronder storingen, ziekte, extreme
                weersomstandigheden of onvoorziene omstandigheden, mag
                D-EscapeRoom een reservering verplaatsen of annuleren.
              </p>
            </Section>

            <Section title="10. Privacy">
              <p>
                Persoonsgegevens worden verwerkt volgens ons privacybeleid.
              </p>
            </Section>

            <Section title="11. Toepasselijk recht">
              <p>
                Op deze voorwaarden is Nederlands recht van toepassing.
                Geschillen worden voorgelegd aan de bevoegde rechter in
                Nederland.
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