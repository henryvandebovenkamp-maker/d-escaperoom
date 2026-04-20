// PATH: src/components/ClientContactSection.tsx
"use client";

import ContactWidget from "@/components/ContactWidget";

export default function ClientContactSection() {
  return (
    <section
      className="relative overflow-hidden bg-stone-950 py-16 text-white sm:py-20"
      aria-labelledby="contact-section-title"
    >
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.96)_0%,rgba(12,10,9,1)_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 id="contact-section-title" className="sr-only">
          Contact
        </h2>

        <ContactWidget className="py-0" />
      </div>
    </section>
  );
}