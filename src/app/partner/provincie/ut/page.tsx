// PATH: src/app/partner/provincie/ut/page.tsx
import * as React from "react";
import type { Metadata } from "next";
import Script from "next/script";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Skills from "@/components/Skills";
import Pricing from "@/components/Pricing";
import BookingWidget from "@/components/BookingWidget";
import PartnerOpportunity from "@/components/PartnerOpportunity";
import ChatbotWidget from "@/components/ChatbotWidget";
import ClientContactSection from "@/components/ClientContactSection";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "D-EscapeRoom in Utrecht – boek bij WoofExperience",
  description:
    "Boek de unieke D-EscapeRoom ervaring voor jou en je hond in de provincie Utrecht. Aanbetaling online, rest op locatie.",
  // Tip: zet je definitieve domein hier zodra TransIP klaar is
  alternates: { canonical: "https://d-escaperoom.com/partner/provincie/ut" },
};

export default function UtrechtLandingPage() {
  return (
    <main id="main" className="bg-stone-50 text-stone-900">
      <Header />
      <Hero />
      <Skills />
      <Pricing />

      <section id="boeken" aria-labelledby="boeken-title" className="bg-stone-50 py-16">
        <div className="mx-auto w-full max-w-6xl px-4">
          <h2 id="boeken-title" className="sr-only">Boeken</h2>
          <p className="mb-3 text-sm text-stone-600">
            Beschikbaar in <span className="font-medium">Utrecht</span>
          </p>
          {/* 🔒 Vast op WoofExperience */}
          <BookingWidget fixedPartnerSlug="woofexperience" />
        </div>
      </section>

      <section id="partner" aria-labelledby="partner-title" className="bg-stone-50 py-16">
        <div className="mx-auto w-full max-w-6xl px-4">
          <h2 id="partner-title" className="mb-8 text-center text-3xl font-extrabold tracking-tight text-stone-900" />
          <PartnerOpportunity />
        </div>
      </section>

      <ClientContactSection />
      <ChatbotWidget />

      <Script id="view-utrecht-event" strategy="afterInteractive">
        {`
          (function(){
            var sent = false;
            function hasConsentAnalytics() {
              try {
                var m = document.cookie.match(/(?:^|; )cookie_consent=([^;]*)/);
                if(!m) return false;
                var cc = JSON.parse(decodeURIComponent(m[1]));
                return !!(cc && cc.analytics);
              } catch(e){ return false; }
            }
            function trySend(){
              if(sent) return;
              if(!hasConsentAnalytics()) return;
              if (window.gtag) { window.gtag('event','view_partner_province_ut'); sent = true; sessionStorage.setItem('ev_view_ut_sent','1'); return; }
              if (window.plausible) { window.plausible('view_partner_province_ut'); sent = true; sessionStorage.setItem('ev_view_ut_sent','1'); return; }
            }
            if (sessionStorage.getItem('ev_view_ut_sent')) { sent = true; }
            trySend();
            window.addEventListener('cookie-consent-changed', trySend);
            window.addEventListener('trackers-ready', trySend);
          })();
        `}
      </Script>
    </main>
  );
}
