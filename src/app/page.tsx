// PATH: src/app/page.tsx
import * as React from "react";
import Script from "next/script";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Skills from "@/components/Skills";
import BookingWidget from "@/components/BookingWidget";
import PartnerOpportunity from "@/components/PartnerOpportunity";
import ClientContactSection from "@/components/ClientContactSection";

export default function HomePage() {
  return (
    <main id="main" className="bg-stone-950 text-white">
      <Header />

      <div className="bg-stone-950 pt-24 sm:pt-28 lg:pt-32">
        <Hero />
      </div>

      <Skills />

      <section
        id="boeken"
        aria-labelledby="boeken-title"
        className="relative overflow-hidden bg-stone-950 py-16 text-white sm:py-20"
      >
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_35%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.94)_0%,rgba(12,10,9,1)_100%)]" />
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 id="boeken-title" className="sr-only">
            Boeken
          </h2>

          <BookingWidget />
        </div>
      </section>

      <section
        id="partner"
        aria-labelledby="partner-title"
        className="relative overflow-hidden bg-stone-950 py-16 text-white sm:py-20"
      >
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_35%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,1)_0%,rgba(28,25,23,0.96)_100%)]" />
          <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 id="partner-title" className="sr-only">
            Partner worden
          </h2>

          <PartnerOpportunity />
        </div>
      </section>

      <ClientContactSection />

      <Script id="view-home-event" strategy="afterInteractive">
        {`
          (function(){
            var sent = false;

            function hasConsentAnalytics() {
              try {
                var m = document.cookie.match(/(?:^|; )cookie_consent=([^;]*)/);
                if(!m) return false;
                var cc = JSON.parse(decodeURIComponent(m[1]));
                return !!(cc && cc.analytics);
              } catch(e){
                return false;
              }
            }

            function trySend(){
              if(sent) return;
              if(!hasConsentAnalytics()) return;

              if(window.gtag){
                window.gtag('event','view_home');
                sent = true;
                sessionStorage.setItem('ev_view_home_sent','1');
                return;
              }

              if(window.plausible){
                window.plausible('view_home');
                sent = true;
                sessionStorage.setItem('ev_view_home_sent','1');
                return;
              }
            }

            if(sessionStorage.getItem('ev_view_home_sent')){
              sent = true;
            }

            trySend();

            window.addEventListener('cookie-consent-changed', trySend);
            window.addEventListener('trackers-ready', trySend);
          })();
        `}
      </Script>
    </main>
  );
}