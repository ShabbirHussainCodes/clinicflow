import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { getSiteUrl } from "@/lib/env";

import "./globals.css";

const sourceSans = localFont({
  src: "../assets/fonts/source-sans-3-latin-wght-normal.woff2",
  variable: "--font-source-sans",
  weight: "200 900",
  display: "swap",
});

const sourceSerif = localFont({
  src: "../assets/fonts/source-serif-4-latin-wght-normal.woff2",
  variable: "--font-source-serif",
  weight: "200 900",
  display: "swap",
});

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(getSiteUrl()),
    // The clinic's own name and description are set per section (see the public and admin layouts).
    title: { default: "Clinic website and appointment booking", template: "%s" },
    description:
      "Find a doctor, choose a time and book your clinic appointment online in under a minute.",
    openGraph: { type: "website", locale: "en_IN" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf9f5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${sourceSans.variable} ${sourceSerif.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
