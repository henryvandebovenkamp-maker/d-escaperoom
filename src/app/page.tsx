// PATH: src/app/page.tsx
import * as React from "react";
import Script from "next/script";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Skills from "@/components/Skills";
import Pricing from "@/components/Pricing";
import BookingWidget from "@/components/BookingWidget";
import PartnerOpportunity from "@/components/PartnerOpportunity";
import ClientContactSection from "@/components/ClientContactSection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main id="main" className="min-h-screen bg-stone-950 text-white">
      <Header />
      <Hero />
      <Skills />
      <Pricing />

      <section
        id="boeken"
        aria-labelledby="boeken-title"
        className="bg-stone-950 py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 id="boeken-title" className="sr-only">
            Boeken
          </h2>
          <BookingWidget />
        </div>
      </section>

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

      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-stone-950">
        <div className="[&>section]:!bg-stone-950">
          <ClientContactSection />
        </div>
      </section>

      <Footer />

      <Script id="view-home-event" strategy="afterInteractive">
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
                window.gtag("event", "view_home");
                sent = true;
                sessionStorage.setItem("ev_view_home_sent", "1");
                return;
              }

              if (window.plausible) {
                window.plausible("view_home");
                sent = true;
                sessionStorage.setItem("ev_view_home_sent", "1");
                return;
              }
            }

            if (sessionStorage.getItem("ev_view_home_sent")) {
              sent = true;
            }

            trySend();

            window.addEventListener("cookie-consent-changed", trySend);
            window.addEventListener("trackers-ready", trySend);
          })();
        `}
      </Script>
    </main>
  );
}