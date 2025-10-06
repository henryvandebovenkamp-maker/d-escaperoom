// PATH: src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import CookieConsent from "@/components/CookieConsent";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "D-EscapeRoom",
  description: "The Missing Snack — boek je sessie",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="h-full">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased flex flex-col">
        {/* Main content */}
        <div className="flex-1">{children}</div>

        {/* Footer */}
        <Footer />

        {/* Cookie consent banner */}
        <CookieConsent />
      </body>
    </html>
  );
}
