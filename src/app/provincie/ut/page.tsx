// PATH: src/app/partner/provincie/ut/page.tsx
import * as React from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Skills from "@/components/Skills";
import Pricing from "@/components/Pricing";
import BookingWidget from "@/components/BookingWidget";
import PartnerOpportunity from "@/components/PartnerOpportunity";
import ClientContactSection from "@/components/ClientContactSection";
import Footer from "@/components/Footer";

export const dynamic = "force-static";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0c0a09" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export const metadata: Metadata = {
  title: "D-EscapeRoom Utrecht | WoofExperience",
  description:
    "Boek D-EscapeRoom in Utrecht bij WoofExperience. Beleef The Missing Snack samen met je hond.",
  alternates: {
    canonical: "https://d-escaperoom.com/partner/provincie/ut",
  },
};

export default function UtrechtLandingPage() {
  return (
    <main id="main" className="min-h-screen bg-stone-950 text-white">
      <Header />
      <Hero />
      <Skills />
      <Pricing />

      {/* BOEKEN */}
      <section
        id="boeken"
        aria-labelledby="boeken-title"
        className="bg-stone-950 py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 id="boeken-title" className="sr-only">
            Boeken Utrecht
          </h2>

          <div className="mb-6 rounded-[1.8rem] border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/90">
              Provincie Utrecht
            </p>

            <h3 className="mt-3 text-3xl font-black tracking-tight text-rose-300 sm:text-4xl">
              Speel bij WoofExperience
            </h3>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
              Reserveer direct jullie avontuur in Utrecht. Deze pagina boekt
              automatisch bij WoofExperience.
            </p>
          </div>

          <BookingWidget fixedPartnerSlug="woofexperience" />
        </div>
      </section>

      {/* PARTNER */}
      <section
        id="partner"
        aria-labelledby="partner-title"
        className="bg-stone-950 py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 id="partner-title" className="sr-only">
            Partner worden
          </h2>

          <PartnerOpportunity />
        </div>
      </section>

      {/* CONTACT */}
      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-stone-950">
        <div className="[&>section]:!bg-stone-950">
          <ClientContactSection />
        </div>
      </section>

      <Footer />

      <Script
        id="view-utrecht-woofexperience-event"
        strategy="afterInteractive"
      >
        {`
          (function () {
            var sent = false;

            function hasConsentAnalytics() {
              try {
                var m = document.cookie.match(/(?:^|; )cookie_consent=([^;]*)/);
                if (!m) return false;
                var cc = JSON.parse(decodeURIComponent(m[1]));
                return !!(cc && cc.analytics);
              } catch (e) {
                return false;
              }
            }

            function trySend() {
              if (sent) return;
              if (!hasConsentAnalytics()) return;

              if (window.gtag) {
                window.gtag("event", "view_partner_province_ut_woofexperience");
                sent = true;
                sessionStorage.setItem(
                  "ev_view_ut_woofexperience_sent",
                  "1"
                );
                return;
              }

              if (window.plausible) {
                window.plausible(
                  "view_partner_province_ut_woofexperience"
                );
                sent = true;
                sessionStorage.setItem(
                  "ev_view_ut_woofexperience_sent",
                  "1"
                );
                return;
              }
            }

            if (
              sessionStorage.getItem(
                "ev_view_ut_woofexperience_sent"
              )
            ) {
              sent = true;
            }

            trySend();

            window.addEventListener(
              "cookie-consent-changed",
              trySend
            );
            window.addEventListener("trackers-ready", trySend);
          })();
        `}
      </Script>
    </main>
  );
}