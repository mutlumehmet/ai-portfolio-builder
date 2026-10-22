"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { BlockEditor } from "@/components/admin/block-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExperienceFormState } from "@/app/admin/(protected)/experience/actions";

type ExperienceInput = {
  title: string;
  slug: string;
  company: string;
  location: string | null;
  startDate: Date;
  endDate: Date | null;
  order: number;
  blocks: { type: string; data: unknown }[];
};

const initialState: ExperienceFormState = { error: null };

function toMonthInput(date: Date | null | undefined) {
  if (!date) return "";
  return date.toISOString().slice(0, 7);
}

export function ExperienceForm({
  action,
  experience,
}: {
  action: (
    prevState: ExperienceFormState,
    formData: FormData
  ) => Promise<ExperienceFormState>;
  experience?: ExperienceInput;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required defaultValue={experience?.title} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" required defaultValue={experience?.slug} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company">Company</Label>
          <Input id="company" name="company" required defaultValue={experience?.company} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            placeholder="Edinburgh"
            defaultValue={experience?.location ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="month"
            required
            defaultValue={toMonthInput(experience?.startDate)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endDate">End date (blank = current)</Label>
          <Input
            id="endDate"
            name="endDate"
            type="month"
            defaultValue={toMonthInput(experience?.endDate)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order">Order</Label>
          <Input
            id="order"
            name="order"
            type="number"
            defaultValue={experience?.order ?? 0}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Highlights (rendered as a bulleted list: use paragraph blocks)</Label>
        <BlockEditor initialBlocks={experience?.blocks ?? []} />
      </div>

      {state.error && (
        <p className="rounded-lg border-2 border-border bg-destructive/10 p-3 text-sm font-bold text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton isEdit={Boolean(experience)} />
    </form>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending} className="self-start">
      {pending ? "Saving…" : isEdit ? "Save changes" : "Create experience"}
    </Button>
  );
}
