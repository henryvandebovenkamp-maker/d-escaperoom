"use client";

import * as React from "react";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 prose prose-stone">
      <h1>Privacyverklaring</h1>
      <p><em>Laatst bijgewerkt: september 2025</em></p>

      <p>
        Deze privacyverklaring is van toepassing op de verwerking van
        persoonsgegevens door <strong>D-EscapeRoom</strong>, gevestigd aan
        Lakenveld 84, 4128 CN Lexmond (Nederland). Vragen?{" "}
        <a href="mailto:info@d-escaperoom.com">info@d-escaperoom.com</a> of{" "}
        <a href="tel:+31683853373">+31 (0)6 83 85 33 73</a>.
      </p>

      <h2>1. Verwerkingsdoelen en grondslagen</h2>
      <ul>
        <li>
          <strong>Boekingen &amp; uitvoering overeenkomst</strong> (art. 6(1)(b) AVG):
          naam, e-mail, telefoon, partner/hondenschool, gekozen tijdslot, speler- en hondgegevens
          (bv. allergieën indien vrijwillig opgegeven).
        </li>
        <li>
          <strong>Betalingen (aanbetaling via Mollie)</strong> (art. 6(1)(b)/(c)):
          betaalstatus, betaalreferentie, bedrag, valuta.
        </li>
        <li>
          <strong>Facturatie &amp; administratie</strong> (art. 6(1)(c)):
          wettelijk verplichte bewaartermijnen.
        </li>
        <li>
          <strong>Klantenservice</strong> (art. 6(1)(f)):
          vragen/antwoorden per e-mail/telefoon.
        </li>
        <li>
          <strong>Marketing (optioneel)</strong> (art. 6(1)(a)/(f)):
          nieuws/updates <em>alleen</em> met toestemming of bij bestaande klantrelatie. Afmelden kan altijd.
        </li>
      </ul>

      <h2>2. Categorieën gegevens</h2>
      <ul>
        <li>Identificatie &amp; contact: naam, e-mail, telefoon.</li>
        <li>Boekingsgegevens: partner, slot, spelers (max 3), hondnaam, aandachtspunten.</li>
        <li>Betaalgegevens: transactiereferentie, status (geen volledige kaartgegevens bij ons).</li>
        <li>Technisch: IP, device, cookie-ID’s (zie <a href="/cookies">Cookiebeleid</a>).</li>
      </ul>

      <h2>3. Ontvangers / verwerkers</h2>
      <ul>
        <li><strong>Mollie B.V.</strong> – betaalprovider (aanbetalingen).</li>
        <li><strong>TransIP (SMTP)</strong> – e-mailafhandeling (login codes / bevestigingen).</li>
        <li><strong>Hosting</strong> – applicatie &amp; database (Prisma ORM).</li>
        <li>Partner-hondenschool – alleen noodzakelijke boekingsdetails voor uitvoering.</li>
      </ul>

      <h2>4. Doorgifte buiten de EER</h2>
      <p>
        Indien doorgifte buiten de EER plaatsvindt, zorgen we voor passende waarborgen
        (bijv. EU-modelcontractbepalingen).
      </p>

      <h2>5. Bewaartermijnen</h2>
      <ul>
        <li>Boekings- en betalingsadministratie: <strong>7 jaar</strong> (fiscaal).</li>
        <li>Klantenservice: tot <strong>2 jaar</strong> na afhandeling.</li>
        <li>Marketing: tot intrekking van toestemming / uitschrijving.</li>
      </ul>

      <h2>6. Jouw rechten</h2>
      <p>
        Recht op inzage, rectificatie, verwijdering, beperking, overdraagbaarheid en bezwaar.
        Trek toestemming in via de link in e-mails of mail ons. Je kunt een klacht indienen bij
        de Autoriteit Persoonsgegevens.
      </p>

      <h2>7. Beveiliging</h2>
      <p>
        We nemen passende technische en organisatorische maatregelen, o.a. versleuteling,
        toegangsbeheer en pseudonimisering waar mogelijk.
      </p>

      <h2>8. Contact</h2>
      <p>
        <strong>D-EscapeRoom</strong><br />
        Lakenveld 84, 4128 CN Lexmond, Nederland<br />
        KvK: 12345678 · BTW: NL123456789B01<br />
        <a href="mailto:info@d-escaperoom.com">info@d-escaperoom.com</a> ·{" "}
        <a href="tel:+31683853373">+31 (0)6 83 85 33 73</a>
      </p>
    </main>
  );
}
