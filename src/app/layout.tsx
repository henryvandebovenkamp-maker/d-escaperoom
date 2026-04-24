// PATH: src/app/layout.tsx
/// <reference types="next" />
/// <reference types="next/image-types/global" />

import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: {
    default: "D-EscapeRoom",
    template: "%s | D-EscapeRoom",
  },
  description:
    "The Missing Snack: een unieke escaperoom ervaring voor baas en hond.",
};

type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html lang="nl">
      <body className="min-h-dvh bg-stone-950 text-white antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}