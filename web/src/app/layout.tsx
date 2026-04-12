import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
