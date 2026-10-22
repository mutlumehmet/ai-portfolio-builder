"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { BlockEditor } from "@/components/admin/block-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProjectFormState } from "@/app/admin/(protected)/projects/actions";

type Tag = { id: string; name: string; kind: "technology" | "industry" };

type ProjectInput = {
  title: string;
  slug: string;
  summary: string;
  coverImageUrl: string | null;
  liveUrl: string | null;
  repoUrl: string | null;
  role: string | null;
  year: number | null;
  yearRange: string | null;
  years: number[];
  category: "commercial" | "personal";
  featured: boolean;
  order: number;
  tags: Tag[];
  blocks: { type: string; data: unknown }[];
};

const initialState: ProjectFormState = { error: null };

export function ProjectForm({
  action,
  allTags,
  project,
}: {
  action: (
    prevState: ProjectFormState,
    formData: FormData
  ) => Promise<ProjectFormState>;
  allTags: Tag[];
  project?: ProjectInput;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const selectedTagIds = new Set(project?.tags.map((t) => t.id));
  const technologyTags = allTags.filter((t) => t.kind === "technology");
  const industryTags = allTags.filter((t) => t.kind === "industry");

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={project?.title}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" required defaultValue={project?.slug} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="summary">Summary</Label>
        <textarea
          id="summary"
          name="summary"
          required
          defaultValue={project?.summary}
          className="min-h-20 w-full rounded-lg border-2 border-border bg-card px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="coverImageUrl">Cover image URL</Label>
        <Input
          id="coverImageUrl"
          name="coverImageUrl"
          defaultValue={project?.coverImageUrl ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="liveUrl">Live site URL</Label>
        <Input
          id="liveUrl"
          name="liveUrl"
          placeholder="https://example.com"
          defaultValue={project?.liveUrl ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="repoUrl">Source code URL (open source)</Label>
        <Input
          id="repoUrl"
          name="repoUrl"
          placeholder="https://github.com/you/repo"
          defaultValue={project?.repoUrl ?? ""}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Role</Label>
          <Input id="role" name="role" defaultValue={project?.role ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            name="year"
            type="number"
            defaultValue={project?.year ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="yearRange">Year badge override</Label>
          <Input
            id="yearRange"
            name="yearRange"
            placeholder="e.g. 2023 to 2026"
            defaultValue={project?.yearRange ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="years">Year chips (comma-separated)</Label>
          <Input
            id="years"
            name="years"
            placeholder="e.g. 2021, 2023, 2025"
            defaultValue={project?.years.join(", ") ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order">Order</Label>
          <Input
            id="order"
            name="order"
            type="number"
            defaultValue={project?.order ?? 0}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          defaultValue={project?.category ?? "commercial"}
          className="w-full rounded-lg border-2 border-border bg-card px-3 py-2 text-sm"
        >
          <option value="commercial">Commercial</option>
          <option value="personal">Personal</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={project?.featured ?? true}
          className="size-4 accent-primary"
        />
        Featured on landing page
      </label>

      <div className="flex flex-col gap-3">
        <Label>Technology tags</Label>
        <div className="flex flex-wrap gap-2">
          {technologyTags.map((tag) => (
            <TagCheckbox key={tag.id} tag={tag} defaultChecked={selectedTagIds.has(tag.id)} />
          ))}
        </div>
        <Label>Industry tags</Label>
        <div className="flex flex-wrap gap-2">
          {industryTags.map((tag) => (
            <TagCheckbox key={tag.id} tag={tag} defaultChecked={selectedTagIds.has(tag.id)} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Content blocks</Label>
        <BlockEditor initialBlocks={project?.blocks ?? []} />
      </div>

      {state.error && (
        <p className="rounded-lg border-2 border-border bg-destructive/10 p-3 text-sm font-bold text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton isEdit={Boolean(project)} />
    </form>
  );
}

function TagCheckbox({
  tag,
  defaultChecked,
}: {
  tag: Tag;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border-2 border-border bg-card px-2.5 py-1 text-sm font-bold shadow-brutal-sm has-[:checked]:bg-primary has-[:checked]:text-primary-foreground">
      <input
        type="checkbox"
        name="tagIds"
        value={tag.id}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      {tag.name}
    </label>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending} className="self-start">
      {pending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
    </Button>
  );
}
