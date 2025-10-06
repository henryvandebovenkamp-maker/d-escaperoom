"use client";

import * as React from "react";
import { trackEvent } from "@/lib/analytics";

export default function NewsletterForm() {
  const [email, setEmail] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      // Geen PII naar analytics; hoogstens kanaal/method
      trackEvent("newsletter_signup", { method: "site_form" });
      // UI feedback ...
    } else {
      // foutafhandeling ...
    }
  }

  return (
    <form onSubmit={onSubmit} className="...">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="..."
        placeholder="jouw@email.nl"
        aria-label="E-mailadres"
      />
      <button type="submit" className="...">Inschrijven</button>
    </form>
  );
}
