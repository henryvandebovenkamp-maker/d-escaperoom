// PATH: src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "D-EscapeRoom", template: "%s | D-EscapeRoom" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-dvh bg-stone-50 text-stone-900">{children}</body>
    </html>
  );
}
