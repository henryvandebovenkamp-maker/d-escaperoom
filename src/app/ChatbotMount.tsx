// RootLayout: houd dit kaal; geen headers/footers hier.
import "./globals.css";
import type { Metadata } from "next";
import ChatbotMount from "./ChatbotMount";

export const metadata: Metadata = {
  title: "D-EscapeRoom",
  description: "The Missing Snack — boek je sessie",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="h-full">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        {children}
        {/* Client boundary voor de widget */}
        <ChatbotMount children={undefined} />
      </body>
    </html>
  );
}
