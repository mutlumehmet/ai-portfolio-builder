"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { deleteProject, moveProject } from "./actions";

type ProjectRow = {
  id: string;
  title: string;
  slug: string;
  featured: boolean;
  year: number | null;
  yearRange: string | null;
  years: number[];
  category: "commercial" | "personal";
  liveUrl: string | null;
};

function yearLabelFor(project: Pick<ProjectRow, "year" | "yearRange" | "years">) {
  if (project.years.length > 0) return project.years.join(", ");
  return project.yearRange || project.year;
}

type OptimisticAction =
  | { type: "delete"; id: string }
  | { type: "move"; id: string; direction: "up" | "down" };

function applyOptimistic(state: ProjectRow[], action: OptimisticAction) {
  if (action.type === "delete") {
    return state.filter((p) => p.id !== action.id);
  }

  const project = state.find((p) => p.id === action.id);
  if (!project) return state;

  // Scoped to the project's own category, matching the server's move
  // action: commercial/personal projects never swap into each other's
  // group.
  const groupIds = state.filter((p) => p.category === project.category).map((p) => p.id);
  const groupIndex = groupIds.indexOf(action.id);
  const targetGroupIndex = action.direction === "up" ? groupIndex - 1 : groupIndex + 1;
  if (targetGroupIndex < 0 || targetGroupIndex >= groupIds.length) return state;

  const otherId = groupIds[targetGroupIndex];
  const index = state.findIndex((p) => p.id === action.id);
  const targetIndex = state.findIndex((p) => p.id === otherId);

  const next = [...state];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export function ProjectList({ projects }: { projects: ProjectRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticProjects, applyOptimisticAction] = useOptimistic(
    projects,
    applyOptimistic
  );

  function handleDelete(id: string) {
    startTransition(async () => {
      applyOptimisticAction({ type: "delete", id });
      await deleteProject(id);
    });
  }

  function handleMove(id: string, direction: "up" | "down") {
    startTransition(async () => {
      applyOptimisticAction({ type: "move", id, direction });
      await moveProject(id, direction);
    });
  }

  const commercialProjects = optimisticProjects.filter((p) => p.category === "commercial");
  const personalProjects = optimisticProjects.filter((p) => p.category === "personal");

  return (
    <div className="flex flex-col gap-3">
      <ProjectGroup
        projects={commercialProjects}
        isPending={isPending}
        onMove={handleMove}
        onDelete={handleDelete}
      />

      {personalProjects.length > 0 && (
        <>
          <div className="mt-6 mb-1 flex items-center gap-3">
            <span className="rounded-lg border-2 border-border bg-foreground px-3 py-1 text-xs font-black tracking-wide text-background uppercase">
              Personal projects
            </span>
            <span className="h-0.5 flex-1 bg-border" />
          </div>
          <ProjectGroup
            projects={personalProjects}
            isPending={isPending}
            onMove={handleMove}
            onDelete={handleDelete}
          />
        </>
      )}

      {optimisticProjects.length === 0 && (
        <p className="rounded-lg border-2 border-dashed border-border p-8 text-center text-muted-foreground">
          No projects yet.
        </p>
      )}
    </div>
  );
}

function ProjectGroup({
  projects,
  isPending,
  onMove,
  onDelete,
}: {
  projects: ProjectRow[];
  isPending: boolean;
  onMove: (id: string, direction: "up" | "down") => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {projects.map((project, index) => (
        <Card
          key={project.id}
          className="flex-col items-stretch gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <CardContent className="flex min-w-0 flex-wrap items-center gap-2 px-5 sm:gap-3">
            <span className="font-black">{project.title}</span>
            <span className="text-sm text-muted-foreground">/{project.slug}</span>
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={project.liveUrl}
                className="flex size-6 items-center justify-center rounded-md border-2 border-border bg-card text-foreground"
              >
                <ExternalLink className="size-3" />
              </a>
            )}
            {yearLabelFor(project) && (
              <span className="rounded-md border-2 border-border bg-card px-2 py-0.5 text-xs font-bold text-foreground">
                {yearLabelFor(project)}
              </span>
            )}
            {project.featured && (
              <span className="rounded-md border-2 border-border bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                Featured
              </span>
            )}
          </CardContent>
          <CardContent className="flex items-center gap-2 px-5">
            <div className="flex flex-col gap-0.5">
              <Button
                type="button"
                variant="neutral"
                size="sm"
                className="h-5 px-2"
                disabled={isPending || index === 0}
                onClick={() => onMove(project.id, "up")}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                className="h-5 px-2"
                disabled={isPending || index === projects.length - 1}
                onClick={() => onMove(project.id, "down")}
              >
                ↓
              </Button>
            </div>
            <Button variant="neutral" size="sm" asChild>
              <Link href={`/admin/projects/${project.id}/edit`}>Edit</Link>
            </Button>
            <Button
              variant="neutral"
              size="sm"
              disabled={isPending}
              onClick={() => onDelete(project.id)}
            >
              Delete
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
