import type { NextConfig } from "next";

// PostHog's ingestion hosts for the region in NEXT_PUBLIC_POSTHOG_REGION ("eu" by default).
const posthog =
  process.env.NEXT_PUBLIC_POSTHOG_REGION === "us"
    ? { api: "https://us.i.posthog.com", assets: "https://us-assets.i.posthog.com" }
    : { api: "https://eu.i.posthog.com", assets: "https://eu-assets.i.posthog.com" };

const nextConfig: NextConfig = {
  // Proxy PostHog through this site, so ad blockers drop fewer events.
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: `${posthog.assets}/static/:path*` },
      { source: "/ingest/array/:path*", destination: `${posthog.assets}/array/:path*` },
      { source: "/ingest/:path*", destination: `${posthog.api}/:path*` },
    ];
  },
  // Public pages render per request (so the build needs no database). On
  // Netlify, its CDN keeps each one for 5 minutes and refreshes it in the
  // background, so visitors don't wait on the database. No public page reads
  // cookies, so a cached copy is the same for everyone. Admin, API and the
  // analytics proxy are never cached. Other hosts ignore this header.
  async headers() {
    return [
      {
        source: "/((?!admin|api|ingest|_next).*)",
        headers: [
          { key: "Netlify-CDN-Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=604800, durable" },
        ],
      },
    ];
  },
  // PostHog's API paths end in a slash; don't redirect them.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
