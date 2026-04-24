// PATH: src/components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative overflow-hidden border-t border-white/10 bg-stone-950 text-white"
      itemScope
      itemType="https://schema.org/Organization"
    >
      {/* Background sfeer */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.14),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.35)_0%,rgba(12,10,9,0.96)_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {/* Top */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Merk */}
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.24em] text-stone-100/90 backdrop-blur-sm">
              D-ESCAPEROOM
            </span>

            <h3 className="mt-5 text-3xl font-black tracking-tight text-rose-300">
              The Missing Snack
            </h3>

            <p className="mt-4 max-w-sm text-sm leading-7 text-stone-300">
              Een unieke escaperoom ervaring waar baas en hond samen puzzels
              oplossen, speuren en plezier maken.
            </p>
          </div>

          {/* Contact + adres */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200/90">
              Contact
            </h4>

            <ul className="mt-4 space-y-3 text-sm text-stone-300">
              <li>
                <a
                  href="mailto:info@d-escaperoom.com"
                  className="transition hover:text-pink-300"
                  itemProp="email"
                >
                  info@d-escaperoom.com
                </a>
              </li>

              <li>
                <a
                  href="tel:+31683853373"
                  className="transition hover:text-pink-300"
                  itemProp="telephone"
                >
                  +31 (0)6 83 85 33 73
                </a>
              </li>
            </ul>

            <address
              className="mt-5 not-italic text-sm leading-7 text-stone-300"
              itemProp="address"
              itemScope
              itemType="https://schema.org/PostalAddress"
            >
              <div itemProp="streetAddress">
                Nijverheidsweg-Noord 42
              </div>
              <div>
                <span itemProp="postalCode">3812 PM</span>{" "}
                <span itemProp="addressLocality">Amersfoort</span>
              </div>
              <div itemProp="addressCountry">Nederland</div>
            </address>
          </div>

          {/* Juridisch */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200/90">
              Juridisch
            </h4>

            <ul className="mt-4 space-y-3 text-sm text-stone-300">
              <li>
                <Link
                  href="/algemene-voorwaarden"
                  className="transition hover:text-pink-300"
                >
                  Algemene voorwaarden
                </Link>
              </li>

              <li>
                <Link
                  href="/privacy"
                  className="transition hover:text-pink-300"
                >
                  Privacyverklaring
                </Link>
              </li>

              <li>
                <Link
                  href="/cookies"
                  className="transition hover:text-pink-300"
                >
                  Cookiebeleid
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-3 text-sm text-stone-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© {year} D-EscapeRoom. Alle rechten voorbehouden.</p>

            <p className="text-stone-500">
              KvK 92105815 · BTW NL004936558B58
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}