// PATH: src/app/partner/provincie/ut/layout.tsx
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Utrecht – Partner",
  description: "Beschikbaarheid en info voor provincie Utrecht.",

};

export const viewport: Viewport = {
  // Zet je gewenste kleur(en) hier

  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000000" },
    { media: "(prefers-color-scheme: dark)",  color: "#000000" },
  ],
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
