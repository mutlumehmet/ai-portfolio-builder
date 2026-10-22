"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { CollapsibleTagRow } from "@/components/collapsible-tag-row";
import { ProjectCoverImage } from "@/components/project-cover-image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Tag = { id: string; name: string; slug: string; kind: "technology" | "industry" };
type Project = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImageUrl: string | null;
  liveUrl: string | null;
  repoUrl: string | null;
  year: number | null;
  yearRange: string | null;
  years: number[];
  category: "commercial" | "personal";
  tags: Tag[];
};

// Both /projects and /side-projects show every project. `lead` picks which
// category comes first; the other follows under a divider.
const SECTION_LABELS = { commercial: "Client work", personal: "Side projects" } as const;

export function ProjectsGrid({
  projects,
  tags,
  lead = "commercial",
}: {
  projects: Project[];
  tags: Tag[];
  lead?: Project["category"];
}) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const technologyTags = tags.filter((t) => t.kind === "technology");
  const industryTags = tags.filter((t) => t.kind === "industry");

  const filtered = useMemo(() => {
    if (!activeSlug) return projects;
    return projects.filter((p) => p.tags.some((t) => t.slug === activeSlug));
  }, [projects, activeSlug]);

  const follow = lead === "commercial" ? "personal" : "commercial";
  const leadProjects = filtered.filter((p) => p.category === lead);
  const followProjects = filtered.filter((p) => p.category === follow);

  function selectTag(slug: string | null) {
    startTransition(() => {
      setActiveSlug(slug);
    });
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-black tracking-wide text-muted-foreground uppercase">
            Technology
          </span>
          <CollapsibleTagRow>
            <FilterChip
              label="All"
              active={activeSlug === null}
              onClick={() => selectTag(null)}
            />
            {technologyTags.map((t) => (
              <FilterChip
                key={t.id}
                label={t.name}
                active={activeSlug === t.slug}
                onClick={() => selectTag(t.slug)}
              />
            ))}
          </CollapsibleTagRow>
        </div>
        {industryTags.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-black tracking-wide text-muted-foreground uppercase">
              Industry
            </span>
            <CollapsibleTagRow>
              {industryTags.map((t) => (
                <FilterChip
                  key={t.id}
                  label={t.name}
                  active={activeSlug === t.slug}
                  variant="industry"
                  onClick={() => selectTag(t.slug)}
                />
              ))}
            </CollapsibleTagRow>
          </div>
        )}
      </div>

      <ProjectCardGrid projects={leadProjects} isPending={isPending} />

      {followProjects.length > 0 && (
        <>
          <div className="mt-12 mb-6 flex items-center gap-3">
            <span className="rounded-lg border-2 border-border bg-foreground px-3 py-1 text-xs font-black tracking-wide text-background uppercase">
              {SECTION_LABELS[follow]}
            </span>
            <span className="h-0.5 flex-1 bg-border" />
          </div>
          <ProjectCardGrid projects={followProjects} isPending={isPending} />
        </>
      )}

      {filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          No projects match this filter yet.
        </p>
      )}
    </div>
  );
}

function ProjectCardGrid({
  projects,
  isPending,
}: {
  projects: Project[];
  isPending: boolean;
}) {
  if (projects.length === 0) return null;

  return (
    <div
      className={`grid gap-6 transition-opacity md:grid-cols-2 ${
        isPending ? "opacity-60" : "opacity-100"
      }`}
    >
      {projects.map((project) => (
        <Link key={project.id} href={`/projects/${project.slug}`}>
          <Card className="h-full gap-0 overflow-hidden py-0 transition-transform hover:-translate-y-0.5">
            <ProjectCoverImage
              id={project.id}
              coverImageUrl={project.coverImageUrl}
              title={project.title}
              year={project.year}
              yearRange={project.yearRange}
              years={project.years}
              category={project.category}
              liveUrl={project.liveUrl}
              repoUrl={project.repoUrl}
            />
            <CardHeader className="pt-5">
              <CardTitle className="text-xl">{project.title}</CardTitle>
              <CardDescription>{project.summary}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 pt-3 pb-6">
              {project.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={tag.kind === "industry" ? "accent" : "default"}
                >
                  {tag.name}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  variant = "technology",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: "technology" | "industry";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 border-border px-3 py-1.5 text-sm font-bold shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal ${
        active
          ? variant === "industry"
            ? "bg-accent text-accent-foreground"
            : "bg-primary text-primary-foreground"
          : "bg-card text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
