import type { Metadata } from "next";
import { Hanken_Grotesk, Hedvig_Letters_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Body — 따뜻한 neo-grotesque (Inter·DM Sans·Plus Jakarta 대신)
const bodyFont = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Display — 손그림 온기의 세리프 (Fraunces·Newsreader·Playfair 대신)
const displayFont = Hedvig_Letters_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

// Mono — tabular·identifier용 (Space Mono·IBM Plex Mono 대신)
const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vending Machine Simulation",
  description: "AI-powered vending machine business simulation based on Vending-Bench",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`h-full ${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
