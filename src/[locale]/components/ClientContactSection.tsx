// PATH: src/components/ClientContactSection.tsx
"use client";

import * as React from "react";
import dynamic from "next/dynamic";

// ContactWidget client-only (voorkomt SSR/hydration issues door extensies)
const ContactWidget = dynamic(() => import("@/[locale]/components/ContactWidget"), {
  ssr: false,
  loading: () => <ContactSkeleton />,
});

export default function ClientContactSection() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="bg-stone-100 py-16">
      <div className="mx-auto w-full max-w-6xl px-4">
        <h2 id="contact-title" className="sr-only">Contact</h2>
        <ContactWidget
          variant="consumer"
          title="Neem contact op"
          subtitle="Stel je vraag of plan direct een belmoment. We reageren meestal binnen één werkdag."
        />
      </div>
    </section>
  );
}

/** Skeleton om layout shift te voorkomen totdat ContactWidget geladen is */
function ContactSkeleton() {
  return (
    <section aria-label="Contactformulier laden…" className="space-y-4 mt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="h-10 rounded-lg bg-stone-200 border border-stone-300 animate-pulse" />
        <div className="h-10 rounded-lg bg-stone-200 border border-stone-300 animate-pulse" />
      </div>
      <div className="h-10 rounded-lg bg-stone-200 border border-stone-300 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="h-10 rounded-lg bg-stone-200 border border-stone-300 animate-pulse" />
        <div className="h-10 rounded-lg bg-stone-200 border border-stone-300 animate-pulse" />
      </div>
      <div className="h-24 rounded-lg bg-stone-200 border border-stone-300 animate-pulse" />
      <div className="h-10 w-40 rounded-2xl bg-stone-300 border border-stone-400 animate-pulse" />
    </section>
  );
}
