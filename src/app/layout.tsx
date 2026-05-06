// PATH: src/app/layout.tsx
/// <reference types="next" />
/// <reference types="next/image-types/global" />

import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.d-escaperoom.com"),

  title: {
    default: "D-EscapeRoom",
    template: "%s | D-EscapeRoom",
  },

  description:
    "The Stolen Snack: een unieke escaperoom ervaring waarin baas en hond samen puzzels oplossen in western sfeer.",

  keywords: [
    "honden escaperoom",
    "escaperoom met hond",
    "dog escape room",
    "The Stolen Snack",
    "uitje met hond",
    "western escaperoom",
    "D-EscapeRoom",
  ],

  openGraph: {
    title: "D-EscapeRoom | The Stolen Snack",
    description:
      "Een unieke escaperoom ervaring waarin baas en hond samen puzzels oplossen in western sfeer.",
    url: "https://www.d-escaperoom.com",
    siteName: "D-EscapeRoom",
    locale: "nl_NL",
    type: "website",

    images: [
      {
        url: "/og-home.jpg",
        width: 1200,
        height: 630,
        alt: "D-EscapeRoom - The Stolen Snack",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "D-EscapeRoom | The Stolen Snack",
    description:
      "Een unieke escaperoom ervaring voor baas en hond.",
    images: ["/og-home.jpg"],
  },

  icons: {
    icon: [
      {
        url: "/favicon.ico",
      },
      {
        url: "/icon.png",
        type: "image/png",
      },
    ],

    apple: [
      {
        url: "/apple-touch-icon.png",
      },
    ],
  },
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