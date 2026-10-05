import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { getSiteUrl } from "@/lib/env";

import "./globals.css";

const figtree = localFont({
  src: "../assets/fonts/figtree-latin-wght-normal.woff2",
  variable: "--font-figtree",
  weight: "300 900",
  display: "swap",
});

const fraunces = localFont({
  src: "../assets/fonts/fraunces-latin-wght-normal.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
});

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: "ClinicFlow | Clinic website and appointment booking",
      template: "%s | ClinicFlow",
    },
    description:
      "Find a doctor, choose a time and book your clinic appointment online in under a minute.",
    applicationName: "ClinicFlow",
    openGraph: { type: "website", siteName: "ClinicFlow", locale: "en_IN" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf9f5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${figtree.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
