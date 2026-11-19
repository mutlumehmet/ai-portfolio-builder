import type { MetadataRoute } from "next";

import { siteConfig, siteUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  if (!siteConfig.seo.index) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
