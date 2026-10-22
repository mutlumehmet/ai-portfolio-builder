"use client";

import { useOptimistic, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteTag } from "./actions";

type TagRow = { id: string; name: string; kind: "technology" | "industry" };

export function TagList({ tags }: { tags: TagRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticTags, removeOptimistic] = useOptimistic(
    tags,
    (state, id: string) => state.filter((t) => t.id !== id)
  );

  function handleDelete(id: string) {
    startTransition(async () => {
      removeOptimistic(id);
      await deleteTag(id);
    });
  }

  const technology = optimisticTags.filter((t) => t.kind === "technology");
  const industry = optimisticTags.filter((t) => t.kind === "industry");

  return (
    <div className="flex flex-col gap-8">
      <TagGroup
        label="Technology"
        tags={technology}
        isPending={isPending}
        onDelete={handleDelete}
      />
      <TagGroup
        label="Industry"
        tags={industry}
        isPending={isPending}
        onDelete={handleDelete}
      />
    </div>
  );
}

function TagGroup({
  label,
  tags,
  isPending,
  onDelete,
}: {
  label: string;
  tags: TagRow[];
  isPending: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </h2>
      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {label.toLowerCase()} tags yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="flex items-center gap-2 rounded-lg border-2 border-border bg-card py-1.5 pr-1.5 pl-3 text-sm font-bold shadow-brutal-sm"
            >
              {tag.name}
              <Button
                type="button"
                variant="neutral"
                size="sm"
                disabled={isPending}
                onClick={() => onDelete(tag.id)}
                className="h-6 px-2 text-xs"
              >
                ×
              </Button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
