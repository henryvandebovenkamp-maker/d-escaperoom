// PATH: src/components/ScriptManager.tsx
"use client";

import * as React from "react";
import Script from "next/script";
import { getConsent, type ConsentState } from "@/lib/consent";

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    plausible?: (event: string, opts?: { props?: Record<string, any> }) => void;
    __trackers?: { ga?: boolean; plausible?: boolean; meta?: boolean };
  }
}

export default function ScriptManager() {
  const [consent, setConsent] = React.useState<ConsentState | null>(null);

  // Helpers
  function signalReady(which: "ga" | "plausible" | "meta") {
    if (typeof window === "undefined") return;
    window.__trackers = window.__trackers || {};
    window.__trackers[which] = true;
    window.dispatchEvent(new Event("trackers-ready"));
  }

  React.useEffect(() => {
    // initial read
    setConsent(getConsent());

    // live updates vanuit CookieConsent
    function onChange(e: any) {
      const c = e.detail as ConsentState;
      setConsent(c);

      // Als GA al geladen is, update consent flags live
      if (window.gtag) {
        window.gtag("consent", "update", {
          ad_storage: c.marketing ? "granted" : "denied",
          analytics_storage: c.analytics ? "granted" : "denied",
        });
      }
    }
    window.addEventListener("cookie-consent-changed", onChange);
    return () => window.removeEventListener("cookie-consent-changed", onChange);
  }, []);

  // Niets laden zonder consent (behalve noodzakelijke first-party)
  if (!consent) return null;

  return (
    <>
      {/* === ANALYTICS (Plausible) === */}
      {consent.analytics && (
        <Script
          strategy="afterInteractive"
          data-domain="jouwdomein.nl" // TODO: vervang door jouw domein
          src="https://plausible.io/js/script.js"
          onLoad={() => signalReady("plausible")}
        />
      )}

      {/* === GOOGLE ANALYTICS 4 === */}
      {consent.analytics && (
        <>
          <Script
            strategy="afterInteractive"
            src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX" // TODO: vervang met jouw GA4-measurement ID
            onLoad={() => signalReady("ga")}
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              // Zet consent direct bij init (op basis van huidige state)
              gtag('consent', 'default', {
                ad_storage: '${consent.marketing ? "granted" : "denied"}',
                analytics_storage: '${consent.analytics ? "granted" : "denied"}'
              });
              // Anonimiseer IP
              gtag('config', 'G-XXXXXXX', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}

      {/* === MARKETING (Meta Pixel) === */}
      {consent.marketing && (
        <Script id="meta-pixel" strategy="afterInteractive" onLoad={() => signalReady("meta")}>
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return; n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)}; if(!f._fbq)f._fbq=n;
            n.push=n; n.loaded=!0; n.version='2.0'; n.queue=[]; t=b.createElement(e); t.async=!0;
            t.src=v; s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s)
            }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', 'YOUR_PIXEL_ID'); // TODO: vervang met jouw Pixel ID
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
