"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-50 py-10 mt-20">
      <div className="mx-auto max-w-6xl px-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {/* Bedrijfsgegevens */}
        <div>
          <h3 className="font-semibold text-lg mb-2">D-EscapeRoom</h3>
          <p>
            Lakenveld 84
            <br />
            4128 CN Lexmond
            <br />
            Nederland
          </p>
          <p className="mt-2">
            KVK: 12345678
            <br />
            BTW: NL123456789B01
          </p>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-semibold text-lg mb-2">Contact</h3>
          <p>
            <a
              href="mailto:info@d-escaperoom.com"
              className="hover:underline"
            >
              info@d-escaperoom.com
            </a>
          </p>
          <p>
            <a href="tel:+310683853373" className="hover:underline">
              +31 (0)6 83 85 33 73
            </a>
          </p>
        </div>

        {/* Juridisch */}
        <div>
          <h3 className="font-semibold text-lg mb-2">Juridisch</h3>
          <ul className="space-y-1">
            <li>
              <Link href="/algemene-voorwaarden" className="hover:underline">
                Algemene voorwaarden
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:underline">
                Privacyverklaring
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="hover:underline">
                Cookiebeleid
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
