import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Public pages render per request (so the build needs no database). On
  // Netlify, its CDN keeps each one for 5 minutes and refreshes it in the
  // background, so visitors don't wait on the database. No public page reads
  // cookies, so a cached copy is the same for everyone. Admin and API routes
  // are never cached. Other hosts ignore this header.
  async headers() {
    return [
      {
        source: "/((?!admin|api|_next).*)",
        headers: [
          { key: "Netlify-CDN-Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=604800, durable" },
        ],
      },
    ];
  },
};

export default nextConfig;
