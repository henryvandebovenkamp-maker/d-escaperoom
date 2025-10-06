"use client";

import { getConsent, type ConsentState } from "@/lib/consent";

type EventName =
  | "view_home"
  | "view_booking"
  | "booking_start"
  | "booking_confirmed"
  | "deposit_paid"
  | "newsletter_signup";

type EventProps = Record<string, string | number | boolean | null | undefined>;

let ready = false;
let lastConsent: ConsentState | null = null;
const queue: Array<{ name: EventName; props?: EventProps }> = [];

function canTrack() {
  // Alleen als analytics consent aan staat én er een tracker is
  const hasGA = typeof window !== "undefined" && !!(window as any).gtag;
  const hasPlausible = typeof window !== "undefined" && !!(window as any).plausible;
  const analyticsOn = lastConsent?.analytics === true;
  return analyticsOn && (hasGA || hasPlausible);
}

function flush() {
  if (!canTrack()) return;
  while (queue.length) {
    const ev = queue.shift()!;
    dispatch(ev.name, ev.props);
  }
}

function dispatch(name: EventName, props?: EventProps) {
  // GA4
  if ((window as any).gtag) {
    (window as any).gtag("event", name, props || {});
  }
  // Plausible
  if ((window as any).plausible) {
    (window as any).plausible(name, { props });
  }
}

export function trackEvent(name: EventName, props?: EventProps) {
  // update consent cache
  lastConsent = getConsent();

  if (canTrack()) {
    dispatch(name, props);
  } else {
    queue.push({ name, props });
  }
}

// Init listeners: consent change + tracker ready heuristiek
if (typeof window !== "undefined" && !ready) {
  ready = true;
  lastConsent = getConsent();

  window.addEventListener("cookie-consent-changed", (e: any) => {
    lastConsent = e.detail as ConsentState;
    flush();
  });

  // probeer een paar keer trackers te detecteren (in case of async load)
  let tries = 0;
  const iv = window.setInterval(() => {
    tries++;
    if (canTrack() || tries > 20) {
      window.clearInterval(iv);
      flush();
    }
  }, 500);
}
