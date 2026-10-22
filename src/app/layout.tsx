import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";

import { siteConfig, siteUrl } from "@/lib/config";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const { seo, person, theme } = siteConfig;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: seo.title,
  description: seo.description,
  robots: seo.index ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: siteUrl,
    siteName: person.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
};

// The palette from site.config.ts, as CSS variables over the defaults in globals.css.
const themeCss = `:root{${[
  ["--background", theme.background],
  ["--foreground", theme.foreground],
  ["--card", theme.card],
  ["--muted", theme.muted],
  ["--muted-foreground", theme.mutedForeground],
  ["--primary", theme.primary],
  ["--primary-foreground", theme.primaryForeground],
  ["--secondary", theme.secondary],
  ["--secondary-foreground", theme.secondaryForeground],
  ["--accent", theme.accent],
  ["--accent-foreground", theme.accentForeground],
  ...theme.accents.slice(0, 5).map((c, i) => [`--accent-${i + 1}`, c]),
]
  // Only plain colour values reach the stylesheet.
  .filter(([, v]) => /^[#a-zA-Z0-9(),.%\s-]+$/.test(v))
  .map(([k, v]) => `${k}:${v}`)
  .join(";")}}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <style>{themeCss}</style>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
