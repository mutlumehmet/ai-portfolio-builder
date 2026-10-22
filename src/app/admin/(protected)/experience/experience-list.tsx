"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { deleteExperience, moveExperience } from "./actions";

type ExperienceRow = {
  id: string;
  title: string;
  company: string;
  startDate: Date;
  endDate: Date | null;
};

function periodLabel({ startDate, endDate }: Pick<ExperienceRow, "startDate" | "endDate">) {
  const fmt = (d: Date) =>
    `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
  return `${fmt(startDate)} to ${endDate ? fmt(endDate) : "now"}`;
}

type OptimisticAction =
  | { type: "delete"; id: string }
  | { type: "move"; id: string; direction: "up" | "down" };

function applyOptimistic(state: ExperienceRow[], action: OptimisticAction) {
  if (action.type === "delete") {
    return state.filter((e) => e.id !== action.id);
  }

  const index = state.findIndex((e) => e.id === action.id);
  const targetIndex = action.direction === "up" ? index - 1 : index + 1;
  if (index === -1 || targetIndex < 0 || targetIndex >= state.length) return state;

  const next = [...state];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export function ExperienceList({ experiences }: { experiences: ExperienceRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticExperiences, applyOptimisticAction] = useOptimistic(
    experiences,
    applyOptimistic
  );

  function handleDelete(id: string) {
    startTransition(async () => {
      applyOptimisticAction({ type: "delete", id });
      await deleteExperience(id);
    });
  }

  function handleMove(id: string, direction: "up" | "down") {
    startTransition(async () => {
      applyOptimisticAction({ type: "move", id, direction });
      await moveExperience(id, direction);
    });
  }

  if (optimisticExperiences.length === 0) {
    return (
      <p className="rounded-lg border-2 border-dashed border-border p-8 text-center text-muted-foreground">
        No experience entries yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {optimisticExperiences.map((exp, index) => (
        <Card key={exp.id} className="flex-col items-stretch gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <CardContent className="flex min-w-0 flex-wrap items-center gap-2 px-5 sm:gap-3">
            <span className="font-black">{exp.title}</span>
            <span className="text-sm text-muted-foreground">at {exp.company}</span>
            <span className="rounded-md border-2 border-border bg-card px-2 py-0.5 font-mono text-xs font-bold">
              {periodLabel(exp)}
            </span>
          </CardContent>
          <CardContent className="flex items-center gap-2 px-5">
            <div className="flex flex-col gap-0.5">
              <Button
                type="button"
                variant="neutral"
                size="sm"
                className="h-5 px-2"
                disabled={isPending || index === 0}
                onClick={() => handleMove(exp.id, "up")}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                className="h-5 px-2"
                disabled={isPending || index === optimisticExperiences.length - 1}
                onClick={() => handleMove(exp.id, "down")}
              >
                ↓
              </Button>
            </div>
            <Button variant="neutral" size="sm" asChild>
              <Link href={`/admin/experience/${exp.id}/edit`}>Edit</Link>
            </Button>
            <Button
              variant="neutral"
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(exp.id)}
            >
              Delete
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
