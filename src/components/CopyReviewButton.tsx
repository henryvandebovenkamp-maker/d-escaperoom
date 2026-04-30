// PATH: src/components/CopyReviewButton.tsx
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type Props = {
  text: string;
};

export default function CopyReviewButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-200/20 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15 sm:w-auto"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Gekopieerd" : "Kopieer review"}
    </button>
  );
}