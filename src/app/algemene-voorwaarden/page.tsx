"use client";

import * as React from "react";

export default function AlgemeneVoorwaardenPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 prose prose-stone">
      <h1>Algemene Voorwaarden</h1>
      <p><em>Versie: oktober 2025</em></p>

      <h2>Artikel 1 – Definities</h2>
      <p>In deze algemene voorwaarden wordt verstaan onder:</p>
      <ul>
        <li><strong>D-EscapeRoom</strong>: de aanbieder van de hondvriendelijke escape-roombeleving “The Missing Snack”.</li>
        <li><strong>Klant</strong>: iedere natuurlijke persoon of rechtspersoon die een reservering plaatst of gebruikmaakt van de diensten van D-EscapeRoom.</li>
        <li><strong>Overeenkomst</strong>: iedere afspraak tussen D-EscapeRoom en de klant met betrekking tot deelname aan een escape-roomactiviteit.</li>
      </ul>

      <h2>Artikel 2 – Toepasselijkheid</h2>
      <p>
        Deze algemene voorwaarden zijn van toepassing op alle aanbiedingen, boekingen en overeenkomsten tussen D-EscapeRoom en de klant, tenzij schriftelijk anders overeengekomen.
      </p>

      <h2>Artikel 3 – Reservering en betaling</h2>
      <ul>
        <li>Een reservering is definitief nadat de aanbetaling succesvol is voldaan via Mollie.</li>
        <li>Het resterende bedrag wordt op locatie voldaan vóór aanvang van het spel.</li>
        <li>Annuleringen dienen altijd schriftelijk of per e-mail te worden doorgegeven via <a href="mailto:info@d-escaperoom.com">info@d-escaperoom.com</a>.</li>
      </ul>

      <h2>Artikel 4 – Annulering door de klant</h2>
      <ul>
        <li>
          <strong>Annuleren binnen 24 uur na boeking:</strong> kosteloos annuleren met
          <strong> volledige terugbetaling van het betaalde bedrag, inclusief aanbetaling.</strong>
        </li>
        <li>
          <strong>Uitzondering:</strong> de 24-uursbedenktijd geldt niet wanneer de reservering minder dan 24 uur vóór aanvang van het geboekte tijdslot is gemaakt.
        </li>
        <li>
          <strong>Annuleren tot 48 uur vóór aanvang:</strong> volledige terugbetaling van de aanbetaling.
        </li>
        <li>
          <strong>Annuleren binnen 48 uur vóór aanvang:</strong> geen restitutie van de aanbetaling.
        </li>
      </ul>

      <h2>Artikel 5 – Annulering door D-EscapeRoom</h2>
      <p>
        Indien door onvoorziene omstandigheden (zoals technische storingen, weersomstandigheden of overmacht) het spel niet kan plaatsvinden, ontvangt de klant een volledige terugbetaling van de reeds betaalde bedragen.
      </p>

      <h2>Artikel 6 – Aansprakelijkheid</h2>
      <p>
        Deelname aan D-EscapeRoom geschiedt op eigen risico. D-EscapeRoom is niet aansprakelijk voor verlies, schade of letsel aan personen, dieren of eigendommen, tenzij er sprake is van opzet of grove nalatigheid.
      </p>

      <h2>Artikel 7 – Huisregels</h2>
      <ul>
        <li>Maximaal drie spelers per spel, bij voorkeur met één hond.</li>
        <li>Honden dienen aangelijnd te blijven tenzij anders aangegeven door de instructeur.</li>
        <li>Het is niet toegestaan eigen snacks of voer mee te nemen in de escape-roomruimte.</li>
        <li>Volg te allen tijde de aanwijzingen van het personeel op.</li>
      </ul>

      <h2>Artikel 8 – Overmacht</h2>
      <p>
        In geval van overmacht (zoals ziekte, stroomstoringen of omstandigheden buiten de invloed van D-EscapeRoom) kan de uitvoering van de overeenkomst worden opgeschort of geannuleerd zonder dat de klant recht heeft op schadevergoeding.
      </p>

      <h2>Artikel 9 – Toepasselijk recht</h2>
      <p>
        Op deze algemene voorwaarden is uitsluitend Nederlands recht van toepassing.
        Geschillen worden uitsluitend voorgelegd aan de bevoegde rechter in het arrondissement waar D-EscapeRoom is gevestigd.
      </p>

      <hr />
      <p>
        Vragen of opmerkingen? Neem gerust contact op via{" "}
        <a href="mailto:info@d-escaperoom.com">info@d-escaperoom.com</a>.
      </p>
    </main>
  );
}
