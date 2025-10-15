// PATH: src/app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import CookieConsent from "@/components/CookieConsent";
import Footer from "@/components/Footer";

// Absolute basis-URL voor og/twitter images
const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_ORIGIN ?? "https://www.d-escaperoom.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_ORIGIN),
  title: { default: "D-EscapeRoom", template: "%s | D-EscapeRoom" },
  description: "The Missing Snack — boek je sessie",
  themeColor: "#1c1917",
  referrer: "origin-when-cross-origin",
  robots: { index: true, follow: true },

  openGraph: {
    type: "website",
    url: "/",
    siteName: "D-EscapeRoom",
    title: "D-EscapeRoom",
    description: "The Missing Snack — boek je sessie",
    images: ["/og.jpg?v=1"], // cache-bust bij update → verhoog v=
  },

  twitter: {
    card: "summary_large_image",
    title: "D-EscapeRoom",
    description: "The Missing Snack — boek je sessie",
    images: ["/og.jpg?v=1"],
  },

  // Favicons & apple-touch-icon
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" }, // fallback voor browsers die .ico verwachten
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },

  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="h-full">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased flex flex-col">
        {/* Skip to content (WCAG AA) */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-white/90 text-stone-900 rounded px-3 py-2 shadow"
        >
          Ga naar hoofdinhoud
        </a>

        {/* Main */}
        <main id="content" role="main" className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <Footer />

        {/* Cookie consent banner */}
        <CookieConsent />
      </body>
    </html>
  );
}
