import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";

import { siteConfig, siteUrl } from "@/lib/config";

import { readableOn } from "@/lib/contrast";
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
  // Links and highlighted words: the primary hue, darkened if needed to read on the background.
  ["--link", readableOn(theme.primary, theme.background)],
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

// Removes HTML comments (and the stray text around them) from <head> before
// React hydrates: Netlify's free plan inserts one there, and React would treat
// it as a hydration mismatch and re-render the page from scratch.
const headCleanScript = `try{for(var n=document.head.firstChild;n;){var x=n.nextSibling;if(n.nodeType===8||n.nodeType===3)n.remove();n=x}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <style>{themeCss}</style>
        <script dangerouslySetInnerHTML={{ __html: headCleanScript }} />
        {/* Points AI tools reading any page to the site as plain text. */}
        <link rel="alternate" type="text/markdown" href="/llms-full.txt" title="Everything on this site as Markdown" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="Site map for AI tools (llms.txt)" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
