import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GithubIcon } from "@/components/github-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BlockRenderer } from "@/components/block-renderer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";

// Rendered per request (no database needed at build time).
export const dynamic = "force-dynamic";

// Share previews use the project's own cover. Placeholder covers are inline
// SVG data URIs, which social sites cannot fetch, so those fall back to the
// site-wide image from the root layout.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { title: true, summary: true, coverImageUrl: true },
  });
  if (!project) return {};

  const title = `${project.title} | ${siteConfig.person.name}`;
  const cover =
    project.coverImageUrl && !project.coverImageUrl.startsWith("data:")
      ? project.coverImageUrl
      : undefined;
  const images = cover ? [{ url: cover, alt: project.title }] : undefined;

  return {
    title,
    description: project.summary,
    openGraph: { title, description: project.summary, type: "article", images },
    twitter: { card: "summary_large_image", title, description: project.summary, images },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    include: { tags: true, blocks: true },
  });

  if (!project) notFound();

  const yearLabel =
    project.years.length > 0
      ? project.years.join(", ")
      : project.yearRange || project.year;

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <SiteHeader back={{ href: "/projects", label: "← All work" }} />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
        <article className="py-12">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {project.role && (
              <span className="text-sm font-bold text-muted-foreground">
                {project.role}
              </span>
            )}
            {yearLabel && (
              <span className="text-sm text-muted-foreground">
                · {yearLabel}
              </span>
            )}
          </div>
          <h1 className="mb-5 text-4xl font-black tracking-tight text-balance md:text-5xl">
            {project.title}
          </h1>
          <div className="mb-6 flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant={tag.kind === "industry" ? "accent" : "default"}
              >
                {tag.name}
              </Badge>
            ))}
          </div>

          {(project.liveUrl || project.repoUrl) && (
            <div className="mb-10 flex flex-wrap gap-3">
              {project.liveUrl && (
                <Button asChild variant="neutral">
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                    Visit project
                    <ExternalLink />
                  </a>
                </Button>
              )}
              {project.repoUrl && (
                <Button asChild variant="neutral">
                  <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                    <GithubIcon className="size-4" />
                    View on GitHub
                  </a>
                </Button>
              )}
            </div>
          )}

          <BlockRenderer blocks={project.blocks} />

          {/* Open source banner at the end, next to the install commands, so the repo is one
              click away from wherever the reader stops. */}
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 flex items-center gap-4 rounded-lg border-2 border-border bg-card p-5 shadow-brutal transition-transform hover:-translate-y-0.5"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-foreground text-background">
                <GithubIcon className="size-7" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs font-black tracking-widest text-muted-foreground uppercase">
                  Open source on GitHub
                </span>
                <span className="text-lg font-black break-words">
                  {project.repoUrl
                    .replace(/^https:\/\/github\.com\//, "")
                    .replace(/\/tree\/[^/]+\//, "/")}
                </span>
              </span>
              <span className="hidden shrink-0 items-center gap-1 text-sm font-bold sm:flex">
                View the code
                <ExternalLink className="size-4" />
              </span>
            </a>
          )}
        </article>
      </div>
      <SiteFooter />
    </div>
  );
}
