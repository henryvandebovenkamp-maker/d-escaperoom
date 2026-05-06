// PATH: src/components/CopyReviewButton.tsx
"use client";

import * as React from "react";

type Props = {
  text: string;
};

export default function CopyReviewButton({ text }: Props) {
  const [copied, setCopied] = React.useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/20 sm:w-auto"
    >
      {copied ? "Review gekopieerd ✓" : "Kopieer reviewtekst"}
    </button>
  );
}