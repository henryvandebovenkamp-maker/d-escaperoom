// PATH: src/components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear(); // server-only

  return (
    <footer
      className="bg-stone-900 text-stone-50 mt-20"
      itemScope
      itemType="https://schema.org/Organization"
    >
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {/* Bedrijfsgegevens */}
          <div>
            <h3 className="text-xl font-semibold tracking-tight">D-EscapeRoom</h3>
            <p className="mt-1 text-stone-300">Hoofdkantoor</p>

            <address
              className="not-italic mt-4 leading-relaxed"
              itemProp="address"
              itemScope
              itemType="https://schema.org/PostalAddress"
            >
              <div itemProp="streetAddress">Lakerveld 84</div>
              <div>
                <span itemProp="postalCode">4128LK</span>{" "}
                <span itemProp="addressLocality">Lexmond</span>
              </div>
              <div itemProp="addressCountry">Nederland</div>
            </address>

            <dl className="mt-4 space-y-1 text-stone-300">
              <div className="flex gap-2">
                <dt className="font-medium text-stone-100">KVK</dt>
                <dd>92105815</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-stone-100">BTW</dt>
                <dd>NL004936558B58</dd>
              </div>
            </dl>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Contact</h3>
            <ul className="space-y-1">
              <li>
                <a
                  href="mailto:info@d-escaperoom.com"
                  className="text-pink-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/70 rounded-sm"
                  itemProp="email"
                >
                  info@d-escaperoom.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+31683853373"
                  className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/70 rounded-sm"
                  itemProp="telephone"
                >
                  +31 (0)6 83 85 33 73
                </a>
              </li>
            </ul>
          </div>

          {/* Juridisch */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Juridisch</h3>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/algemene-voorwaarden"
                  className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/70 rounded-sm"
                >
                  Algemene voorwaarden
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/70 rounded-sm"
                >
                  Privacyverklaring
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/70 rounded-sm"
                >
                  Cookiebeleid
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-stone-800 pt-6 text-sm text-stone-400 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} D-EscapeRoom. Alle rechten voorbehouden.</p>
          <p className="text-stone-500">KvK 92105815 · BTW NL004936558B58</p>
        </div>
      </div>
    </footer>
  );
}
