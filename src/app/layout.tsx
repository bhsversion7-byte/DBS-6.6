import { Providers } from "@/providers/providers";
import { cn } from "@/lib/utils";
import { Geist, Geist_Mono } from "next/font/google";
import { type Metadata, type Viewport } from "next";
import type React from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://fx-treasury-demo.local"),
  title: {
    default: "Bank-Grade FX Trading Platform",
    template: "%s | Bank-Grade FX Trading Platform",
  },
  description:
    "MVP demo for quote locking, FX trade execution, audit trails, risk controls, and real-time notifications.",
  keywords: [
    "foreign exchange",
    "trading platform",
    "quote engine",
    "trade lifecycle",
    "risk engine",
    "audit trail",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://fx-treasury-demo.local/",
    siteName: "Bank-Grade FX Trading Platform",
    title: "Bank-Grade FX Trading Platform",
    description:
      "Interactive MVP demo for a bank-grade FX quote and trade workflow.",
    images: [
      {
        url: "/seo.png",
        width: 1200,
        height: 630,
        alt: "Bank-Grade FX Trading Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bank-Grade FX Trading Platform",
    description:
      "Interactive MVP demo for a bank-grade FX quote and trade workflow.",
    images: ["/seo.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <Providers>
          <main className="min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
