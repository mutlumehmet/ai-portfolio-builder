import type { MetadataRoute } from "next";

import { features, siteUrl } from "@/lib/config";
import { prisma } from "@/lib/prisma";

// Read per request, so `next build` never needs a database.
export const dynamic = "force-dynamic";

const PAGES = ["", "/about", "/projects", "/how-i-work", "/experience", "/side-projects"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await prisma.project.findMany({ select: { slug: true, updatedAt: true } });
  return [
    ...PAGES.map((path) => ({ url: `${siteUrl}${path}` })),
    ...(features.cv ? [{ url: `${siteUrl}/cv.pdf` }] : []),
    // Plain-text versions for AI tools (see /agents.md).
    { url: `${siteUrl}/llms.txt` },
    { url: `${siteUrl}/llms-full.txt` },
    { url: `${siteUrl}/agents.md` },
    ...projects.map((p) => ({ url: `${siteUrl}/projects/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
