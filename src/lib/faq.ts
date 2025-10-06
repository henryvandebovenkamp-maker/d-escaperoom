/* =========================================================
   D-EscapeRoom — FAQ (multilingual, role-neutral) + slimme matcher
   PATH: src/lib/faq.ts
   ========================================================= */

export type Role = "CONSUMER" | "PARTNER" | "ADMIN";
export type Locale = "nl" | "en" | "de" | "es";

export type FAQItem = {
  q: string;      // question
  a: string;      // answer
  tags?: string[]; // intent- / trefwoorden
};

/** Contact fallback */
const CONTACT_EMAIL = "info@d-escaperoom.com";

/* ----------------------- Helpers ----------------------- */
function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}
function tokens(s: string) {
  return norm(s).split(/\s+/).filter(Boolean);
}
function ngrams(arr: string[], n: 2 | 3) {
  const out: string[] = [];
  for (let i = 0; i <= arr.length - n; i++) out.push(arr.slice(i, i + n).join(" "));
  return out;
}

/** Synoniemen / intent-woorden per taal (uitbreidbaar) */
const SYNONYMS: Record<Locale, Record<string, string[]>> = {
  nl: {
    prijs: ["prijs", "kosten", "tarief", "bedrag", "wat kost", "hoe duur", "staffel"],
    annuleren: ["annuleren", "afzeggen", "annulering", "terugbetaling", "refund"],
    aanbetaling: ["aanbetaling", "deposit", "voorschot", "fee", "fee%"],
    mollie: ["mollie", "betaling", "betaal", "ideal", "creditcard", "kaart"],
    tijdslot: ["tijdslot", "slot", "reservering", "boeking", "afspraak", "agenda", "tijd"],
    spelers: ["spelers", "personen", "mensen", "aantal", "max", "deelnemers"],
    hond: ["hond", "honden", "puppy", "allergie", "angst", "reactief"],
    duur: ["duur", "hoelang", "tijd", "tijdsduur", "minuten"],
    locatie: ["locatie", "adres", "waar", "hondenschool", "partner"],
    taal: ["taal", "engels", "duits", "spaans", "nederlands", "i18n"],
    toegang: ["toegankelijk", "rolstoel", "wcag", "veilig", "veiligheid"],
    kortingscode: ["korting", "voucher", "coupon", "code", "promo"],
    partner: ["partner", "samenwerken", "aanmelden", "portaal", "onboarding", "hondenschool"],
    begeleiding: ["begeleiding", "instructeur", "staff", "hulp", "assistentie"],
  },
  en: {
    price: ["price", "cost", "how much", "fee", "rate", "tier"],
    cancel: ["cancel", "cancellation", "refund"],
    deposit: ["deposit", "down payment", "prepayment"],
    payment: ["mollie", "payment", "pay", "ideal", "credit card"],
    slot: ["slot", "timeslot", "booking", "reservation", "time", "schedule"],
    players: ["players", "people", "participants", "max"],
    dog: ["dog", "puppy", "allergy", "fear", "reactive"],
    duration: ["duration", "how long", "minutes", "time"],
    location: ["location", "address", "where", "school", "partner"],
    language: ["language", "english", "german", "spanish", "dutch", "i18n"],
    accessibility: ["accessible", "wheelchair", "a11y", "wcag", "safety"],
    discount: ["discount", "voucher", "coupon", "code", "promo"],
    partner: ["partner", "onboarding", "portal", "school"],
    guidance: ["guidance", "staff", "host", "assistance"],
  },
  de: {
    preis: ["preis", "kosten", "tarif", "wie viel", "staffel"],
    partner: ["partner", "anmeldung", "portal"],
  },
  es: {
    precio: ["precio", "coste", "tarifa", "cuánto", "escalado"],
    partner: ["partner", "alta", "portal", "escuela"],
  },
};

/* ----------------------- Content ----------------------- */
/**
 * Eén rol-neutrale kennisbank per taal.
 * NL is het meest volledig; andere talen kun je later uitbreiden.
 */
const FAQ_ALL: Record<Locale, FAQItem[]> = {
  nl: [
    // — Prijs & betalen —
    {
      q: "Wat kost het?",
      a: "De prijs is €49,95 voor 1 persoon en €39,95 p.p. bij 2 of meer personen. Je betaalt nu alleen de aanbetaling (partner fee%) via Mollie; het restant betaal je op locatie. Eventuele weekend/avond toeslag kan gelden.",
      tags: ["prijs","kosten","tarief","staffel","aanbetaling","mollie","fee","weekend","avond"],
    },
    {
      q: "Welke betaalmethoden zijn er?",
      a: "De aanbetaling gaat via Mollie (o.a. iDEAL en kaart). Het resterende bedrag betaal je op locatie bij de hondenschool.",
      tags: ["betaling","mollie","ideal","creditcard","aanbetaling","fee"],
    },

    // — Boeken & slots —
    {
      q: "Hoe werkt boeken?",
      a: "Kies een hondenschool, selecteer een 60-min tijdslot (speeltijd ±45 min), vul je gegevens in en betaal de aanbetaling via Mollie. Je ontvangt direct een bevestigingsmail.",
      tags: ["boeken","tijdslot","slot","reserveren","afspraak","bevestiging","widget"],
    },
    {
      q: "Hoe lang duurt een sessie?",
      a: "Je tijdslot is 60 minuten; je speelt ongeveer 45 minuten. De rest is voor uitleg en afronding.",
      tags: ["duur","minuten","tijdsduur","hoe lang","slot"],
    },
    {
      q: "Met hoeveel spelers kunnen we komen?",
      a: "Maximaal 3 spelers per slot (advies: 1 hond). Per slot kan slechts 1 boeking worden gemaakt.",
      tags: ["spelers","personen","aantal","max","deelnemers","hond"],
    },

    // — Veiligheid & begeleiding —
    {
      q: "Is er begeleiding aanwezig?",
      a: "Ja, er is altijd begeleiding aanwezig tijdens je sessie. We helpen waar nodig en houden rekening met jouw hond.",
      tags: ["begeleiding","instructeur","staff","veiligheid","assistentie"],
    },
    {
      q: "Is het geschikt voor elke hond?",
      a: "Ja, we ontwerpen hondvriendelijke puzzels. Geef bij het boeken door als je hond allergieën of angsten heeft; dan houden we daar rekening mee.",
      tags: ["hond","allergie","angst","reactief","veilig"],
    },
    {
      q: "Is de locatie toegankelijk?",
      a: "We streven naar goede toegankelijkheid. Heb je specifieke wensen (bijv. rolstoeltoegankelijk), neem vooraf contact op met de hondenschool of mail ons via info@d-escaperoom.com.",
      tags: ["toegankelijk","rolstoel","wcag","veiligheid","a11y"],
    },

    // — Annuleren & korting —
    {
      q: "Kan ik annuleren en krijg ik geld terug?",
      a: "Annuleren kan via de link in je bevestigingsmail. Terugbetaling hangt af van het moment t.o.v. je starttijd volgens onze voorwaarden. Vragen? Mail ons via info@d-escaperoom.com.",
      tags: ["annuleren","refund","terugbetaling","voorwaarden"],
    },
    {
      q: "Kan ik een kortingscode gebruiken?",
      a: "Ja, vul de code in bij het afrekenen. Korting wordt toegepast op het totaal; de aanbetaling (fee%) wordt berekend over het aangepaste totaal.",
      tags: ["korting","voucher","coupon","code","promo"],
    },

    // — Taal & locatie —
    {
      q: "In welke talen is het beschikbaar?",
      a: "Website: NL (standaard), EN, DE en ES. Ter plekke helpt de instructeur in NL/EN.",
      tags: ["taal","nederlands","engels","duits","spaans","i18n"],
    },
    {
      q: "Waar vindt het plaats?",
      a: "Bij de aangesloten hondenschool die je in de boekingswidget selecteert. Het adres staat in je bevestigingsmail.",
      tags: ["locatie","adres","partner","hondenschool"],
    },

    // — Partner / portal —
    {
      q: "Hoe word ik partner?",
      a: "Leuk dat je partner wilt worden! Mail ons via info@d-escaperoom.com. We plannen kort contact over fee%, planning en materialen. Daarna krijg je toegang tot het partnerportaal om slots te beheren.",
      tags: ["partner","samenwerken","aanmelden","portaal","onboarding","hondenschool","fee"],
    },
    {
      q: "Hoe log ik in als partner?",
      a: "Ga naar /partner/login en log in met je e-mail en 6-cijfer code (magic link).",
      tags: ["partner","login","inloggen","code","portaal"],
    },
    {
      q: "Hoe beheer ik tijdsloten als partner?",
      a: "In Partner → Slots kun je per dag tot 12 × 60-min slots aanmaken, publiceren/depubliceren en verwijderen (indien onbezet).",
      tags: ["partner","slots","tijdslot","publiceren","beheer","agenda"],
    },
    {
      q: "Hoe werkt de partner fee en aanbetaling?",
      a: "De consument betaalt online een aanbetaling gelijk aan jouw partner fee% over het totaal. Het restant wordt op locatie afgerekend.",
      tags: ["partner","fee","aanbetaling","betalingen","mollie"],
    },
  ],

  en: [
    {
      q: "How much does it cost?",
      a: "€49.95 for 1 person, €39.95 per person for 2+ people. You only pay the deposit now (partner fee%) via Mollie; the remainder is paid on site. Weekend/evening surcharge may apply.",
      tags: ["price","cost","tier","deposit","mollie","fee"],
    },
    { q: "Is staff present?", a: "Yes, there is always guidance/staff present during your session.", tags: ["staff","guidance","assistance","safety"] },
    { q: "How do I become a partner?", a: "Email info@d-escaperoom.com. We’ll align on fee%, planning and materials, then give you partner portal access to manage slots.", tags: ["partner","onboarding","portal","school"] },
  ],

  de: [
    { q: "Was kostet es?", a: "€49,95 für 1 Person, €39,95 p.P. ab 2 Personen. Jetzt zahlen Sie nur die Anzahlung (Partner-Fee%) via Mollie; der Rest vor Ort. Wochenend/Abend-Zuschlag möglich.", tags: ["preis","kosten","staffel","anzahlung","mollie","gebühr"] },
    { q: "Gibt es Betreuung?", a: "Ja, während der Sitzung ist immer Betreuung anwesend.", tags: ["betreuung","personal","sicherheit"] },
    { q: "Wie werde ich Partner?", a: "Schreiben Sie uns an info@d-escaperoom.com. Wir klären Fee%, Planung und Material und geben Ihnen Zugang zum Partner-Portal.", tags: ["partner","anmeldung","portal"] },
  ],

  es: [
    { q: "¿Cuánto cuesta?", a: "49,95 € para 1 persona y 39,95 € por persona a partir de 2. Ahora solo pagas el depósito (fee% del partner) con Mollie; el resto en el lugar. Puede haber recargo de fin de semana/noche.", tags: ["precio","coste","escala","depósito","mollie","fee"] },
    { q: "¿Hay acompañamiento?", a: "Sí, siempre hay acompañamiento durante la sesión.", tags: ["acompañamiento","personal","seguridad"] },
    { q: "¿Cómo me hago partner?", a: "Escríbenos a info@d-escaperoom.com. Acordamos fee%, planificación y materiales y te damos acceso al portal de partners.", tags: ["partner","alta","portal"] },
  ],
};

/* ----------------------- API ----------------------- */
/** Bundel alle items voor de gekozen taal (val terug op NL). */
export function getFAQAll(locale: Locale): FAQItem[] {
  return FAQ_ALL[locale] && FAQ_ALL[locale]!.length ? FAQ_ALL[locale]! : FAQ_ALL.nl;
}

/**
 * Compat-layer voor bestaande imports:
 * getFAQ(role, locale) -> geeft dezelfde lijst terug als getFAQAll(locale)
 * zodat oude code niet breekt.
 */
export function getFAQ(_role: Role, locale: Locale): FAQItem[] {
  return getFAQAll(locale);
}

/** Slimme best-match over vraag + tags + intent, met boosts/penalties. */
function scoreItem(query: string, item: FAQItem, locale: Locale) {
  const qTok = tokens(query);
  if (!qTok.length) return 0;

  const hayTok = tokens([item.q, ...(item.tags || [])].join(" "));
  const hayJoined = hayTok.join(" ");
  const q2 = ngrams(qTok, 2);
  const q3 = ngrams(qTok, 3);

  let score = 0;

  // n-gram exactness (sterk)
  for (const g of q3) if (g && hayJoined.includes(g)) score += 10;
  for (const g of q2) if (g && hayJoined.includes(g)) score += 6;

  // token overlap (sterk)
  for (const t of qTok) if (hayTok.includes(t)) score += 4;

  // substring bonus (mild)
  for (const t of qTok) if (t.length >= 4 && hayJoined.includes(t)) score += 1;

  // intent boosts
  const syn = SYNONYMS[locale] || SYNONYMS.nl;
  const hasIntent = (k: keyof typeof syn) => (syn[k] || []).some((w) => hayJoined.includes(norm(w)));
  const qHas = (k: keyof typeof syn) => (syn[k] || []).some((w) => qTok.includes(norm(w)) || q2.includes(norm(w)) || q3.includes(norm(w)));

  // partner-intent extra zwaar om foute 'prijs' match te voorkomen
  if (qHas("partner")) score += hasIntent("partner") ? 14 : -8;
  if (qHas("prijs") || qHas("price")) score += hasIntent("prijs" as any) || hasIntent("price" as any) ? 6 : 0;
  if (qHas("mollie")) score += hasIntent("mollie") ? 3 : 0;
  if (qHas("tijdslot") || qHas("slot")) score += 2;

  // lichte voorkeur voor korte, specifieke vragen
  score += Math.max(0, 8 - Math.floor(item.q.length / 20));

  return score;
}

/** Vind beste FAQ-antwoord; null als we liever AI laten antwoorden. */
export function smartFaqAnswer(query: string, locale: Locale = "nl"): string | null {
  const list = getFAQAll(locale);
  if (!list.length) return null;

  const qTok = tokens(query);
  const qHasPartner = (SYNONYMS[locale] || SYNONYMS.nl).partner?.some((w) => qTok.includes(norm(w))) ?? false;

  let best: { item: FAQItem | null; score: number } = { item: null, score: 0 };
  for (const item of list) {
    const s = scoreItem(query, item, locale);
    if (s > best.score) best = { item, score: s };
  }

  // strengere drempel bij partner-intent om misfires te voorkomen
  const threshold = qHasPartner ? 10 : 6;
  if (!best.item || best.score < threshold) return null;

  return best.item.a;
}

/** Nette contactfallback in de juiste taal. */
export function contactFallback(locale: Locale = "nl"): string {
  if (locale === "nl")
    return `Ik kan het niet 100% zeker beantwoorden. Mail ons via ${CONTACT_EMAIL}, dan helpen we je persoonlijk verder.`;
  if (locale === "de")
    return `Ich kann es nicht sicher beantworten. Schreiben Sie uns an ${CONTACT_EMAIL}, wir helfen Ihnen persönlich weiter.`;
  if (locale === "es")
    return `No puedo responder con total seguridad. Escríbenos a ${CONTACT_EMAIL} y te ayudamos personalmente.`;
  return `I'm not fully sure. Please email us at ${CONTACT_EMAIL} and we'll help you personally.`;
}

/**
 * High-level helper (compat met bestaande code):
 * probeert eerst slimme FAQ, anders laat de server (API) AI doen;
 * als je deze direct client-side gebruikt, geeft hij de nette contactfallback.
 */
export function answerQuestion(
  query: string,
  _role: Role = "CONSUMER",
  locale: Locale = "nl"
): string {
  const hit = smartFaqAnswer(query, locale);
  return hit ?? contactFallback(locale);
}
